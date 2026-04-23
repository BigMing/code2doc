'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Sparkles, FileCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from 'sonner';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import { useTypewriter } from '@/hooks/use-typewriter';
import { Skeleton } from '@/components/ui/skeleton';

interface CodePanelProps {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodePanel({ code, language, title = "补全注释代码", showLineNumbers = true }: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const { addLog, isStreaming, isTypewriting, fullCodeText, setTypewriting } = useAppContext();

  // 使用打字机 Hook (较文档稍快一些)
  const { displayText, isComplete } = useTypewriter(fullCodeText, isTypewriting, 5);

  // 当打字机完成时，通知 Context
  React.useEffect(() => {
    if (isTypewriting && isComplete) {
      setTypewriting(false);
      addLog('注释代码渲染完成', 'success');
    }
  }, [isTypewriting, isComplete, setTypewriting, addLog]);

  // 显示内容逻辑
  const displayCode = isTypewriting ? displayText : code;

  const handleCopy = async () => {
    const success = await copyToClipboard(displayCode);
    if (success) {
      setCopied(true);
      toast.success('代码已复制到剪贴板');
      addLog('已复制补全代码到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden border-r border-slate-200 last:border-r-0">
      <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-tight">
            <Sparkles className="w-2.5 h-2.5" />
            AI 增强
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!displayCode || isStreaming || isTypewriting}
            className="h-7 px-2 text-[10px] font-bold uppercase gap-1.5 border-slate-200 disabled:opacity-40"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制代码'}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30">
        {isStreaming && !displayCode && (
          <div className="p-6 space-y-4">
            <Skeleton className="h-4 w-1/3 bg-slate-100" />
            <Skeleton className="h-4 w-2/3 bg-slate-100" />
            <Skeleton className="h-4 w-1/2 bg-slate-100" />
            <Skeleton className="h-4 w-3/4 bg-slate-100" />
            <Skeleton className="h-4 w-1/4 bg-slate-100" />
            <p className="text-[10px] text-slate-400 italic text-center animate-pulse pt-10">正在准备增强代码输出...</p>
          </div>
        )}

        {(displayCode || (!isStreaming && code)) && (
          <div className="relative">
            <SyntaxHighlighter
              language={language.toLowerCase()}
              style={vs}
              showLineNumbers={showLineNumbers}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                fontSize: '13px',
                lineHeight: '1.6',
                backgroundColor: 'transparent',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'var(--font-mono)',
                }
              }}
            >
              {displayCode}
            </SyntaxHighlighter>
            {isTypewriting && (
              <div className="absolute bottom-4 left-6 text-blue-500 font-mono text-sm animate-pulse">▋</div>
            )}
          </div>
        )}

        {!isStreaming && !code && !isTypewriting && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
             <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                <FileCode className="w-8 h-8 text-slate-200" />
             </div>
             <p className="text-xs font-medium">尚未生成增强代码</p>
          </div>
        )}
      </div>
    </div>
  );
}
