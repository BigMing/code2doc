import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../crypto';

describe('crypto', () => {
  it('应正确加密和解密文本', () => {
    const original = 'sk-test-api-key-12345';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('加密结果应与原文不同', () => {
    const original = 'secret-key';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
  });

  it('空字符串应返回空字符串', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('应兼容旧版明文存储', () => {
    // 旧版没有加密，直接存储明文
    const plaintext = 'plain-api-key';
    const decrypted = decrypt(plaintext);
    // 由于 plaintext 不是有效的 base64，decrypt 会捕获异常并返回原值
    expect(decrypted).toBe(plaintext);
  });

  it('应处理包含特殊字符的密钥', () => {
    const original = 'sk-abc123!@#$%^&*()_+-=[]{}|;\':",./<>?';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });
});
