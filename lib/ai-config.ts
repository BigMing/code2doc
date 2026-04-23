/**
 * [第五轮新增] 多模型配置管理
 * 支持 Google Gemini / OpenAI / Anthropic Claude / 阿里通义千问
 */

import { AiProvider, ModelConfig, ProviderInfo } from './types';

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Google AI Studio 提供的 Gemini 系列模型',
    models: [
      { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    keyPlaceholder: '请输入 Google AI Studio API Key',
    keyHint: '从 https://aistudio.google.com/app/apikey 获取',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI GPT 系列模型',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    keyPlaceholder: '请输入 OpenAI API Key',
    keyHint: '格式：sk-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Anthropic Claude 系列模型',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    keyPlaceholder: '请输入 Anthropic API Key',
    keyHint: '格式：sk-ant-...',
  },
  {
    id: 'qwen',
    label: '阿里通义千问',
    description: '阿里云通义千问系列模型（兼容 OpenAI 格式）',
    models: [
      { value: 'qwen-max', label: 'Qwen Max' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
    ],
    keyPlaceholder: '请输入阿里云 DashScope API Key',
    keyHint: '从 https://dashscope.aliyun.com/ 获取',
  },
];

const CONFIG_KEY = 'CODE2DOC_MODEL_CONFIG_V1';

export const DEFAULT_CONFIG: ModelConfig = {
  provider: 'gemini',
  model: 'gemini-3-flash-preview',
  apiKey: '',
};

/**
 * 从 localStorage 加载模型配置
 * 兼容旧版本：若 localStorage 无配置但环境变量有 NEXT_PUBLIC_GEMINI_API_KEY，
 * 则自动将其作为 Gemini 默认密钥
 */
export function loadModelConfig(): ModelConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };

  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      // [第五轮新增] 兼容旧版本环境变量
      const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (envKey) {
        return { ...DEFAULT_CONFIG, apiKey: envKey };
      }
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(raw) as ModelConfig;
    // 校验 provider 合法性
    const validProvider = PROVIDERS.find(p => p.id === parsed.provider);
    if (!validProvider) return { ...DEFAULT_CONFIG };

    // 校验 model 是否属于当前 provider
    const validModel = validProvider.models.find(m => m.value === parsed.model);
    if (!validModel) {
      parsed.model = validProvider.models[0].value;
    }

    return parsed;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 保存模型配置到 localStorage
 */
export function saveModelConfig(config: ModelConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * 根据 provider 获取默认模型
 */
export function getDefaultModel(provider: AiProvider): string {
  const p = PROVIDERS.find(x => x.id === provider);
  return p?.models[0]?.value || '';
}

/**
 * 获取 provider 的显示名称
 */
export function getProviderLabel(provider: AiProvider): string {
  return PROVIDERS.find(p => p.id === provider)?.label || provider;
}

/**
 * 获取 model 的显示名称
 */
export function getModelLabel(provider: AiProvider, model: string): string {
  const p = PROVIDERS.find(x => x.id === provider);
  return p?.models.find(m => m.value === model)?.label || model;
}
