'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { truncateJsonStrings } from '@/lib/json-truncate';
import { Terminal, Activity, Code2, Copy, Check, Clock, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export function LogPanel() {
  const { logs, parseSummary, rawRequest, rawResponse, activeLogTab, jsonViewTab } = useAppContext() as any; // Using any for brevity or I'll define local state if needed
  // Note: The context I updated has these, but let's manage internal layout tabs here
  const [localTab, setLocalTab] = useState<'summary' | 'json'>('summary');
  const [localJsonTab, setLocalJsonTab] = useState<'request' | 'response'>('request');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const data = localJsonTab === 'request' ? rawRequest : rawResponse;
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Info className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] border-b border-slate-200">
      {/* 头部面板 */}
      <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">工作日志 (Logs)</h2>
        </div>
        <div className="flex bg-slate-200 p-0.5 rounded-md">
          <button
            onClick={() => setLocalTab('summary')}
            className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${localTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            摘要
          </button>
          <button
            onClick={() => setLocalTab('json')}
            className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${localTab === 'json' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            原始JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 pt-2">
        {localTab === 'summary' ? (
          <div className="flex flex-col h-full gap-3">
            {/* 时间线 */}
            <div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200 p-3 custom-scrollbar">
              <div className="space-y-2.5">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                    暂无日志，等待分析启动...
                  </div>
                ) : (
                  logs.map((log: any) => (
                    <div key={log.id} className="flex gap-2.5 items-start">
                      <div className="mt-0.5 shrink-0">{getLogIcon(log.type)}</div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-400 leading-none mb-0.5">{log.timestamp}</span>
                        <p className="text-xs text-slate-700 leading-tight">{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 摘要卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 shrink-0">
              <SummaryCard label="识别方法" value={parseSummary?.methodCount || 0} unit="个" icon={<Activity className="w-3 h-3" />} />
              <SummaryCard label="识别类/模块" value={parseSummary?.classCount || 0} unit="个" icon={<Code2 className="w-3 h-3" />} />
              <SummaryCard label="文档章节" value={parseSummary?.docSections || 0} unit="节" icon={<Activity className="w-3 h-3" />} />
              <SummaryCard label="业务规则" value={parseSummary?.detectedRules || 0} unit="项" icon={<Activity className="w-3 h-3" />} />
              <SummaryCard label="原始代码" value={parseSummary?.codeLines || 0} unit="行" icon={<Clock className="w-3 h-3" />} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg border border-slate-800 overflow-hidden">
            <div className="h-9 bg-[#252526] border-b border-white/5 px-3 flex items-center justify-between">
              <div className="flex gap-3">
                <button 
                  onClick={() => setLocalJsonTab('request')}
                  className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${localJsonTab === 'request' ? 'text-blue-400 border-b border-blue-400' : 'text-white/40 hover:text-white/60'}`}
                >
                  原始请求
                </button>
                <button 
                  onClick={() => setLocalJsonTab('response')}
                  className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${localJsonTab === 'response' ? 'text-blue-400 border-b border-blue-400' : 'text-white/40 hover:text-white/60'}`}
                >
                  原始响应
                </button>
              </div>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-white/80"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制完整内容' : '复制完整 JSON'}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-emerald-400/80 custom-scrollbar leading-relaxed">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(truncateJsonStrings(localJsonTab === 'request' ? rawRequest : rawResponse), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, unit, icon }: { label: string, value: number, unit: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-md p-2 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-black text-slate-800">{value}</span>
        <span className="text-[9px] font-bold text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
