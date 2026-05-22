import { describe, it, expect } from 'vitest';
import { calculateSummary } from '../summary';

describe('summary', () => {
  const rawCode = `public class UserService {
    public User getUser(Long id) {
      return repository.findById(id);
    }
    public void updateUser(User user) {
      repository.save(user);
    }
  }`;

  const annotatedCode = `/**
 * 用户服务类
 */
public class UserService {
    /**
     * 根据ID获取用户
     */
    public User getUser(Long id) {
      return repository.findById(id);
    }
    /**
     * 更新用户信息
     */
    public void updateUser(User user) {
      repository.save(user);
    }
}`;

  const doc = `# 功能概述
## 模块职责
## 输入参数
## 输出参数
## 业务流程
## 关键逻辑说明
## 异常处理
`;

  it('应正确计算方法数', () => {
    const summary = calculateSummary(annotatedCode, doc, rawCode);
    expect(summary.methodCount).toBeGreaterThanOrEqual(2);
  });

  it('应正确计算类数', () => {
    const summary = calculateSummary(annotatedCode, doc, rawCode);
    expect(summary.classCount).toBeGreaterThanOrEqual(1);
  });

  it('应正确计算文档章节数', () => {
    const summary = calculateSummary(annotatedCode, doc, rawCode);
    expect(summary.docSections).toBeGreaterThanOrEqual(6);
  });

  it('应正确计算原始代码行数', () => {
    const summary = calculateSummary(annotatedCode, doc, rawCode);
    expect(summary.codeLines).toBe(rawCode.split('\n').length);
  });

  it('对空输入应返回零值', () => {
    const summary = calculateSummary('', '', '');
    expect(summary.methodCount).toBe(0);
    expect(summary.classCount).toBe(0);
    expect(summary.docSections).toBe(0);
    expect(summary.detectedRules).toBe(0);
    expect(summary.codeLines).toBe(1); // '' split by \n gives ['']
  });
});
