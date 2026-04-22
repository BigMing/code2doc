'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodePanelProps {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodePanel({ code, language, title = "补全注释代码 (Annotated)", showLineNumbers = true }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden border-r border-white/5 last:border-r-0">
      <div className="h-10 bg-[#252526] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">{title}</h2>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-tight">AI 增强补全</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <SyntaxHighlighter
          language={language.toLowerCase()}
          style={vscDarkPlus}
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
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
