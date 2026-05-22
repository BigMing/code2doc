/**
 * [第五轮新增/优化] 统一 AI 调用层
 * 封装 Gemini / OpenAI / Anthropic / Qwen 的多模型调用
 * [优化] 消除 SSE 解析重复代码，统一使用 sse-parser.ts
 */

import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, AnalysisConfig, ModelConfig, AiProvider, TokenUsage } from './types';
import { SYSTEM_PROMPT, getAnalysisPrompt } from './prompt-template';
import { extractJsonFromStream } from './stream-parser';
import { parseSseStream } from './sse-parser';

// ============================================================
// 公共工具
// ============================================================

function buildMessages(prompt: string): { role: string; content: string }[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];
}

function handleApiError(error: any, provider: string): never {
  const msg = error?.message || String(error);
  if (msg.includes('429') || msg.includes('rate limit')) {
    throw new Error('额度超限：请求频率过高或今日额度已达上限，请稍后重试。');
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('Invalid')) {
    throw new Error(`API Key 无效或权限不足，请检查 ${provider} 的密钥配置。`);
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    throw new Error(`${provider} 服务端暂时不可用，请稍后重试。`);
  }
  throw new Error(msg || `${provider} 模型返回格式异常或服务不可用，请重试`);
}

// ============================================================
// Gemini 实现
// ============================================================

class GeminiClient {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async *streamAnalyzeCode(
    code: string,
    config: AnalysisConfig,
    abortController?: AbortController
  ) {
    const prompt = getAnalysisPrompt(code, config);
    const result = await this.ai.models.generateContentStream({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    let accumulated = '';
    let lastUsage: TokenUsage | undefined;
    for await (const chunk of result) {
      if (abortController?.signal.aborted) break;
      const text = chunk.text || '';
      accumulated += text;
      const meta = (chunk as any).usageMetadata;
      if (meta) {
        lastUsage = {
          promptTokens: meta.promptTokenCount || 0,
          completionTokens: meta.candidatesTokenCount || 0,
          totalTokens: meta.totalTokenCount || 0,
        };
      }
      yield { chunk: text, accumulated, usage: lastUsage };
    }
    return accumulated;
  }

  async analyzeCode(
    code: string,
    config: AnalysisConfig,
    updateRawInfo?: (req: any, res: any) => void
  ): Promise<AnalysisResult> {
    const prompt = getAnalysisPrompt(code, config);
    const requestParams = {
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    };

    const result = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            requirementDoc: { type: Type.STRING },
            annotatedCode: { type: Type.STRING },
          },
          required: ['summary', 'requirementDoc', 'annotatedCode'],
        },
      },
    });

    if (updateRawInfo) {
      updateRawInfo(requestParams, result);
    }

    const resultText = result.text;
    if (!resultText) throw new Error('AI 未返回有效内容');
    return JSON.parse(resultText) as AnalysisResult;
  }

  async detectLanguage(code: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: `Identify the programming language of the following code snippet. Return ONLY the name of the language (e.g., "javascript", "python", "java", etc.). If unsure, return "java".\n\nCode:\n${code.substring(0, 500)}`,
        config: { maxOutputTokens: 10, temperature: 0.1 },
      });
      const text = response.text?.trim().toLowerCase() || 'java';
      const supported = ['java', 'python', 'javascript', 'typescript', 'go', 'cpp', 'csharp', 'ruby', 'rust', 'php', 'swift', 'kotlin', 'sql', 'html', 'css'];
      return supported.includes(text) ? text : 'java';
    } catch {
      return 'java';
    }
  }
}

// ============================================================
// OpenAI 兼容实现（OpenAI / Qwen / GLM / DeepSeek / Kimi）
// ============================================================

interface OpenAiCompatibleConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

class OpenAiCompatibleClient {
  private cfg: OpenAiCompatibleConfig;

  constructor(cfg: OpenAiCompatibleConfig) {
    this.cfg = cfg;
  }

