/**
 * [Docker 部署适配] 支持 localStorage + 服务端文件存储双写
 * Docker 环境下通过 /api/data 将数据持久化到挂载卷
 */

import { apiSave, apiLoad, apiRemove } from './server-storage';

export interface HistoryItem {
  id: string;
  savedAt: string;
  title: string;
  language: string;
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

function loadFromLocal(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryStorage;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    return [];
  }
}

function saveToLocal(items: HistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
  } catch {
    // ignore
  }
}

export function generateTitle(code: string, language: string): string {
  if (!code) return '未命名分析';
  const nameMatch = code.match(/(class|interface|def|function)\s+(\w+)/);
  if (nameMatch && nameMatch[2]) return nameMatch[2];
  const trimmed = code.trim().slice(0, 20);
  return trimmed.length >= 20 ? `${trimmed}...` : trimmed || '脚本代码';
}

export async function loadFromStorage(): Promise<HistoryItem[]> {
  // 优先从服务端加载（Docker 持久化）
  try {
    const serverData = await apiLoad(STORAGE_KEY);
    if (serverData && Array.isArray(serverData)) {
      return serverData;
    }
  } catch {
    // 回退到 localStorage
  }
  return loadFromLocal();
}

export async function saveToStorage(item: HistoryItem): Promise<void> {
  const history = await loadFromStorage();
  const newItems = [item, ...history.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY);

  // 双写：localStorage + 服务端
  saveToLocal(newItems);
  try {
    await apiSave(STORAGE_KEY, newItems);
  } catch {
    // 服务端存储失败不影响本地体验
  }
}

export async function removeFromStorage(id: string): Promise<void> {
  const history = await loadFromStorage();
  const filtered = history.filter(h => h.id !== id);

  saveToLocal(filtered);
  try {
    await apiSave(STORAGE_KEY, filtered);
  } catch {
    // ignore
  }
}
