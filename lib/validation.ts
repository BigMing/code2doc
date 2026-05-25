/**
 * [新增] Zod 运行时 Schema 校验
 * 对 AI 返回结果进行严格的运行时校验，防止字段缺失导致页面异常
 */

import { z } from 'zod';
import type { AnalysisResult, ModelConfig, AiProvider } from './types';

// AI 分析结果校验 Schema
export const AnalysisResultSchema = z.object({
  summary: z.string().min(1, 'summary 不能为空'),
  requirementDoc: z.string().min(1, 'requirementDoc 不能为空'),
  annotatedCode: z.string().min(1, 'annotatedCode 不能为空'),
});

export type ValidatedAnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * 校验 AI 返回结果，返回标准化对象
 * 如果校验失败，抛出带有详细字段信息的错误
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  const result = AnalysisResultSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  // 构建友好的错误信息
  const issues = result.error.issues.map(
    (issue) => `「${issue.path.join('.')}」${issue.message}`
  );
  throw new Error(`AI 返回结果格式不完整：\n${issues.join('\n')}\n\n请尝试重新生成，或换一个模型再试。`);
}

/**
 * 尝试修复部分缺失字段的 AI 返回结果
 * 某些模型可能返回字段名不一致或部分缺失的情况
 */
export function tryRepairAnalysisResult(data: Record<string, unknown>): Partial<AnalysisResult> {
  const repaired: Partial<AnalysisResult> = {};

  // summary 字段映射
  const summaryKeys = ['summary', 'Summary', '功能概括', 'overview', 'description'];
  for (const key of summaryKeys) {
    if (typeof data[key] === 'string' && data[key]) {
      repaired.summary = data[key] as string;
      break;
    }
  }

  // requirementDoc 字段映射
  const docKeys = ['requirementDoc', 'requirement_doc', 'RequirementDoc', '需求文档', 'document', 'doc'];
  for (const key of docKeys) {
    if (typeof data[key] === 'string' && data[key]) {
      repaired.requirementDoc = data[key] as string;
      break;
    }
  }

  // annotatedCode 字段映射
  const codeKeys = ['annotatedCode', 'annotated_code', 'AnnotatedCode', '注释代码', 'code', 'annotated'];
  for (const key of codeKeys) {
    if (typeof data[key] === 'string' && data[key]) {
      repaired.annotatedCode = data[key] as string;
      break;
    }
  }

  return repaired;
}

/**
 * 校验并尝试修复 AI 返回结果
 * 先尝试直接校验，失败时尝试字段映射修复，再失败时抛出错误
 */
export function validateAndRepairAnalysisResult(data: unknown): AnalysisResult {
  // 先尝试直接校验
  try {
    return validateAnalysisResult(data);
  } catch {
    // 忽略直接校验错误，尝试修复
  }

  // 尝试修复
  if (data && typeof data === 'object') {
    const repaired = tryRepairAnalysisResult(data as Record<string, unknown>);
    try {
      return validateAnalysisResult(repaired);
    } catch {
      // 修复后也失败，抛出原始错误
    }
  }

  // 最终失败
  return validateAnalysisResult(data);
}

// Token 用量校验 Schema
export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().min(0).default(0),
  completionTokens: z.number().int().min(0).default(0),
  totalTokens: z.number().int().min(0).default(0),
});

// 模型配置校验 Schema
export const ModelConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'anthropic', 'qwen', 'qwen-private', 'glm', 'deepseek', 'kimi']),
  model: z.string().min(1, '模型名称不能为空'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseUrl: z.string().optional(),
});

export function validateModelConfig(config: unknown): ModelConfig {
  const result = ModelConfigSchema.safeParse(config);
  if (result.success) {
    return result.data as ModelConfig;
  }
  const issues = result.error.issues.map(
    (issue) => `「${issue.path.join('.')}」${issue.message}`
  );
  throw new Error(`模型配置校验失败：${issues.join('；')}`);
}
