'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { List, Download } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { downloadMarkdown, wrapMarkdown } from '@/lib/file-download';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTypewriter } from '@/hooks/use-typewriter';
import { Skeleton } from '@/components/ui/skeleton';

interface DocPanelProps {
  content: string;
}

export function DocPanel({ content }: DocPanelProps) {
  const { 
    config, addLog, 
    isStreaming, isTypewriting, fullDocText, setTypewriting 
  } = useAppContext();

  // 使用打字机 Hook
  const { displayText, isComplete } = useTypewriter(fullDocText, isTypewriting, 8);

  // 当打字机完成时，通知 Context
  React.useEffect(() => {
    if (isTypewriting && isComplete) {
      setTypewriting(false);
      addLog('需求文档渲染完成', 'success');
    }
  }, [isTypewriting, isComplete, setTypewriting, addLog]);

  // 显示内容逻辑
  const displayContent = isTypewriting ? displayText : content;

  // 导出文档
  const handleExport = () => {
    const wrapped = wrapMarkdown(content, config.language);
    const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '');
    const filename = `需求文档_${dateStr}.md`;
    
    downloadMarkdown(filename, wrapped);
    toast.success('文档下载已开始');
    addLog(`已导出需求文档：${filename}`, 'success');
  };

  // [优化] 使用 remark 插件提取 TOC，比正则更可靠
  const toc = useMemo(() => {
    const lines = content.split('\n');
    const headings = lines
      .filter(line => line.startsWith('## ') || line.startsWith('### '))
      .map(line => {
        const level = line.startsWith('### ') ? 3 : 2;
        const text = line.replace(/^#{2,3}\s+/, '').trim();
        // 与 rehype-slug 对齐
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '');
        return { level, text, id };
      });
    return headings;
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 relative group transition-colors">
      <div className="h-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">需求文档</h2>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!content || isStreaming || isTypewriting}
            className="h-7 px-2 text-[10px] font-bold uppercase gap-1.5 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 dark:text-slate-300"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            导出文档
          </Button>
          {(toc.length > 0 || isTypewriting) && (
          <div className="relative group/toc">
            <button className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <List className="w-3 h-3" />
              目录
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded shadow-xl opacity-0 group-hover/toc:opacity-100 pointer-events-none group-hover/toc:pointer-events-auto transition-all z-30 p-2 max-h-80 overflow-auto custom-scrollbar">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 dark:border-slate-700 pb-1">快速跳转</p>
              <div className="space-y-1">
                {toc.map((item, i) => (
                  <a
                    key={i}
                    href={`#${item.id}`}
                    className={`block text-[11px] text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate py-1 transition-colors ${item.level === 3 ? 'pl-4 border-l border-slate-100 dark:border-slate-700' : 'font-semibold'}`}
                  >
                    {item.text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      <div className="flex-1 overflow-auto p-12 scroll-smooth custom-scrollbar relative">
        {/* 流式过程中显示 Skeleton */}
        {isStreaming && !displayContent && (
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full bg-slate-50 dark:bg-slate-800" />
              <Skeleton className="h-4 w-5/6 bg-slate-50 dark:bg-slate-800" />
              <Skeleton className="h-4 w-4/5 bg-slate-50 dark:bg-slate-800" />
            </div>
            <Skeleton className="h-40 w-full rounded-xl bg-slate-50 dark:bg-slate-800" />
            <p className="text-[10px] text-slate-400 italic text-center animate-pulse mt-8">正在从 AI 接收响应数据...</p>
          </div>
        )}

        {/* 只有在有内容时才显示 prose */}
        {(displayContent || (!isStreaming && content)) && (
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h1:text-3xl prose-h1:font-black prose-h1:text-slate-800 dark:prose-h1:text-slate-100 prose-h1:mb-8 prose-h2:text-xl prose-h2:font-bold prose-h2:border-b-2 prose-h2:border-slate-100 dark:prose-h2:border-slate-700 prose-h2:pb-3 prose-h2:mt-12 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeSlug, rehypeHighlight]}
            >
              {displayContent}
            </ReactMarkdown>
            {isTypewriting && (
              <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 animate-pulse" title="正在输入...">▋</span>
            )}
          </div>
        )}

        {!isStreaming && !content && !isTypewriting && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4">
             <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                <List className="w-8 h-8 text-slate-200 dark:text-slate-600" />
             </div>
             <p className="text-xs font-medium">尚未生成文档</p>
          </div>
        )}

        {/* 顶部悬浮状态 */}
        {(displayContent && !isStreaming) && (
          <div className="fixed bottom-12 right-[38%] z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-600 rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
               <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase">Docs</span>
               <span className="h-4 w-px bg-slate-200 dark:bg-slate-600" />
               <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                 {isTypewriting ? 'AI 正在书写文档...' : '需求文档就绪'}
               </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
