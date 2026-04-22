/**
 * 第三轮新增：剪贴板写入工具
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    // 优先使用现代化 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 确保 textarea 不可见但可操作
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}
