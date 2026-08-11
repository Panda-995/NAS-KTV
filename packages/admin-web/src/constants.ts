export type SeparationModel = 'htdemucs' | 'htdemucs_ft' | 'mdx_extra' | 'sdx_extra' | 'bsrnn';

export const SEPARATION_MODELS: { value: SeparationModel; label: string; hint: string }[] = [
  { value: 'htdemucs', label: '标准版', hint: '速度快，适合大多数歌曲' },
  { value: 'htdemucs_ft', label: '高质版', hint: '音质更佳，处理速度较慢' },
  { value: 'mdx_extra', label: '均衡版', hint: '混合架构，细节更丰富' },
  { value: 'sdx_extra', label: '稳定版', hint: '新架构，长音频更稳定' },
  { value: 'bsrnn', label: '旗舰版', hint: '最新 SOTA 模型，质量最高，速度最慢' },
];

export const separationModelLabel = (value?: string | null) =>
  SEPARATION_MODELS.find(m => m.value === value)?.label ?? value ?? '—';
