import { describe, it, expect } from 'vitest';
import {
  validateAnalysisResult,
  tryRepairAnalysisResult,
  validateAndRepairAnalysisResult,
  validateModelConfig,
} from '../validation';
import type { AnalysisResult } from '../types';

describe('validation', () => {
  const validResult: AnalysisResult = {
    summary: '这是一个测试摘要',
    requirementDoc: '# 功能概述\n\n测试文档',
    annotatedCode: '// test\nconst a = 1;',
  };

  describe('validateAnalysisResult', () => {
    it('应成功校验完整的 AI 返回结果', () => {
      const result = validateAnalysisResult(validResult);
      expect(result).toEqual(validResult);
    });

    it('空 summary 应抛出错误', () => {
      expect(() => validateAnalysisResult({ ...validResult, summary: '' })).toThrow('summary 不能为空');
    });

    it('空 requirementDoc 应抛出错误', () => {
      expect(() => validateAnalysisResult({ ...validResult, requirementDoc: '' })).toThrow('requirementDoc 不能为空');
    });

    it('空 annotatedCode 应抛出错误', () => {
      expect(() => validateAnalysisResult({ ...validResult, annotatedCode: '' })).toThrow('annotatedCode 不能为空');
    });

    it('缺少字段应抛出错误', () => {
      expect(() => validateAnalysisResult({ summary: 'test' } as any)).toThrow();
    });

    it('非对象输入应抛出错误', () => {
      expect(() => validateAnalysisResult('not an object' as any)).toThrow();
    });
  });

  describe('tryRepairAnalysisResult', () => {
    it('应修复字段名不一致的结果', () => {
      const repaired = tryRepairAnalysisResult({
        Summary: '测试',
        requirement_doc: '# 文档',
        annotated_code: 'const x = 1;',
      });
      expect(repaired.summary).toBe('测试');
      expect(repaired.requirementDoc).toBe('# 文档');
      expect(repaired.annotatedCode).toBe('const x = 1;');
    });

    it('应修复中文字段名', () => {
      const repaired = tryRepairAnalysisResult({
        功能概括: '测试',
        需求文档: '# 文档',
        注释代码: 'const x = 1;',
      });
      expect(repaired.summary).toBe('测试');
      expect(repaired.requirementDoc).toBe('# 文档');
      expect(repaired.annotatedCode).toBe('const x = 1;');
    });

    it('无法修复时应返回空对象', () => {
      const repaired = tryRepairAnalysisResult({ unknown: 'field' });
      expect(repaired.summary).toBeUndefined();
      expect(repaired.requirementDoc).toBeUndefined();
      expect(repaired.annotatedCode).toBeUndefined();
    });
  });

  describe('validateAndRepairAnalysisResult', () => {
    it('直接校验成功时不应尝试修复', () => {
      const result = validateAndRepairAnalysisResult(validResult);
      expect(result).toEqual(validResult);
    });

    it('字段名不一致时应自动修复并校验', () => {
      const result = validateAndRepairAnalysisResult({
        summary: '测试',
        requirement_doc: '# 文档',
        annotated_code: 'const x = 1;',
      });
      expect(result.summary).toBe('测试');
      expect(result.requirementDoc).toBe('# 文档');
      expect(result.annotatedCode).toBe('const x = 1;');
    });

    it('完全无法修复时应抛出错误', () => {
      expect(() => validateAndRepairAnalysisResult({ unknown: 'field' })).toThrow();
    });
  });

  describe('validateModelConfig', () => {
    it('应成功校验有效配置', () => {
      const config = validateModelConfig({
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        apiKey: 'test-key',
      });
      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-1.5-flash');
    });

    it('空 apiKey 应抛出错误', () => {
      expect(() => validateModelConfig({
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        apiKey: '',
      })).toThrow('API Key 不能为空');
    });

    it('无效 provider 应抛出错误', () => {
      expect(() => validateModelConfig({
        provider: 'invalid' as any,
        model: 'test',
        apiKey: 'key',
      })).toThrow();
    });

    it('应支持自定义 baseUrl', () => {
      const config = validateModelConfig({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-test',
        baseUrl: 'https://custom.example.com/v1',
      });
      expect(config.baseUrl).toBe('https://custom.example.com/v1');
    });
  });
});
