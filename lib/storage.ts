/**
 * 第三轮新增：LocalStorage 持久化工具
 */

export interface HistoryItem {
  id: string;              // `hist_${Date.now()}`
  savedAt: string;         // 格式："2026-04-22 14:30"
  title: string;           // 自动提取：优先取代码中第一个类名/函数名，否则取原始代码前20字
  language: string;        // 编程语言
  originalCode: string;
  businessContext: string;
  oldRequirement: string;
  result: {
    summary: string;
    requirementDoc: string;
    annotatedCode: string;
  };
}

export interface HistoryStorage {
  version: 1;
  items: HistoryItem[];
}

const STORAGE_KEY = 'CODE2DOC_HISTORY_V1';
const MAX_HISTORY = 10;

/**
 * 自动生成标题
 */
export function generateTitle(code: string, language: string): string {
  if (!code) return '未命名分析';
  
  // 正则提取类名或函数名
  const nameMatch = code.match(/(class|interface|def|function)\s+(\w+)/);
  if (nameMatch && nameMatch[2]) {
    return nameMatch[2];
  }
  
  // 否则截取前20个字
  const trimmed = code.trim().slice(0, 20);
  return trimmed.length >= 20 ? `${trimmed}...` : trimmed || '脚本代码';
}

/**
 * 从存储中加载历史
 */
export function loadFromStorage(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw) as HistoryStorage;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return [];
    }
    
    return parsed.items;
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

/**
 * 保存到存储
 */
export function saveToStorage(item: HistoryItem): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = loadFromStorage();
    
    // 过滤掉相同 ID 的（理论上 ID 是时间戳，不会重复，但为了健壮性）
    const newItems = [item, ...history.filter(h => h.id !== item.id)];
    
    // 排序并在超出限制时移除最旧的
    // HistoryItem 保存时已按时间倒序排列 (最新在前)
    const finalized = newItems.slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      items: finalized
    }));
  } catch (error) {
    console.error('LocalStorage write failed:', error);
    throw new Error('本地存储空间不足，无法保存');
  }
}

/**
 * 从存储中删除
 */
export function removeFromStorage(id: string): void {
  if (typeof window === 'undefined') return;
  
  const history = loadFromStorage();
  const filtered = history.filter(h => h.id !== id);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1,
    items: filtered
  }));
}
