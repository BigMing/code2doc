/**
 * [第五轮新增] 多模型配置管理
 * 支持 Google Gemini / OpenAI / Anthropic Claude / 阿里通义千问 / GLM / DeepSeek
 * 以及私有化部署的自定义模型（兼容 OpenAI 格式）
 */

import { AiProvider, ModelConfig, ProviderInfo } from './types';
import { apiSave, apiLoad } from './server-storage';

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
    label: '阿里通义千问（公有云）',
    description: '阿里云 DashScope 通义千问系列模型',
    models: [
      { value: 'qwen-max', label: 'Qwen Max' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
    ],
    keyPlaceholder: '请输入阿里云 DashScope API Key',
    keyHint: '从 https://dashscope.aliyun.com/ 获取',
  },
  {
    id: 'qwen-private',
    label: '通义千问（私有化）',
    description: '企业内部私有化部署的通义千问模型（兼容 OpenAI 格式）',
    models: [
      { value: 'qwen-max', label: 'Qwen Max' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
      { value: 'qwen2.5-72b-instruct', label: 'Qwen2.5 72B Instruct' },
      { value: 'qwen2.5-32b-instruct', label: 'Qwen2.5 32B Instruct' },
      { value: 'qwen2.5-14b-instruct', label: 'Qwen2.5 14B Instruct' },
      { value: 'qwen2.5-7b-instruct', label: 'Qwen2.5 7B Instruct' },
      { value: 'custom', label: '自定义模型名称' },
    ],
    keyPlaceholder: '请输入 API Key（如需）',
    keyHint: '私有化部署通常不需要 Key，或按企业内部规范填写',
    defaultBaseUrl: 'http://localhost:8000/v1',
    allowCustomBaseUrl: true,
  },
  {
    id: 'glm',
    label: '智谱 GLM',
    description: '智谱 AI GLM 系列模型（兼容 OpenAI 格式）',
    models: [
      { value: 'glm-4', label: 'GLM-4' },
      { value: 'glm-4-plus', label: 'GLM-4 Plus' },
      { value: 'glm-4-flash', label: 'GLM-4 Flash' },
      { value: 'glm-4-air', label: 'GLM-4 Air' },
      { value: 'glm-4-9b', label: 'GLM-4 9B' },
      { value: 'chatglm3-6b', label: 'ChatGLM3-6B' },
    ],
    keyPlaceholder: '请输入智谱 AI API Key',
    keyHint: '从 https://open.bigmodel.cn/ 获取',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    allowCustomBaseUrl: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek 系列模型（兼容 OpenAI 格式）',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek-V3' },
      { value: 'deepseek-reasoner', label: 'DeepSeek-R1' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ],
    keyPlaceholder: '请输入 DeepSeek API Key',
    keyHint: '从 https://platform.deepseek.com/ 获取',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    allowCustomBaseUrl: true,
  },
  {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    description: '月之暗面 Kimi 系列模型（兼容 OpenAI 格式）',
    models: [
      { value: 'moonshot-v1-8k', label: 'Moonshot V1 8K' },
      { value: 'moonshot-v1-32k', label: 'Moonshot V1 32K' },
      { value: 'moonshot-v1-128k', label: 'Moonshot V1 128K' },
      { value: 'moonshot-v1-auto', label: 'Moonshot V1 Auto' },
    ],
    keyPlaceholder: '请输入 Moonshot API Key',
    keyHint: '从 https://platform.moonshot.cn/ 获取',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    allowCustomBaseUrl: true,
  },
];

const CONFIG_KEY = 'CODE2DOC_MODEL_CONFIG_V2';

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
async function loadFromLocal(): Promise<ModelConfig> {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };

  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (envKey) return { ...DEFAULT_CONFIG, apiKey: envKey };
      const oldRaw = localStorage.getItem('CODE2DOC_MODEL_CONFIG_V1');
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        localStorage.removeItem('CODE2DOC_MODEL_CONFIG_V1');
        localStorage.setItem(CONFIG_KEY, JSON.stringify(old));
        return old as ModelConfig;
      }
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(raw) as ModelConfig;
    const validProvider = PROVIDERS.find(p => p.id === parsed.provider);
    if (!validProvider) return { ...DEFAULT_CONFIG };
    const validModel = validProvider.models.find(m => m.value === parsed.model);
    if (!validModel) parsed.model = validProvider.models[0].value;
    return parsed;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function loadModelConfig(): Promise<ModelConfig> {
  try {
    const serverData = await apiLoad(CONFIG_KEY);
    if (serverData) {
      const parsed = serverData as ModelConfig;
      const validProvider = PROVIDERS.find(p => p.id === parsed.provider);
      if (validProvider) {
        const validModel = validProvider.models.find(m => m.value === parsed.model);
        if (!validModel) parsed.model = validProvider.models[0].value;
        // 同步回 localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch {
    // 回退到 localStorage
  }
  return loadFromLocal();
}

/**
 * 保存模型配置到 localStorage
 */
export async function saveModelConfig(config: ModelConfig): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }
  try {
    await apiSave(CONFIG_KEY, config);
  } catch {
    // 服务端存储失败不影响本地体验
  }
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

/**
 * 获取 provider 的默认 API 地址
 */
export function getDefaultBaseUrl(provider: AiProvider): string | undefined {
  return PROVIDERS.find(p => p.id === provider)?.defaultBaseUrl;
}

/**
 * 判断 provider 是否支持自定义 API 地址
 */
export function allowCustomBaseUrl(provider: AiProvider): boolean {
  return !!PROVIDERS.find(p => p.id === provider)?.allowCustomBaseUrl;
}
