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

const DEFAULT_TIMEOUT = 120000; // 120 秒默认超时

/**
 * [新增] 带超时的 fetch 封装
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...rest } = init || {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
    return res;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`请求超时：模型在 ${timeout / 1000} 秒内未响应，请检查网络或稍后重试。`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

function buildMessages(prompt: string): { role: string; content: string }[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];
}

/**
 * [优化] 更友好的 API 错误提示，包含下一步操作建议
 */
function handleApiError(error: any, provider: string): never {
  const msg = error?.message || String(error);
  if (msg.includes('timeout') || msg.includes('超时')) {
    throw new Error(`⏱ 请求超时：${provider} 响应过慢。建议：检查网络连接，或切换到响应更快的模型。`);
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('Too Many')) {
    throw new Error(`🚫 额度超限：${provider} 请求频率过高或今日额度已达上限。建议：等待 1 分钟后重试，或切换到其他模型。`);
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('Invalid') || msg.includes('unauthorized')) {
    throw new Error(`🔑 API Key 无效：请检查「模型配置」中 ${provider} 的密钥是否正确填写。`);
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
    throw new Error(`🔧 ${provider} 服务端暂时不可用（${msg}）。建议：稍后重试，或切换到备用模型。`);
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
    throw new Error(`🌐 网络错误：无法连接到 ${provider}。建议：检查网络代理设置，或确认自定义 API 地址是否正确。`);
  }
  throw new Error(`❌ ${provider} 调用失败：${msg || '模型返回格式异常或服务不可用'}。建议：尝试重新生成。`);
}

// ============================================================
// [新增] 中间件系统
// ============================================================

export interface AiMiddleware {
  name: string;
  beforeRequest?: (params: { provider: string; model: string; codeLength: number }) => void | Promise<void>;
  afterResponse?: (result: AnalysisResult, usage?: TokenUsage) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

const _middlewares: AiMiddleware[] = [];

export function registerMiddleware(mw: AiMiddleware) {
  _middlewares.push(mw);
}

export function unregisterMiddleware(name: string) {
  const idx = _middlewares.findIndex(m => m.name === name);
  if (idx !== -1) _middlewares.splice(idx, 1);
}

async function runBeforeRequest(provider: string, model: string, codeLength: number) {
  for (const mw of _middlewares) {
    if (mw.beforeRequest) {
      try { await mw.beforeRequest({ provider, model, codeLength }); } catch { /* ignore middleware error */ }
    }
  }
}

async function runAfterResponse(result: AnalysisResult, usage?: TokenUsage) {
  for (const mw of _middlewares) {
    if (mw.afterResponse) {
      try { await mw.afterResponse(result, usage); } catch { /* ignore middleware error */ }
    }
  }
}

async function runOnError(error: Error) {
  for (const mw of _middlewares) {
    if (mw.onError) {
      try { await mw.onError(error); } catch { /* ignore middleware error */ }
    }
  }
}

// [新增] 流式开关：用户可在模型配置中关闭流式输出
let _globalEnableStreaming = true;

export function setGlobalEnableStreaming(enabled: boolean) {
  _globalEnableStreaming = enabled;
}

export function getGlobalEnableStreaming(): boolean {
  return _globalEnableStreaming;
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

    const res = await fetchWithTimeout(`${this.cfg.baseUrl}/chat/completions`, {
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

    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
  const client = getClient();
  const cfg = _globalModelConfig!;
  await runBeforeRequest(cfg.provider, cfg.model, code.length);

  try {
    if (!_globalEnableStreaming) {
      // [新增] 流式已关闭，使用非流式接口并模拟流式输出
      const result = await client.analyzeCode(code, config);
      await runAfterResponse(result);
      yield { chunk: JSON.stringify(result), accumulated: JSON.stringify(result), usage: undefined as TokenUsage | undefined };
      return;
    }

    let lastUsage: TokenUsage | undefined;
    let accumulated = '';
    for await (const item of client.streamAnalyzeCode(code, config, abortController)) {
      accumulated = item.accumulated;
      if (item.usage) lastUsage = item.usage;
      yield item;
    }

    // 流结束后解析结果并触发中间件
    try {
      const result = extractJsonFromStream(accumulated);
      await runAfterResponse(result, lastUsage);
    } catch {
      // 流式输出可能不完整，不在这里抛错，由调用方处理
    }
  } catch (error: any) {
    await runOnError(error);
    handleApiError(error, cfg.provider);
  }
}

export async function analyzeCode(
  code: string,
  config: AnalysisConfig,
  updateRawInfo?: (req: any, res: any) => void
): Promise<AnalysisResult> {
  const client = getClient();
  const cfg = _globalModelConfig!;
  await runBeforeRequest(cfg.provider, cfg.model, code.length);

  try {
    const result = await client.analyzeCode(code, config, updateRawInfo);
    await runAfterResponse(result);
    return result;
  } catch (error: any) {
    await runOnError(error);
    handleApiError(error, cfg.provider);
  }
}
