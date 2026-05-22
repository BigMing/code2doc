'use client';

import React, { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { GitCompare, Split, AlignJustify, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface DiffPanelProps {
  oldCode: string;
  newCode: string;
  language?: string;
}

export function DiffPanel({ oldCode, newCode, language = 'java' }: DiffPanelProps) {
  const [splitView, setSplitView] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyNewCode = async () => {
    const success = await copyToClipboard(newCode);
    if (success) {
      setCopied(true);
      toast.success('代码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden border-r border-slate-200 last:border-r-0">
      <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <GitCompare className="w-3.5 h-3.5" />
          Diff 对比
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSplitView(!splitView)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            title={splitView ? '切换为内联视图' : '切换为分栏视图'}
          >
            {splitView ? <Split className="w-3 h-3" /> : <AlignJustify className="w-3 h-3" />}
            {splitView ? '分栏' : '内联'}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyNewCode}
            className="h-7 px-2 text-[10px] font-bold uppercase gap-1.5 border-slate-200"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制新代码'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <ReactDiffViewer
          oldValue={oldCode}
          newValue={newCode}
          splitView={splitView}
          showDiffOnly={false}
          leftTitle="原始代码"
          rightTitle="AI 注释代码"
          styles={{
            diffContainer: {
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: 'var(--font-mono)',
            },
            gutter: {
              minWidth: '40px',
              padding: '0 8px',
            },
            marker: {
              width: '20px',
            },
            wordDiff: {
              padding: '1px 3px',
              borderRadius: '2px',
            },
          }}
          codeFoldMessageRenderer={(totalFoldedLines: number) => (
            <span className="text-[10px] text-slate-400 italic">
              展开 {totalFoldedLines} 行相同代码...
            </span>
          )}
        />
      </div>
    </div>
  );
}
