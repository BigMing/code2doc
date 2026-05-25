/**
 * 第三轮新增：历史记录下拉面板
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Trash2, 
  Clock, 
  Code2, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Search,
  X
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HistoryItem, loadFromStorage, removeFromStorage } from '@/lib/storage';
import { useAppContext } from '@/lib/context';

export function HistoryPopover() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { loadHistoryItem, addLog } = useAppContext();

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.language.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      const data = await loadFromStorage();
      setItems(data);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFromStorage(id);
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success('已删除历史记录');
    addLog('已从本地存储移除一条历史记录', 'info');
  };

  const handleSelect = (item: HistoryItem) => {
    loadHistoryItem(item);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger 
        render={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 border-slate-200">
            <History className="w-3.5 h-3.5" />
            历史记录
            <span className="ml-1 text-[10px] text-slate-400">▼</span>
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0 shadow-2xl border-slate-200" align="start">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            最近分析历史
          </h3>
          {/* [新增] 搜索框 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索标题或语言..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <History className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">暂无保存的分析记录</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredItems.map((item) => (
                <div 
                  key={item.id}
                  className="group relative hover:bg-slate-50 transition-colors"
                >
                  {/* 主要触发器：加载历史 */}
                  <AlertDialog>
                    <AlertDialogTrigger 
                      render={
                        <button className="w-full text-left p-3 outline-none focus:bg-slate-50">
                          <div className="space-y-2 pr-8">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-slate-700 truncate block flex-1">
                                {item.title}
                              </span>
                              <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-blue-50 text-blue-600 border-blue-100 shrink-0">
                                {item.language}
                              </Badge>
                            </div>
                            <div className="flex items-center">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.savedAt.split(' ')[0].substring(5)} {item.savedAt.split(' ')[1]}
                              </span>
                            </div>
                          </div>
                        </button>
                      }
                    />
                    
                    <AlertDialogContent className="max-w-md border-slate-200 shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-slate-800">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          加载历史记录
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                          加载后将覆盖当前工作区的所有内容（包括代码、配置及分析结果），是否确认继续？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="h-9 text-xs font-bold uppercase border-slate-200">取消</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleSelect(item)}
                          className="h-9 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700"
                        >
                          确认加载
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* 独立操作：删除记录 (位于触发器外，避免嵌套按钮) */}
                  <div className="absolute right-3 bottom-3 z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      onClick={(e) => handleDelete(item.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
