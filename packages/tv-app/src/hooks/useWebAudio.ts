import { useRef, useState, useCallback } from 'react';
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import processorUrl from '@soundtouchjs/audio-worklet/processor?url';

export type ReverbPreset = 'hall' | 'room' | 'stage' | 'off' | 'custom';

export interface UseWebAudioReturn {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  originalAudio: HTMLAudioElement | null;      // 由外部设置 src
  instrumentalAudio: HTMLAudioElement | null;  // 由外部设置 src
  isReady: boolean;
  init: (originalAudio: HTMLAudioElement, instrumentalAudio: HTMLAudioElement) => void;
  setOriginalGain: (v: number) => void;        // 0~1
  setInstrumentalGain: (v: number) => void;    // 0~1
  setPitch: (semitones: number) => void;       // -12~+12 半音：WSOLA 不变速变调（worklet），失败降级 playbackRate
  setReverbPreset: (preset: ReverbPreset) => void;
  setReverbCustom: (duration: number, decay: number) => void;  // 自定义混响 IR（时长秒 0.5~5 / 衰减 1~4）
  setReverbWet: (wet: number) => void;         // 0~1，dry = 1 - wet
  destroy: () => void;                          // 关闭 AudioContext
}

// 混响预设参数：duration（秒）/ decay（衰减指数）；custom 由 setReverbCustom 单独设置
const REVERB_PRESETS: Record<Exclude<ReverbPreset, 'off' | 'custom'>, { duration: number; decay: number }> = {
  hall: { duration: 3, decay: 2 },
  room: { duration: 1, decay: 3 },
  stage: { duration: 2, decay: 2.5 },
};

/**
 * 合成冲激响应（IR）：随机白噪声 × 指数衰减包络
 * 不依赖外部音频文件，纯代码生成
 */
function createImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

/**
 * 封装 Web Audio API 节点链，提供原声/伴奏音量、混响、不变速变调（WSOLA）控制
 *
 * 节点链结构（原调直通，零延迟）：
 *   原声 audio → source ─→ originalGain ─┐
 *   伴奏 audio → source ─→ instrumentalGain ├→ merger → [dryGain + convolver→wetGain] → destination
 *
 * 变调（pitch≠0）切换为：
 *   原声 audio → source → SoundTouchNode(WSOLA) → originalGain ─┐
 *   伴奏 audio → source → SoundTouchNode(WSOLA) → instrumentalGain ├→ merger → ... → destination
 *
 * SoundTouch worklet 注册失败（旧 WebView）时自动降级：媒体元素 playbackRate 变调。
 * 注意：MediaElementAudioSourceNode 一旦创建会接管 audio 元素输出，不可逆，故仅在首次调用时创建。
 */
