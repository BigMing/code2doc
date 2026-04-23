/**
 * [第五轮新增] 统一 AI 调用层
 * 封装 Gemini / OpenAI / Anthropic / Qwen 的多模型调用
 */

import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, AnalysisConfig, ModelConfig, AiProvider } from './types';
import { SYSTEM_PROMPT, getAnalysisPrompt } from './prompt-template';

// ============================================================
// 公共工具
// ============================================================

function buildMessages(prompt: string): { role: string; content: string }[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];
}

function parseJsonResult(text: string): AnalysisResult {
  // 先尝试直接解析
  try {
    return JSON.parse(text) as AnalysisResult;
  } catch {
    // 容错：提取 ```json ... ``` 或纯 JSON 块
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
      try {
        return JSON.parse(codeBlock[1].trim()) as AnalysisResult;
      } catch {
        // ignore
      }
    }
    // 查找第一个 { 和最后一个 }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as AnalysisResult;
      } catch {
        // ignore
      }
    }
  }
  throw new Error('模型返回内容无法解析为 JSON');
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
    for await (const chunk of result) {
      if (abortController?.signal.aborted) break;
      const text = chunk.text || '';
      accumulated += text;
      yield { chunk: text, accumulated };
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
// OpenAI 兼容实现（OpenAI / Qwen）
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
    const body: any = {
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

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    try {
      while (true) {
        if (abortController?.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const text = json.choices?.[0]?.delta?.content || '';
              if (text) {
                accumulated += text;
                yield { chunk: text, accumulated };
              }
            } catch {
              // ignore malformed SSE line
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated;
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
    return parseJsonResult(text);
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
    const body: any = {
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

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    try {
      while (true) {
        if (abortController?.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event: ') || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const text = json.delta?.text || '';
              if (text) {
                accumulated += text;
                yield { chunk: text, accumulated };
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
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
    return parseJsonResult(text);
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
  const { provider, apiKey, model } = modelConfig;

  if (!apiKey) {
    throw new Error(`API Key 未配置：请在「模型配置」中设置 ${provider} 的密钥`);
  }

  switch (provider) {
    case 'gemini':
      return new GeminiClient(apiKey, model);
    case 'openai':
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: 'https://api.openai.com/v1' });
    case 'qwen':
      return new OpenAiCompatibleClient({ apiKey, model, baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' });
    case 'anthropic':
      return new AnthropicClient(apiKey, model);
    default:
      throw new Error(`不支持的模型提供商: ${provider}`);
  }
}

// ============================================================
// 对外暴露的统一接口（与原来 gemini.ts 保持相同签名）
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
