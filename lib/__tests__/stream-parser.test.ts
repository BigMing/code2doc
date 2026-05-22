import { describe, it, expect } from 'vitest';
import { extractJsonFromStream, extractPartialJson } from '../stream-parser';
import type { AnalysisResult } from '../types';

describe('stream-parser', () => {
  const validResult: AnalysisResult = {
    summary: '测试摘要',
    requirementDoc: '# 功能概述\n\n这是一个测试。',
    annotatedCode: '// test\nconst a = 1;',
  };

  describe('extractJsonFromStream', () => {
    it('应直接解析纯净的 JSON 字符串', () => {
      const text = JSON.stringify(validResult);
      const result = extractJsonFromStream(text);
      expect(result).toEqual(validResult);
    });

    it('应解析被 Markdown 代码块包裹的 JSON', () => {
      const text = '```json\n' + JSON.stringify(validResult) + '\n```';
      const result = extractJsonFromStream(text);
      expect(result).toEqual(validResult);
    });

    it('应解析被无语言标识代码块包裹的 JSON', () => {
      const text = '```\n' + JSON.stringify(validResult) + '\n```';
      const result = extractJsonFromStream(text);
      expect(result).toEqual(validResult);
    });

    it('应从混合文本中提取 JSON', () => {
      const text = '这里有一些前置文本\n' + JSON.stringify(validResult) + '\n这是后续文本';
      const result = extractJsonFromStream(text);
      expect(result).toEqual(validResult);
    });

    it('应处理嵌套大括号的情况', () => {
      const nested = {
        summary: '测试',
        requirementDoc: '{"nested": true}',
        annotatedCode: 'function test() { return {a: 1}; }',
      };
      const text = JSON.stringify(nested);
      const result = extractJsonFromStream(text);
      expect(result).toEqual(nested);
    });

    it('当找不到有效 JSON 时应抛出错误', () => {
      expect(() => extractJsonFromStream('这不是 JSON')).toThrow('未在响应中找到有效的 JSON 结构');
    });

    it('当 JSON 损坏时应抛出错误', () => {
      expect(() => extractJsonFromStream('{ broken: json }')).toThrow('模型返回的 JSON 结构损坏');
    });
  });

  describe('extractPartialJson', () => {
    it('应返回解析成功的结果', () => {
      const text = JSON.stringify(validResult);
      const result = extractPartialJson(text);
      expect(result).toEqual(validResult);
    });

    it('无效文本应返回 null', () => {
      const result = extractPartialJson('不是 JSON');
      expect(result).toBeNull();
    });
  });
});
