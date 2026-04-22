'use client';

import React from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { LogPanel } from './log-panel';
import { InputPanel } from './input-panel';
import { DocPanel } from './doc-panel';
import { CodePanel } from './code-panel';
import { TopActionBar } from './top-action-bar';
import { useAppContext } from '@/lib/context';
import { Terminal, FileCode, CheckCircle2, Sparkles } from 'lucide-react';

export function WorkspaceLayout() {
  const { result, config } = useAppContext();

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <header className="h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#3B82F6] rounded flex items-center justify-center">
              <span className="text-white text-xs font-black">C2D</span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Code2Doc — 代码需求文档智能生成器</h1>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            系统就绪
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-2 py-1 rounded bg-slate-50 border border-slate-100 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Gemini 3 Flash Pro
            </span>
          </div>
        </div>
      </header>

      {/* [第三轮新增] 全局操作栏 */}
      <TopActionBar />

      {/* Dynamic Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal">
          {/* 左侧：日志 + 输入 (纵向拆分) */}
          <Panel defaultSize={25} minSize={15}>
            <PanelGroup orientation="vertical">
              <Panel defaultSize={35} minSize={20}>
                <LogPanel />
              </Panel>
              <PanelResizeHandle className="h-1 bg-slate-200 hover:bg-blue-400 transition-colors cursor-row-resize" />
              <Panel defaultSize={65} minSize={30}>
                <InputPanel />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

          {/* 中间：需求文档 */}
          <Panel defaultSize={37.5} minSize={20}>
            <div className="h-full bg-white transition-opacity">
              {result ? (
                <DocPanel content={result.requirementDoc} />
              ) : (
                <EmptyState icon={<FileCode className="w-10 h-10 text-slate-100" />} title="需求文档预览" description="在左侧输入代码并点击“生成需求文档”，分析结果将在此呈现" />
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-slate-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

          {/* 右侧：补全代码 */}
          <Panel defaultSize={37.5} minSize={20}>
            <div className="h-full bg-slate-50/20 transition-opacity">
              {result ? (
                <CodePanel code={result.annotatedCode} language={config.language} />
              ) : (
                <EmptyState icon={<CheckCircle2 className="w-10 h-10 text-slate-100" />} title="代码补全分析" description="AI 补全后的代码及规范化注释将在此对比展示" />
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <footer className="h-7 bg-white border-t border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-4 flex items-center gap-6 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>系统在线</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div>引擎: <span className="text-slate-600">Gemini 3 Flash Preview</span></div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="ml-auto flex items-center gap-4">
          <span className="text-slate-300">UTF-8</span>
          <span className="bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded leading-none border border-blue-100">就绪</span>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ icon, title, description, dark = false }: { icon: React.ReactNode, title: string, description: string, dark?: boolean }) {
  return (
    <div className={`h-full flex flex-col items-center justify-center p-12 text-center space-y-4 ${dark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
      <div className="animate-pulse">{icon}</div>
      <div className="space-y-1">
        <h3 className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-white/40' : 'text-slate-400'}`}>{title}</h3>
        <p className={`text-xs max-w-[240px] leading-relaxed mx-auto ${dark ? 'text-white/20' : 'text-slate-300'}`}>{description}</p>
      </div>
    </div>
  );
}
