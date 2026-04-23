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
import { PROVIDERS, getDefaultModel } from '@/lib/ai-config';
import { Settings, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function ModelConfigDialog() {
  const { modelConfig, setModelConfig } = useAppContext();
  const [open, setOpen] = useState(false);

  // 本地表单状态
  const [provider, setProvider] = useState(modelConfig.provider);
  const [model, setModel] = useState(modelConfig.model);
  const [apiKey, setApiKey] = useState(modelConfig.apiKey);

  // 当外部 modelConfig 变化时同步（如从历史记录加载）
  useEffect(() => {
    setProvider(modelConfig.provider);
    setModel(modelConfig.model);
    setApiKey(modelConfig.apiKey);
  }, [modelConfig]);

  // provider 切换时，自动选择该 provider 的第一个模型
  const handleProviderChange = (p: string) => {
    setProvider(p as typeof modelConfig.provider);
    setModel(getDefaultModel(p as typeof modelConfig.provider));
  };

  const currentProvider = PROVIDERS.find(p => p.id === provider);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('请填写 API Key');
      return;
    }
    setModelConfig({
      provider,
      model,
      apiKey: apiKey.trim(),
    });
    toast.success('模型配置已保存');
    setOpen(false);
  };

  const hasKey = !!modelConfig.apiKey;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-[11px] font-bold uppercase tracking-wider gap-1.5 ${
              hasKey
                ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            {hasKey ? (
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
              <span className={hasKey ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {hasKey ? '已配置' : '未配置'}
              </span>
            </div>
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
