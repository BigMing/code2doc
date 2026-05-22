'use client';

import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-8">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        应用发生错误
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center mb-6">
        抱歉，应用遇到了意外错误。您可以尝试刷新页面或重置应用状态。
      </p>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-w-lg w-full mb-6">
        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
          {error.message || 'Unknown error'}
        </p>
        {error.digest && (
          <p className="text-[10px] text-slate-400 mt-2">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors"
      >
        <RotateCw className="w-4 h-4" />
        重试
      </button>
    </div>
  );
}
