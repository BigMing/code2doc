/**
 * 第三轮新增：顶部全局操作栏
 */
'use client';

import React from 'react';
import { 
  Save, 
  RotateCw, 
  Database
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppContext } from '@/lib/context';
import { generateTitle, saveToStorage } from '@/lib/storage';
import { HistoryPopover } from './history-popover';

export function TopActionBar() {
  const { 
    result, rawCode, config, isAnalyzing, 
    addLog, clearRawData 
  } = useAppContext();

  const handleSave = () => {
    if (!result) return;
    
    try {
      const title = generateTitle(rawCode, config.language);
      const now = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      saveToStorage({
        id: `hist_${Date.now()}`,
        savedAt: now,
        title,
        language: config.language,
        originalCode: rawCode,
        businessContext: config.businessBackground || '',
        oldRequirement: config.oldRequirements || '',
        result: result
      });

      toast.success('分析结果已保存');
      addLog(`分析结果已保存到本地（标题：${title}）`, 'success');
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    }
  };

  return (
    <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* 左侧：持久化操作 */}
      <div className="flex items-center gap-2">
        <Button 
          variant="secondary" 
          size="sm" 
          disabled={!result || isAnalyzing}
          onClick={handleSave}
          className="h-8 text-[11px] font-bold uppercase tracking-wider gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40"
          title={!result ? "请先生成分析结果" : ""}
        >
          <Save className="w-3.5 h-3.5" />
          💾 保存分析
        </Button>
        <HistoryPopover />
      </div>

      <div className="h-4 w-px bg-slate-200 mx-2" />

      {/* 右侧：导出与重操作 */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="hidden lg:flex items-center gap-2 mr-4">
           <Database className="w-3.5 h-3.5 text-slate-300" />
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             本地存储分析就绪
           </span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-[11px] font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 gap-1.5"
          onClick={() => window.location.reload()} // 简单的重置方案
        >
          <RotateCw className="w-3.5 h-3.5" />
          🔄 重新分析
        </Button>
      </div>
    </div>
  );
}
