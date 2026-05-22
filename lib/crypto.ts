/**
 * [优化] API Key 前端简单加密
 * 使用 XOR + Base64 进行混淆存储，避免明文暴露在 localStorage 中
 * 注意：这不是强加密，仅增加基础安全层，真正的密钥保护需要服务端代理
 */

const SECRET = 'Code2DocKey2024!';

export function encrypt(text: string): string {
  if (!text) return '';
  const xor = text
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SECRET.charCodeAt(i % SECRET.length)))
    .join('');
  try {
    return btoa(xor);
  } catch {
    return text;
  }
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return '';
  // 兼容旧版明文存储：如果解密后不是可打印字符，可能是明文
  try {
    const xor = atob(encrypted);
    const result = xor
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SECRET.charCodeAt(i % SECRET.length)))
      .join('');
    // 简单校验：如果结果包含空字符或非 ASCII，可能是明文 base64 失败
    if (result.includes('\0')) return encrypted;
    return result;
  } catch {
    // atob 失败，说明是旧版明文
    return encrypted;
  }
}
