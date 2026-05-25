/**
 * [第五轮新增] 模型配置对话框
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PROVIDERS, getDefaultModel, getDefaultBaseUrl, allowCustomBaseUrl } from '@/lib/ai-config';
import { Settings, KeyRound, CheckCircle2, AlertTriangle, Zap, ZapOff } from 'lucide-react';
import { toast } from 'sonner';
import { getGlobalEnableStreaming, setGlobalEnableStreaming } from '@/lib/ai-client';

export function ModelConfigDialog() {
  const { modelConfig, setModelConfig } = useAppContext();
  const [open, setOpen] = useState(false);

  // 本地表单状态
  const [provider, setProvider] = useState(modelConfig.provider);
  const [model, setModel] = useState(modelConfig.model);
  const [apiKey, setApiKey] = useState(modelConfig.apiKey);
  const [baseUrl, setBaseUrl] = useState(modelConfig.baseUrl || '');
  const [enableStreaming, setEnableStreaming] = useState(getGlobalEnableStreaming());

  // 当外部 modelConfig 变化时同步（如从历史记录加载）
  useEffect(() => {
    setProvider(modelConfig.provider);
    setModel(modelConfig.model);
    setApiKey(modelConfig.apiKey);
    setBaseUrl(modelConfig.baseUrl || '');
    setEnableStreaming(getGlobalEnableStreaming());
  }, [modelConfig]);

  // provider 切换时，自动选择该 provider 的第一个模型和默认地址
  const handleProviderChange = (p: string) => {
    const newProvider = p as typeof modelConfig.provider;
    setProvider(newProvider);
    setModel(getDefaultModel(newProvider));
    const defaultUrl = getDefaultBaseUrl(newProvider);
    setBaseUrl(defaultUrl || '');
  };

  const currentProvider = PROVIDERS.find(p => p.id === provider);

  const handleSave = () => {
    // 仅对必须填写 Key 的提供商做校验（私有化模型允许空 Key）
    const needsKey = !['qwen-private'].includes(provider);
    if (needsKey && !apiKey.trim()) {
      toast.error('请填写 API Key');
      return;
    }
    // 对支持自定义地址的提供商，校验地址格式
    if (allowCustomBaseUrl(provider) && baseUrl.trim()) {
      try {
        new URL(baseUrl.trim());
      } catch {
        toast.error('API 地址格式不正确');
        return;
      }
    }
    setModelConfig({
      provider,
      model,
      apiKey: apiKey.trim(),
      baseUrl: allowCustomBaseUrl(provider) ? baseUrl.trim() || undefined : undefined,
    });
    setGlobalEnableStreaming(enableStreaming);
    toast.success('模型配置已保存');
    setOpen(false);
  };

  const hasKey = !!modelConfig.apiKey;

  // [修复] 避免 SSR/CSR 不一致导致的 hydration mismatch
  // localStorage 中的配置在 SSR 时无法读取，导致 hasKey 在服务端和客户端可能不同
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const displayHasKey = mounted ? hasKey : false;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-[11px] font-bold uppercase tracking-wider gap-1.5 ${
              displayHasKey
                ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            {displayHasKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            )}
            <Settings className="w-3.5 h-3.5" />
            模型配置
          </Button>
        }
      />

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-blue-50">
            <CpuIcon className="w-5 h-5 text-blue-500" />
          </AlertDialogMedia>
          <AlertDialogTitle>模型配置</AlertDialogTitle>
          <AlertDialogDescription>
            选择 AI 模型提供商并配置 API Key，所有分析请求将使用该配置。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* 提供商选择 */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              模型提供商
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full h-9 px-3 text-xs border border-slate-200 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {currentProvider && (
              <p className="text-[10px] text-slate-400">{currentProvider.description}</p>
            )}
          </div>

          {/* 模型选择 */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              具体模型
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-9 px-3 text-xs border border-slate-200 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
            >
              {currentProvider?.models.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" />
              API Key
              {provider === 'qwen-private' && (
                <span className="text-[9px] font-normal text-slate-400 normal-case tracking-normal">（可选）</span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentProvider?.keyPlaceholder || '请输入 API Key'}
              className="w-full h-9 px-3 text-xs border border-slate-200 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none font-mono"
            />
            {currentProvider && (
              <p className="text-[10px] text-slate-400">{currentProvider.keyHint}</p>
            )}
          </div>

          {/* 自定义 API 地址（私有化部署） */}
          {allowCustomBaseUrl(provider) && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                API 地址
                <span className="text-[9px] font-normal text-amber-500 normal-case tracking-normal">（私有化部署必填）</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={currentProvider?.defaultBaseUrl || 'http://localhost:8000/v1'}
                className="w-full h-9 px-3 text-xs border border-slate-200 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400">
                请输入兼容 OpenAI 格式的 API Base URL，需以 /v1 结尾
              </p>
            </div>
          )}

          {/* [新增] 流式输出开关 */}
          <div className="flex items-center justify-between bg-slate-50 rounded border border-slate-100 p-2.5">
            <div className="flex items-center gap-2">
              {enableStreaming ? (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <ZapOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <div>
                <p className="text-[11px] font-bold text-slate-600">流式输出</p>
                <p className="text-[10px] text-slate-400">
                  {enableStreaming ? '实时显示生成进度（推荐）' : '等待完整响应后一次性显示'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEnableStreaming(!enableStreaming)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                enableStreaming ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  enableStreaming ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 当前配置摘要 */}
          <div className="bg-slate-50 rounded border border-slate-100 p-2.5 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              当前已保存配置
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="font-medium">{currentProvider?.label}</span>
              <span className="text-slate-300">/</span>
              <span>{currentProvider?.models.find(m => m.value === model)?.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-400">Key:</span>
              <span className={displayHasKey ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {displayHasKey ? '已配置' : '未配置'}
              </span>
            </div>
            {modelConfig.baseUrl && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">地址:</span>
                <span className="text-blue-600 font-medium truncate max-w-[200px]">{modelConfig.baseUrl}</span>
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" size="sm" className="text-[11px] font-bold">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            className="text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
          >
            保存配置
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
    </svg>
  );
}
