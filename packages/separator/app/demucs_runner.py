import os
import logging
import tempfile
import threading
from typing import Optional, Callable, Dict, Any

logger = logging.getLogger(__name__)

class TaskCancelledError(Exception):
    """分离任务被用户取消"""

# 全局模型缓存
_model_cache: Dict[str, Any] = {}
_model_lock = threading.Lock()
_device = "cpu"

def get_device() -> str:
    """获取当前设备"""
    return _device

def set_device(device: str):
    """设置设备"""
    global _device
    _device = device
    logger.info(f"Device set to: {device}")

def release_gpu_resources():
    """
    任务结束后释放 GPU 资源：
    1. 卸载缓存的模型（清空 _model_cache，权重显存归还 PyTorch 缓存池）
    2. torch.cuda.empty_cache() 把未使用的显存归还给驱动（nvidia-smi 可见下降）

    运行中的并发任务持有模型局部引用，清空全局缓存不影响其推理。
    """
    global _model_cache
    with _model_lock:
        _model_cache.clear()
    try:
        import gc
        import torch
        if torch.cuda.is_available():
            gc.collect()
            torch.cuda.empty_cache()
            logger.info("GPU resources released (models unloaded, cache emptied)")
    except ImportError:
        pass

def load_model(model_name: str = 'htdemucs'):
    """
    加载Demucs模型
    首次加载会下载模型，后续从缓存读取
    """
    global _model_cache, _device
    
    if model_name in _model_cache:
        logger.info(f"Model {model_name} loaded from cache")
        return _model_cache[model_name]
    
    with _model_lock:
        if model_name in _model_cache:
            logger.info(f"Model {model_name} loaded from cache")
            return _model_cache[model_name]
        return _load_model_locked(model_name)


def _load_model_locked(model_name: str):
    """加载模型（调用方需持有 _model_lock）"""
    global _model_cache, _device
    
    try:
        import torch
        from demucs.pretrained import get_model
        
        logger.info(f"Loading Demucs model: {model_name}")
        
        # 检测设备
        if torch.cuda.is_available() and _device == "cuda":
            device = "cuda"
        else:
            device = "cpu"
        
        # 加载模型
        model = get_model(model_name)
        model.to(device)
        
        _model_cache[model_name] = model
        logger.info(f"Model {model_name} loaded successfully on {device}")
        
        return model
        
    except ImportError as e:
        logger.error(f"Demucs or torch not installed: {e}")
        raise RuntimeError("Demucs or torch not installed")
    except Exception as e:
        logger.error(f"Failed to load model {model_name}: {e}")
        raise

def _load_audio_with_ffmpeg(audio_path: str) -> tuple:
    """Use ffmpeg to decode audio to raw PCM and load with numpy/torch."""
    import subprocess
    import platform
    import numpy as np
    import torch
    from app.audio_utils import get_ffmpeg_path, get_audio_info

    ffmpeg_path = get_ffmpeg_path()
    info = get_audio_info(audio_path)
    sr = info.get('sample_rate', 44100)
    channels = info.get('channels', 2)

    cmd = [
        ffmpeg_path, '-i', audio_path,
        '-f', 'f32le', '-acodec', 'pcm_f32le',
        '-ac', str(channels), '-ar', str(sr),
        '-v', 'error',
        'pipe:1',
    ]

    kwargs = {'stdout': subprocess.PIPE, 'stderr': subprocess.PIPE}
    if platform.system() == 'Windows':
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        kwargs['startupinfo'] = si

    proc = subprocess.run(cmd, **kwargs)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg decode failed: {proc.stderr.decode(errors='ignore')}")

    audio = np.frombuffer(proc.stdout, dtype=np.float32)
    if channels > 1:
        audio = audio.reshape(-1, channels).T
    else:
        audio = audio.reshape(1, -1)

    wav = torch.from_numpy(audio.copy())
    logger.info(f"Loaded audio via ffmpeg: {wav.shape}, sr={sr}")
    return wav, sr

def _save_audio_with_fallback(path: str, tensor, sr: int):
    """Save audio tensor with fallback for torchaudio backend issues."""
    import torchaudio
    import subprocess
    import platform
    import numpy as np
    from app.audio_utils import get_ffmpeg_path

    try:
        torchaudio.save(path, tensor, sr)
        return
    except Exception:
        pass

    ffmpeg_path = get_ffmpeg_path()
    audio_np = tensor.cpu().numpy()
    if audio_np.ndim == 1:
        audio_np = audio_np.reshape(1, -1)
    channels = audio_np.shape[0]

    cmd = [
        ffmpeg_path, '-y',
        '-f', 'f32le', '-acodec', 'pcm_f32le',
        '-ar', str(sr), '-ac', str(channels),
        '-i', 'pipe:0',
        '-acodec', 'pcm_s16le',
        path,
    ]

    kwargs = {'stdout': subprocess.PIPE, 'stderr': subprocess.PIPE}
    if platform.system() == 'Windows':
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        kwargs['startupinfo'] = si

    raw = audio_np.T.flatten().astype(np.float32).tobytes()
    proc = subprocess.run(cmd, input=raw, **kwargs)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg save failed: {proc.stderr.decode(errors='ignore')}")
    logger.info(f"Saved audio via ffmpeg: {path}")