export function useWebAudio(): UseWebAudioReturn {
  // AudioContext 与各节点用 useRef 持有，避免 React 严格模式重复创建
  const ctxRef = useRef<AudioContext | null>(null);
  const originalGainRef = useRef<GainNode | null>(null);
  const instrumentalGainRef = useRef<GainNode | null>(null);
  const mergerRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const instrumentalSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const stOrigRef = useRef<SoundTouchNode | null>(null);
  const stInsRef = useRef<SoundTouchNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // 变调路由状态：true=worklet 已注册（pitch≠0 走 WSOLA 路），false=降级 playbackRate
  const pitchShiftReadyRef = useRef(false);
  // 当前变调路由：'direct'=源→gain 直通（原调），'worklet'=worklet→gain（变调）
  // 用于幂等切换：仅当路由与目标不一致时才 disconnect/connect，避免对未连接目标 disconnect 抛 InvalidAccessError
  const pitchRouteRef = useRef<'direct' | 'worklet'>('direct');

  const [isReady, setIsReady] = useState(false);

  /**
   * 初始化 Web Audio 节点链
   * 注意：MediaElementAudioSourceNode 一旦创建会接管 audio 元素输出，不可逆，故仅在首次调用时创建
   */
  const init = useCallback((originalAudio: HTMLAudioElement, instrumentalAudio: HTMLAudioElement) => {
    // 防止重复初始化（MediaElementAudioSourceNode 不可逆）
    if (ctxRef.current) return;

    // 兼容 webkit 前缀
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    ctxRef.current = ctx;

    const finishInit = () => {
      if (ctxRef.current !== ctx || ctx.state !== 'running') return;

      originalAudioRef.current = originalAudio;
      instrumentalAudioRef.current = instrumentalAudio;

      // 只在 AudioContext 确认 running 后接管媒体输出。
      // suspended 状态下提前创建 source 会让 Android WebView 自动播放无声。
      const originalSource = ctx.createMediaElementSource(originalAudio);
      const instrumentalSource = ctx.createMediaElementSource(instrumentalAudio);
      originalSourceRef.current = originalSource;
      instrumentalSourceRef.current = instrumentalSource;

      // 变调降级路径：playbackRate 需要浏览器做音调偏移（preservesPitch=false 时变速即变调）
      originalAudio.preservesPitch = false;
      instrumentalAudio.preservesPitch = false;

      // 两个 source 各自的音量控制
      const originalGain = ctx.createGain();
      const instrumentalGain = ctx.createGain();
      // 用 GainNode 做 merger（多个 source 连到同一输入）
      const merger = ctx.createGain();

      // dry 通道
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1;

      originalGainRef.current = originalGain;
      instrumentalGainRef.current = instrumentalGain;
      mergerRef.current = merger;
      dryGainRef.current = dryGain;

      // 连接节点链（原调直通）：source → gain → merger → [dryGain + convolver→wetGain] → destination
      originalSource.connect(originalGain);
      instrumentalSource.connect(instrumentalGain);
      originalGain.connect(merger);
      instrumentalGain.connect(merger);

      // 创建 AnalyserNode 用于可视化（并行连接到 merger，不影响主链路）
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      merger.connect(analyser);
      analyserRef.current = analyser;

      merger.connect(dryGain);
      dryGain.connect(ctx.destination);

      // wet 通道（混响）：混响为音频效果，与动画偏好无关，始终创建（wet 默认 0 即纯 dry）
      {
        const convolver = ctx.createConvolver();
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0; // 默认完全 dry
        // 默认加载 hall 预设 IR 备用
        convolver.buffer = createImpulseResponse(
          ctx,
          REVERB_PRESETS.hall.duration,
          REVERB_PRESETS.hall.decay,
        );
        merger.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(ctx.destination);
        convolverRef.current = convolver;
        wetGainRef.current = wetGain;
      }

      setIsReady(true);

      // 异步注册 SoundTouch worklet（WSOLA 不变速变调）；失败静默 → 降级 playbackRate
      void (async () => {
        try {
          await SoundTouchNode.register(ctx, processorUrl);
          if (ctxRef.current !== ctx) return; // 注册期间已被 destroy，放弃（避免在关闭的 context 上建节点）
          const stOrig = new SoundTouchNode({ context: ctx });
          const stIns = new SoundTouchNode({ context: ctx });
          stOrig.pitchSemitones.value = 0;
          stIns.pitchSemitones.value = 0;
          // 源 → worklet 常驻连接（setPitch 时切换其输出路由），原调时输出断开（旁路）
          originalSource.connect(stOrig);
          instrumentalSource.connect(stIns);
          stOrigRef.current = stOrig;
          stInsRef.current = stIns;
          pitchShiftReadyRef.current = true;
        } catch {
          pitchShiftReadyRef.current = false;
        }
      })();
    };

    if (ctx.state === 'running') {
      finishInit();
      return;
    }

    // resume() 必须在 keydown/pointerdown 调用栈内发起。失败时不接管
    // HTMLMediaElement，保留可自动播放的直连兜底。
    void ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running') {
          finishInit();
          return;
        }
        if (ctxRef.current === ctx) ctxRef.current = null;
        void ctx.close().catch(() => {});
      })
      .catch(() => {
        if (ctxRef.current === ctx) ctxRef.current = null;
        void ctx.close().catch(() => {});
      });
  }, []);

  /** 设置原声轨道音量（0~1） */
  const setOriginalGain = useCallback((v: number) => {
    if (originalGainRef.current) {
      originalGainRef.current.gain.value = Math.max(0, Math.min(1, v));
    }
  }, []);

  /** 设置伴奏轨道音量（0~1） */
  const setInstrumentalGain = useCallback((v: number) => {
    if (instrumentalGainRef.current) {
      instrumentalGainRef.current.gain.value = Math.max(0, Math.min(1, v));
    }
  }, []);

  /**
   * 变调（-12~+12 半音）：WSOLA 不变速变调（SoundTouch worklet）
   * - pitch=0：源直通 gain（零延迟，MV 音画同步）
   * - pitch≠0：源断直通，切换 SoundTouchNode 输出到 gain（不变速变调，~100ms 延迟）
   * - worklet 注册失败（旧 WebView）：降级为媒体元素 playbackRate 变调（preservesPitch=false 已设）
   */
  const setPitch = useCallback((semitones: number) => {
    const clamped = Math.max(-12, Math.min(12, semitones));
    const stOrig = stOrigRef.current;
    const stIns = stInsRef.current;
    const originalGain = originalGainRef.current;
    const instrumentalGain = instrumentalGainRef.current;
    const originalSource = originalSourceRef.current;
    const instrumentalSource = instrumentalSourceRef.current;

    if (pitchShiftReadyRef.current && stOrig && stIns && originalGain && instrumentalGain && originalSource && instrumentalSource) {
      if (clamped === 0 && pitchRouteRef.current !== 'direct') {
        // 原调：断开 worklet 输出，恢复源 → gain 直通（旁路，消除 WSOLA 处理延迟）
        // 仅当当前路由为 worklet 时才断开（幂等，避免对未连接目标 disconnect 抛 InvalidAccessError）
        stOrig.disconnect(originalGain);
        stIns.disconnect(instrumentalGain);
        originalSource.connect(originalGain);
        instrumentalSource.connect(instrumentalGain);
        pitchRouteRef.current = 'direct';
      } else if (clamped !== 0 && pitchRouteRef.current !== 'worklet') {
        // 变调：只断开源 → gain 直通（保留源 → worklet 输入），worklet 输出接 gain
        originalSource.disconnect(originalGain);
        instrumentalSource.disconnect(instrumentalGain);
        stOrig.pitchSemitones.value = clamped;
        stIns.pitchSemitones.value = clamped;
        stOrig.connect(originalGain);
        stIns.connect(instrumentalGain);
        pitchRouteRef.current = 'worklet';
      }
      return;
    }

    // 降级路径：playbackRate 变速变调（preservesPitch=false 时保持变调效果）
    const pr = Math.pow(2, clamped / 12);
    if (originalAudioRef.current) originalAudioRef.current.playbackRate = pr;
    if (instrumentalAudioRef.current) instrumentalAudioRef.current.playbackRate = pr;
  }, []);

  /** 切换混响预设：off 仅设 wet=0，其余切换 IR */
  const setReverbPreset = useCallback((preset: ReverbPreset) => {
    if (preset === 'off') {
      // 不切换 IR，仅设 wet=0
      if (wetGainRef.current) {
        wetGainRef.current.gain.value = 0;
      }
      if (dryGainRef.current) {
        dryGainRef.current.gain.value = 1;
      }
      return;
    }
    // 非 off 预设：切换 IR（混响通道未启用则跳过）
    const ctx = ctxRef.current;
    const convolver = convolverRef.current;
    if (!ctx || !convolver) return;
    if (preset === 'custom') {
      // custom 的 IR 由 setReverbCustom 生成，此处跳过
      return;
    }
    const params = REVERB_PRESETS[preset];
    convolver.buffer = createImpulseResponse(ctx, params.duration, params.decay);
  }, []);

  /** 自定义混响：按用户参数生成 IR（时长秒 / 衰减指数），wet 由 setReverbWet 单独控制 */
  const setReverbCustom = useCallback((duration: number, decay: number) => {
    const ctx = ctxRef.current;
    const convolver = convolverRef.current;
    if (!ctx || !convolver) return;
    const d = Math.min(5, Math.max(0.5, duration));
    const k = Math.min(4, Math.max(1, decay));
    convolver.buffer = createImpulseResponse(ctx, d, k);
  }, []);

  /** 设置混响干湿比（wet 0~1，dry = 1 - wet） */
  const setReverbWet = useCallback((wet: number) => {
    // 混响通道未初始化时不调整
    if (!wetGainRef.current) return;
    const clamped = Math.max(0, Math.min(1, wet));
    wetGainRef.current.gain.value = clamped;
    if (dryGainRef.current) {
      dryGainRef.current.gain.value = 1 - clamped;
    }
  }, []);

  /** 销毁：关闭 AudioContext，清空所有引用 */
  const destroy = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.close().catch(() => {});
    }
    ctxRef.current = null;
    originalGainRef.current = null;
    instrumentalGainRef.current = null;
    mergerRef.current = null;
    dryGainRef.current = null;
    convolverRef.current = null;
    wetGainRef.current = null;
    originalAudioRef.current = null;
    instrumentalAudioRef.current = null;
    originalSourceRef.current = null;
    instrumentalSourceRef.current = null;
    stOrigRef.current = null;
    stInsRef.current = null;
    analyserRef.current = null;
    pitchShiftReadyRef.current = false;
    pitchRouteRef.current = 'direct';
    setIsReady(false);
  }, []);

  return {
    audioContext: ctxRef.current,
    analyser: analyserRef.current,
    originalAudio: originalAudioRef.current,
    instrumentalAudio: instrumentalAudioRef.current,
    isReady,
    init,
    setOriginalGain,
    setInstrumentalGain,
    setPitch,
    setReverbPreset,
    setReverbCustom,
    setReverbWet,
    destroy,
  };
}
