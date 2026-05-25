import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTitle, saveToStorage, loadFromStorage, removeFromStorage } from '../storage';
import type { HistoryItem } from '../storage';

// mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// 设置 window 对象，使 saveToLocal 中的 typeof window !== 'undefined' 为真
Object.defineProperty(global, 'window', {
  value: global,
  writable: true,
});

// mock server-storage module
vi.mock('../server-storage', () => ({
  apiSave: vi.fn().mockResolvedValue(undefined),
  apiLoad: vi.fn().mockResolvedValue(null),
  apiRemove: vi.fn().mockResolvedValue(undefined),
}));

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('generateTitle', () => {
    it('应优先提取类名', () => {
      const code = 'public class UserService { }';
      const title = generateTitle(code, 'java');
      expect(title).toContain('UserService');
    });

    it('应提取函数名', () => {
      const code = 'function calculateTotal() { }';
      const title = generateTitle(code, 'javascript');
      expect(title).toContain('calculateTotal');
    });

    it('无类名/函数名时应截取前 20 字', () => {
      const code = 'const x = 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10';
      const title = generateTitle(code, 'javascript');;
      expect(title.length).toBeLessThanOrEqual(25);
    });

    it('空代码应返回默认标题', () => {
      const title = generateTitle('', 'java');
      expect(title).toContain('未命名');
    });
  });

  describe('saveToStorage / loadFromStorage / removeFromStorage', () => {
    it('应保存并读取历史记录', async () => {
      const item: HistoryItem = {
        id: 'test_1',
        savedAt: '2024-01-01 12:00',
        title: '测试',
        language: 'java',
        originalCode: 'code',
        businessContext: '',
        oldRequirement: '',
        result: {
          summary: 's',
          requirementDoc: 'd',
          annotatedCode: 'c',
        },
      };

      await saveToStorage(item);
      const items = await loadFromStorage();
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('测试');
    });

    it('应限制最多 10 条记录', async () => {
      for (let i = 0; i < 12; i++) {
        await saveToStorage({
          id: `test_${i}`,
          savedAt: `2024-01-01 12:${i.toString().padStart(2, '0')}`,
          title: `测试${i}`,
          language: 'java',
          originalCode: 'code',
          businessContext: '',
          oldRequirement: '',
          result: { summary: 's', requirementDoc: 'd', annotatedCode: 'c' },
        });
      }
      const items = await loadFromStorage();
      expect(items.length).toBe(10);
    });

    it('应删除指定记录', async () => {
      await saveToStorage({
        id: 'del_1',
        savedAt: '2024-01-01',
        title: '待删除',
        language: 'java',
        originalCode: 'code',
        businessContext: '',
        oldRequirement: '',
        result: { summary: 's', requirementDoc: 'd', annotatedCode: 'c' },
      });

      await removeFromStorage('del_1');
      const items = await loadFromStorage();
      expect(items.find(i => i.id === 'del_1')).toBeUndefined();
    });
  });
});
