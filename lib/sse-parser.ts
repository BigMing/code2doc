/**
 * [优化] 统一 SSE（Server-Sent Events）流式解析器
 * 消除 OpenAI 兼容客户端与 Anthropic 客户端之间的重复 SSE 解析代码
 */

import { TokenUsage } from './types';

export interface SseChunk {
  chunk: string;
  accumulated: string;
  usage?: TokenUsage;
}

/**
 * 通用的 SSE 流解析异步生成器
 * @param reader 响应体的 ReadableStreamDefaultReader
 * @param extractText 从 SSE JSON 数据中提取文本内容的函数
 * @param extractUsage 从 SSE JSON 数据中提取 Token 用量的函数
 * @param abortSignal 可选的 AbortSignal
 */
export async function* parseSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  extractText: (json: any) => string,
  extractUsage: (json: any) => TokenUsage | undefined,
  abortSignal?: AbortSignal
): AsyncGenerator<SseChunk> {
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      if (abortSignal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('event: ')) continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const text = extractText(json) || '';
            const usage = extractUsage(json);
            if (text || usage) {
              accumulated += text;
              yield { chunk: text, accumulated, usage };
            }
          } catch {
            // 忽略格式损坏的 SSE 行
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}
