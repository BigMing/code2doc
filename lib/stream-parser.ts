/**
 * [优化] 流式响应 JSON 提取与容错解析工具
 * 统一处理模型返回的各种 JSON 包裹格式
 */

import { AnalysisResult } from "./types";
import { validateAndRepairAnalysisResult } from "./validation";

/**
 * 从任意文本中提取有效的 JSON 对象
 * 支持处理 Markdown 代码块包裹、首尾多余字符等场景
 */
export function extractJsonFromStream(text: string): AnalysisResult {
  let cleaned = text.trim();
  
  // 1. 移除 Markdown 代码块包裹
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  // 2. 尝试直接解析清理后的文本
  try {
    const parsed = JSON.parse(cleaned);
    return validateAndRepairAnalysisResult(parsed);
  } catch {
    // ignore
  }
  
  // 3. 尝试提取第一个 {...} 块（最内层的大括号匹配）
  // 使用栈计数法找到最外层的大括号范围
  let depth = 0;
  let start = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = cleaned.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          return validateAndRepairAnalysisResult(parsed);
        } catch {
          // 继续搜索下一个可能的块
          start = -1;
        }
      }
    }
  }

  // 4. 最后尝试正则提取（兜底方案）
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return validateAndRepairAnalysisResult(parsed);
    } catch {
      throw new Error("模型返回的 JSON 结构损坏，无法解析。请尝试重新生成，或换一个模型再试。");
    }
  }
  
  throw new Error("未在响应中找到有效的 JSON 结构。");
}

/**
 * 从流式累积文本中提取可能的 JSON 片段（用于实时预览）
 */
export function extractPartialJson(text: string): Partial<AnalysisResult> | null {
  try {
    const result = extractJsonFromStream(text);
    return result;
  } catch {
    return null;
  }
}
