'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { LogPanel } from './log-panel';
import { InputPanel } from './input-panel';
import { DocPanel } from './doc-panel';
import { CodePanel } from './code-panel';
import { DiffPanel } from './diff-panel';
import { TopActionBar } from './top-action-bar';
import { OnboardingTour } from './onboarding-tour';
import { ZenModeToggle } from './zen-mode-toggle';
import { ErrorBoundary } from './error-boundary';
import { useAppContext } from '@/lib/context';
import { FileCode, CheckCircle2, GitCompare, Sun, Moon, Code2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from './logo';
import { getProviderLabel, getModelLabel } from '@/lib/ai-config';

type RightTab = 'code' | 'diff';

export function WorkspaceLayout() {
  const { result, config, modelConfig, rawCode, isZenMode, setZenMode } = useAppContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [rightTab, setRightTab] = useState<RightTab>('code');

  // [修复] hydration mismatch
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans transition-colors">
        <OnboardingTour />

        {/* Top Navigation — 专注模式下隐藏 */}
        {!isZenMode && (
          <header className="h-14 bg-white dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-slate-700 px-6 flex items-center justify-between z-20 shrink-0 shadow-sm transition-colors">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <Logo size={32} />
                <h1 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  Code2Doc — 代码需求文档智能生成器
                </h1>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-600" />
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                系统就绪
              </div>
            </div>

            {/* 中间作者信息 */}
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border border-blue-100/60 dark:border-blue-800/40 flex items-center gap-2 shadow-sm">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 tracking-wide">
                  忙里偷闲
                </span>
                <span className="text-[10px] text-blue-300 dark:text-blue-600">·</span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  技术服务中心
                </span>
                <span className="text-[10px] text-blue-300 dark:text-blue-600">·</span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400">
                  孙佳明、胡飞、陈庆
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 专注模式切换 */}
              <ZenModeToggle isZenMode={isZenMode} onToggle={() => setZenMode(!isZenMode)} />

              {/* 暗色模式切换 */}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                title={resolvedTheme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
              >
                {mounted && resolvedTheme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              <div className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">
                  {mounted ? `${getProviderLabel(modelConfig.provider)} · ${getModelLabel(modelConfig.provider, modelConfig.model)}` : '加载中...'}
                </span>
              </div>
            </div>
          </header>
        )}

        {/* 全局操作栏 — 专注模式下隐藏 */}
        {!isZenMode && <TopActionBar />}

        {/* Dynamic Panels */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup orientation="horizontal">
            {/* 左侧：日志 + 输入 (纵向拆分) — 专注模式下隐藏日志 */}
            <Panel defaultSize={25} minSize={15}>
              <PanelGroup orientation="vertical">
                {!isZenMode && (
                  <>
                    <Panel defaultSize={55} minSize={25}>
                      <LogPanel />
                    </Panel>
                    <PanelResizeHandle className="h-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-row-resize" />
                  </>
                )}
                <Panel defaultSize={isZenMode ? 100 : 45} minSize={25}>
                  <InputPanel />
                </Panel>
              </PanelGroup>
            </Panel>

            <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />

            {/* 中间：需求文档 */}
            <Panel defaultSize={37.5} minSize={20}>
              <div className="h-full bg-white dark:bg-slate-800 transition-colors">
                {result ? (
                  <DocPanel content={result.requirementDoc} />
                ) : (
                  <EmptyState 
                    icon={<FileCode className="w-10 h-10 text-slate-100 dark:text-slate-700" />} 
                    title="需求文档预览" 
                    description="在左侧输入代码并点击“生成需求文档”，分析结果将在此呈现" 
                  />
                )}
              </div>
            </Panel>

            <PanelResizeHandle className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />

            {/* 右侧：代码 / Diff 切换 */}
            <Panel defaultSize={37.5} minSize={20}>
              <div className="h-full bg-slate-50/20 dark:bg-slate-900/50 transition-colors flex flex-col">
                {result ? (
                  <>
                    {/* Tab 切换栏 */}
                    <div className="h-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 shrink-0 gap-1">
                      <button
                        onClick={() => setRightTab('code')}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          rightTab === 'code'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        注释代码
                      </button>
                      <button
                        onClick={() => setRightTab('diff')}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          rightTab === 'diff'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        <GitCompare className="w-3 h-3" />
                        Diff 对比
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {rightTab === 'code' ? (
                        <CodePanel code={result.annotatedCode} language={config.language} />
                      ) : (
                        <DiffPanel oldCode={rawCode} newCode={result.annotatedCode} language={config.language} />
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState 
                    icon={<CheckCircle2 className="w-10 h-10 text-slate-100 dark:text-slate-700" />} 
                    title="代码补全分析" 
                    description="AI 补全后的代码及规范化注释将在此对比展示" 
                  />
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {/* Status Bar — 专注模式下隐藏 */}
        {!isZenMode && (
          <footer className="h-7 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest px-4 flex items-center gap-6 shrink-0 z-20 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>系统在线</span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-600" />
            <div>引擎: <span className="text-slate-600 dark:text-slate-300">{mounted ? `${getProviderLabel(modelConfig.provider)} · ${getModelLabel(modelConfig.provider, modelConfig.model)}` : '加载中...'}</span></div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-600" />
            <div className="ml-auto flex items-center gap-4">
              <span className="text-slate-300 dark:text-slate-600">UTF-8</span>
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded leading-none border border-blue-100 dark:border-blue-800">就绪</span>
            </div>
          </footer>
        )}
      </div>
    </ErrorBoundary>
  );
}

function EmptyState({ icon, title, description, dark = false }: { icon: React.ReactNode, title: string, description: string, dark?: boolean }) {
  return (
    <div className={`h-full flex flex-col items-center justify-center p-12 text-center space-y-4 ${dark ? 'bg-[#1e1e1e]' : 'bg-white dark:bg-slate-800'}`}>
      <div className="animate-pulse">{icon}</div>
      <div className="space-y-1">
        <h3 className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-white/40' : 'text-slate-400 dark:text-slate-500'}`}>{title}</h3>
        <p className={`text-xs max-w-[240px] leading-relaxed mx-auto ${dark ? 'text-white/20' : 'text-slate-300 dark:text-slate-600'}`}>{description}</p>
      </div>
    </div>
  );
}
