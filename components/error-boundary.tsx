/**
 * [新增] React Error Boundary
 * 捕获子组件渲染错误，防止整个应用白屏
 */
'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                应用出现了错误
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                我们在渲染页面时遇到了意外错误。点击下方按钮重新加载应用。
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-left">
                <p className="text-xs font-mono text-red-500 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <Button onClick={this.handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              重新加载应用
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
