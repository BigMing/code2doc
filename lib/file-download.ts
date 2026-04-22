/**
 * 第三轮新增：文件下载工具
 */

export function downloadMarkdown(filename: string, content: string) {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 包装 Markdown 内容并添加 YAML Frontmatter
 */
export function wrapMarkdown(content: string, language: string): string {
  const now = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `---
title: 智能生成需求文档
generated_at: ${now}
source_language: ${language}
tool: Code2Doc
---

${content}`;
}