  private async fetchChat(
    messages: { role: string; content: string }[],
    stream = false,
    signal?: AbortSignal
  ) {
    const body: Record<string, unknown> = {
      model: this.cfg.model,
      messages,
      temperature: 0.2,
      stream,
    };
    if (!stream) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${err}`);
    }
    return res;
  }

  async *streamAnalyzeCode(
    code: string,
    config: AnalysisConfig,
    abortController?: AbortController
  ) {
    const prompt = getAnalysisPrompt(code, config);
    const messages = buildMessages(prompt);
    const res = await this.fetchChat(messages, true, abortController?.signal);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取流式响应');

    const extractText = (json: any): string => json.choices?.[0]?.delta?.content || '';
    const extractUsage = (json: any): TokenUsage | undefined => {
      if (json.usage) {
        return {
          promptTokens: json.usage.prompt_tokens || 0,
          completionTokens: json.usage.completion_tokens || 0,
          totalTokens: json.usage.total_tokens || 0,
        };
      }
      return undefined;
    };

    yield* parseSseStream(reader, extractText, extractUsage, abortController?.signal);
  }

  async analyzeCode(
    code: string,
    config: AnalysisConfig,
    updateRawInfo?: (req: any, res: any) => void
  ): Promise<AnalysisResult> {
    const prompt = getAnalysisPrompt(code, config);
    const messages = buildMessages(prompt);

    const requestParams = { model: this.cfg.model, messages, temperature: 0.2, response_format: { type: 'json_object' } };
    const res = await this.fetchChat(messages, false);
    const data = await res.json();

    if (updateRawInfo) {
      updateRawInfo(requestParams, data);
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('AI 未返回有效内容');
    return extractJsonFromStream(text);
  }

  async detectLanguage(code: string): Promise<string> {
    try {
      const res = await this.fetchChat([
        {
          role: 'user',
          content: `Identify the programming language of the following code snippet. Return ONLY the name of the language (e.g., "javascript", "python", "java", etc.). If unsure, return "java".\n\nCode:\n${code.substring(0, 500)}`,
        },
      ]);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'java';
      const supported = ['java', 'python', 'javascript', 'typescript', 'go', 'cpp', 'csharp', 'ruby', 'rust', 'php', 'swift', 'kotlin', 'sql', 'html', 'css'];
      return supported.includes(text) ? text : 'java';
    } catch {
      return 'java';
    }
  }
}

// ============================================================
// Anthropic Claude 实现
// ============================================================

class AnthropicClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async fetchMessages(
    system: string,
    messages: { role: string; content: string }[],
    stream = false,
    signal?: AbortSignal
  ) {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      system,
      messages: messages.map(m => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content })),
      temperature: 0.2,
      stream,
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${err}`);
    }
    return res;
  }

  async *streamAnalyzeCode(
    code: string,
    config: AnalysisConfig,
    abortController?: AbortController
  ) {
    const prompt = getAnalysisPrompt(code, config);
    const res = await this.fetchMessages(SYSTEM_PROMPT, [{ role: 'user', content: prompt }], true, abortController?.signal);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取流式响应');

    const extractText = (json: any): string => json.delta?.text || '';
    const extractUsage = (json: any): TokenUsage | undefined => {
      if (json.usage) {
        return {
          promptTokens: json.usage.input_tokens || 0,
          completionTokens: json.usage.output_tokens || 0,
          totalTokens: (json.usage.input_tokens || 0) + (json.usage.output_tokens || 0),
        };
      }
      return undefined;
    };

    yield* parseSseStream(reader, extractText, extractUsage, abortController?.signal);
  }

  async analyzeCode(
    code: string,
    config: AnalysisConfig,
    updateRawInfo?: (req: any, res: any) => void
  ): Promise<AnalysisResult> {
    const prompt = getAnalysisPrompt(code, config);
    const requestParams = {
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    };

    const res = await this.fetchMessages(SYSTEM_PROMPT, [{ role: 'user', content: prompt }]);
    const data = await res.json();

    if (updateRawInfo) {
      updateRawInfo(requestParams, data);
    }

    const text = data.content?.[0]?.text || '';
    if (!text) throw new Error('AI 未返回有效内容');
    return extractJsonFromStream(text);
  }

  async detectLanguage(code: string): Promise<string> {
    try {
      const res = await this.fetchMessages('', [
        {
          role: 'user',
          content: `Identify the programming language of the following code snippet. Return ONLY the name of the language (e.g., "javascript", "python", "java", etc.). If unsure, return "java".\n\nCode:\n${code.substring(0, 500)}`,
        },
      ]);
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim().toLowerCase() || 'java';
      const supported = ['java', 'python', 'javascript', 'typescript', 'go', 'cpp', 'csharp', 'ruby', 'rust', 'php', 'swift', 'kotlin', 'sql', 'html', 'css'];
      return supported.includes(text) ? text : 'java';
    } catch {
      return 'java';
    }
  }
}

// ============================================================
// 工厂函数：根据配置创建对应客户端
// ============================================================

function createClient(modelConfig: ModelConfig) {
  const { provider, apiKey, model, baseUrl } = modelConfig;

  switch (provider) {
    case 'gemini':
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置 Gemini 密钥');
      return new GeminiClient(apiKey, model);
    case 'openai':
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置 OpenAI 密钥');
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: 'https://api.openai.com/v1' });
    case 'qwen':
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置阿里云 DashScope 密钥');
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' });
    case 'qwen-private': {
      const url = baseUrl || 'http://localhost:8000/v1';
      return new OpenAiCompatibleClient({ apiKey: apiKey || 'none', model, baseUrl: url });
    }
    case 'glm': {
      const glmUrl = baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置智谱 AI 密钥');
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: glmUrl });
    }
    case 'deepseek': {
      const dsUrl = baseUrl || 'https://api.deepseek.com/v1';
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置 DeepSeek 密钥');
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: dsUrl });
    }
    case 'anthropic':
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置 Anthropic 密钥');
      return new AnthropicClient(apiKey, model);
    case 'kimi': {
      const kimiUrl = baseUrl || 'https://api.moonshot.cn/v1';
      if (!apiKey) throw new Error('API Key 未配置：请在「模型配置」中设置 Moonshot 密钥');
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: kimiUrl });
    }
    default:
      throw new Error(`不支持的模型提供商: ${provider}`);
  }
}

// ============================================================
// 对外暴露的统一接口
// ============================================================

let _globalModelConfig: ModelConfig | null = null;

export function setGlobalModelConfig(config: ModelConfig) {
  _globalModelConfig = config;
}

export function getGlobalModelConfig(): ModelConfig | null {
  return _globalModelConfig;
}

function getClient() {
  if (!_globalModelConfig || !_globalModelConfig.apiKey) {
    throw new Error('API Key 未配置：请在顶部工具栏「模型配置」中选择模型并填写密钥');
  }
  return createClient(_globalModelConfig);
}

export async function detectLanguage(code: string): Promise<string> {
  return getClient().detectLanguage(code);
}

export async function* streamAnalyzeCode(
  code: string,
  config: AnalysisConfig,
  abortController?: AbortController
) {
  yield* getClient().streamAnalyzeCode(code, config, abortController);
}

export async function analyzeCode(
  code: string,
  config: AnalysisConfig,
  updateRawInfo?: (req: any, res: any) => void
): Promise<AnalysisResult> {
  return getClient().analyzeCode(code, config, updateRawInfo);
}
