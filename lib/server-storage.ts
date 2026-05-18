/**
 * [Docker 部署新增] 服务端文件存储前端调用封装
 * 在 Docker 部署模式下，数据通过 API 持久化到服务器文件系统
 */

const API_BASE = '/api/data';

export async function apiSave(key: string, value: any): Promise<void> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed: ${res.status}`);
  }
}

export async function apiLoad(key: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value;
  } catch {
    return null;
  }
}

export async function apiRemove(key: string): Promise<void> {
  await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
}