def separate(
    audio_path: str,
    output_dir: str,
    model_name: str = 'htdemucs',
    progress_callback: Optional[Callable[[float, str], None]] = None,
    is_cancelled: Optional[Callable[[], bool]] = None
) -> dict:
    """
    执行人声分离
    
    Args:
        audio_path: 输入音频文件路径
        output_dir: 输出目录
        model_name: Demucs模型名称
        progress_callback: 进度回调函数(progress, stage)
        is_cancelled: 取消检查回调，返回True时中断分离并抛出TaskCancelledError
    
    Returns:
        dict: 包含vocals和instrumental文件路径
    
    Raises:
        TaskCancelledError: 任务被取消
    """
    import torch
    import torchaudio
    from demucs.apply import apply_model
    
    def raise_if_cancelled():
        if is_cancelled and is_cancelled():
            raise TaskCancelledError("Task cancelled by user")
    
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 加载模型
    if progress_callback:
        progress_callback(10, "loading_model")
    raise_if_cancelled()
    model = load_model(model_name)
    
    device = get_device()
    
    # 读取音频文件
    if progress_callback:
        progress_callback(20, "loading_audio")
    
    try:
        wav, sr = torchaudio.load(audio_path)
    except Exception as e1:
        logger.warning(f"torchaudio load failed ({e1}), trying soundfile...")
        try:
            import soundfile as sf
            data, sr = sf.read(audio_path, dtype='float32', always_2d=True)
            wav = torch.from_numpy(data.T.copy())
            logger.info(f"Loaded audio via soundfile: {wav.shape}, sr={sr}")
        except Exception as e2:
            logger.warning(f"soundfile failed ({e2}), trying direct ffmpeg decode...")
            try:
                wav, sr = _load_audio_with_ffmpeg(audio_path)
            except Exception as e3:
                logger.error(f"All backends failed. torchaudio={e1}, soundfile={e2}, direct={e3}")
                raise RuntimeError(f"Failed to load audio file: {e1}")
    
    raise_if_cancelled()
    
    # 确保音频是立体声
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)
    elif wav.shape[0] > 2:
        wav = wav[:2]
    
    # 重采样到模型需要的采样率
    model_sr = model.samplerate
    if sr != model_sr:
        resampler = torchaudio.transforms.Resample(sr, model_sr)
        wav = resampler(wav)
        sr = model_sr
    
    # 准备输入（模型需要 [batch, channels, samples] 格式）
    wav = wav.unsqueeze(0).to(device)
    
    # 执行分离
    if progress_callback:
        progress_callback(30, "separating")
    
    logger.info("Starting separation...")
    
    # 使用apply_model进行分离，支持取消（callback抛异常会中断剩余分段）
    def check_cancel(info: dict):
        raise_if_cancelled()
    
    with torch.no_grad():
        # apply_model返回 [batch, sources, channels, samples]
        # sources顺序取决于模型，htdemucs默认: drums, bass, other, vocals
        sources = apply_model(
            model,
            wav,
            progress=False,
            num_workers=0,
            split=True,
            overlap=0.25,
            callback=check_cancel,
        )
    
    raise_if_cancelled()
    
    if progress_callback:
        progress_callback(70, "processing_results")
    
    # 获取分离结果
    # htdemucs模型输出: 0=drums, 1=bass, 2=other, 3=vocals
    sources = sources.cpu()
    
    vocals = sources[0, 3]  # vocals
    # instrumental = drums + bass + other
    instrumental = sources[0, 0] + sources[0, 1] + sources[0, 2]
    
    # 保存分离结果（临时WAV文件）
    if progress_callback:
        progress_callback(80, "saving_results")
    
    raise_if_cancelled()
    
    base_name = os.path.splitext(os.path.basename(audio_path))[0]
    
    vocals_wav_path = os.path.join(output_dir, f"{base_name}_vocals.wav")
    instrumental_wav_path = os.path.join(output_dir, f"{base_name}_instrumental.wav")
    
    _save_audio_with_fallback(vocals_wav_path, vocals, sr)
    _save_audio_with_fallback(instrumental_wav_path, instrumental, sr)
    
    logger.info(f"Vocals saved to: {vocals_wav_path}")
    logger.info(f"Instrumental saved to: {instrumental_wav_path}")
    
    if progress_callback:
        progress_callback(100, "completed")
    
    return {
        'vocals_path': vocals_wav_path,
        'instrumental_path': instrumental_wav_path,
        'sample_rate': sr,
        'duration': wav.shape[2] / sr
    }

def get_model_info(model_name: str = 'htdemucs') -> dict:
    """获取模型信息"""
    return {
        'name': model_name,
        'type': 'demucs',
        'version': 'v4',
        'sources': ['drums', 'bass', 'other', 'vocals'],
        'sample_rate': 44100,
        'loaded': model_name in _model_cache
    }
