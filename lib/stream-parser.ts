/**
 * 第四轮新增：流式响应与打字机效果
 * 流式文本累积、JSON 提取与容错解析工具
 */
import { AnalysisResult } from "./types";

export function extractJsonFromStream(text: string): AnalysisResult {
  let cleaned = text.trim();
  
  // 1. 移除 Markdown 代码块包裹
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned) as AnalysisResult;
  } catch (e) {
    console.warn("标准 JSON 解析失败，尝试正则提取...", e);
    
    // 2. 正则提取第一个 {...} 块
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as AnalysisResult;
      } catch (e2) {
        throw new Error("模型返回的 JSON 结构损坏，无法解析。");
      }
    }
    
    throw new Error("未在响应中找到有效的 JSON 结构。");
  }
}
