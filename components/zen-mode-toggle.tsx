'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface ZenModeToggleProps {
  isZenMode: boolean;
  onToggle: () => void;
}

export function ZenModeToggle({ isZenMode, onToggle }: ZenModeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-[11px] font-bold uppercase tracking-wider gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      onClick={onToggle}
      title={isZenMode ? '退出专注模式' : '进入专注模式'}
    >
      {isZenMode ? (
        <>
          <PanelLeftOpen className="w-3.5 h-3.5" />
          <span>退出专注</span>
        </>
      ) : (
        <>
          <PanelLeftClose className="w-3.5 h-3.5" />
          <span>专注模式</span>
        </>
      )}
    </Button>
  );
}
