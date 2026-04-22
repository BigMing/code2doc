'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { List } from 'lucide-react';

interface DocPanelProps {
  content: string;
}

export function DocPanel({ content }: DocPanelProps) {
  // [第二轮新增] 提取标题生成目录
  const toc = useMemo(() => {
    const lines = content.split('\n');
    const headings = lines
      .filter(line => line.startsWith('## ') || line.startsWith('### '))
      .map(line => {
        const level = line.startsWith('### ') ? 3 : 2;
        const text = line.replace(/^#{2,3}\s+/, '').trim();
        // 简单处理 ID（与 rehype-slug 对齐，通常是大写变小写，空格变连字符）
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '');
        return { level, text, id };
      });
    return headings;
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 relative group">
      <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">需求文档 (RECOVERY)</h2>
        {toc.length > 0 && (
          <div className="relative group/toc">
            <button className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors">
              <List className="w-3 h-3" />
              目录
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded shadow-xl opacity-0 group-hover/toc:opacity-100 pointer-events-none group-hover/toc:pointer-events-auto transition-all z-30 p-2 max-h-80 overflow-auto custom-scrollbar">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1">快速跳转</p>
              <div className="space-y-1">
                {toc.map((item, i) => (
                  <a
                    key={i}
                    href={`#${item.id}`}
                    className={`block text-[11px] text-slate-600 hover:text-blue-600 truncate py-1 transition-colors ${item.level === 3 ? 'pl-4 border-l border-slate-100' : 'font-semibold'}`}
                  >
                    {item.text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-12 scroll-smooth custom-scrollbar relative">
        <div className="prose prose-slate max-w-none prose-headings:scroll-mt-20 prose-h1:text-3xl prose-h1:font-black prose-h1:text-slate-800 prose-h1:mb-8 prose-h2:text-xl prose-h2:font-bold prose-h2:border-b-2 prose-h2:border-slate-100 prose-h2:pb-3 prose-h2:mt-12 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeSlug]}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* 顶部悬浮目录（小磁贴） */}
        <div className="fixed bottom-12 right-[38%] z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">DOCS</span>
             <span className="h-4 w-px bg-slate-200" />
             <span className="text-[11px] font-bold text-slate-500">已生成分析报告</span>
          </div>
        </div>
      </div>
    </div>
  );
}
