'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { analyzeCode, detectLanguage } from '@/lib/gemini';
import { AiParseSummary } from '@/lib/types';
import { calculateSummary } from '@/lib/summary';
import { 
  FileCode, 
  ChevronDown, 
  ChevronRight, 
  Briefcase, 
  FileText, 
  Wand2, 
  RotateCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = [
  { value: 'auto', label: '自动识别 (AI)' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'go', label: 'Go' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
];

export function InputPanel() {
  const { 
    rawCode, setRawCode, 
    config, setConfig, 
    setResult, 
    isAnalyzing, setIsAnalyzing,
    addLog, setParseSummary,
    setRawRequest, setRawResponse
  } = useAppContext();

  const [expanded, setExpanded] = useState({ context: false, old: false });
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // 自动识别语言
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (rawCode && rawCode.length > 20 && config.language === 'auto') {
        handleDetectLanguage(rawCode);
      }
    }, 1000); // 防抖
    return () => clearTimeout(timer);
  }, [rawCode, config.language]);

  const handleDetectLanguage = async (code: string) => {
    if (!code || code.length < 20 || config.language !== 'auto') return;
    
    setIsDetecting(true);
    try {
      const language = await detectLanguage(code);
      if (language) {
        setConfig({ ...config, language });
        addLog(`自动识别语言：${language}`, 'info');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerate = async () => {
    if (!rawCode || rawCode.length < 50) {
      setError('请输入至少 50 个字符的代码以供分析。');
      addLog('分析中段：代码长度不足 50 字符', 'warning');
      return;
    }

    let finalLanguage = config.language;
    if (finalLanguage === 'auto') {
      setIsDetecting(true);
      addLog('正在自动识别编程语言...', 'info');
      finalLanguage = await detectLanguage(rawCode);
      setConfig({ ...config, language: finalLanguage });
      setIsDetecting(false);
    }

    setError(null);
    setIsAnalyzing(true);
    addLog(`开始分析代码，目标语言：${finalLanguage}`, 'info');

    try {
      addLog(`Prompt 组装完成，代码长度：${rawCode.length} 字符`, 'info');
      addLog('正在调用 Gemini 模型...', 'info');
      
      const startTime = Date.now();
      const gResult = await analyzeCode(rawCode, { ...config, language: finalLanguage }, (req, res) => {
        setRawRequest(req);
        setRawResponse(res);
      });
      const endTime = Date.now();
      
      addLog(`AI 响应接收成功，耗时 ${((endTime - startTime)/1000).toFixed(1)} 秒`, 'success');
      setResult(gResult);
      
      const summary = calculateSummary(gResult.annotatedCode, gResult.requirementDoc, rawCode);
      setParseSummary(summary);
      addLog(`解析完成，识别到 ${summary.methodCount} 个方法、${summary.detectedRules} 条业务规则`, 'success');
      addLog('文档与代码渲染完成', 'success');
    } catch (err: any) {
      setError(err.message || '分析过程中发生错误，请重试。');
      addLog(`错误：${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc]">
      <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5" />
          原始代码 (Source)
        </h2>
        <div className="flex items-center gap-2">
          {isDetecting && <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />}
          <select
            value={config.language}
            onChange={(e) => setConfig({ ...config, language: e.target.value })}
            className="bg-transparent border-none text-[10px] font-bold text-blue-600 outline-none cursor-pointer uppercase tracking-tight"
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        {/* 代码编辑器 */}
        <div className="relative group">
          <textarea
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            placeholder="// 请在此粘贴业务功能源代码..."
            className="w-full h-80 p-4 font-mono text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none resize-none bg-white transition-shadow text-slate-600 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* 业务背景 - 折叠 */}
        <div className="border border-slate-200 rounded overflow-hidden bg-white">
          <button 
            onClick={() => setExpanded({...expanded, context: !expanded.context})}
            className="w-full h-8 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 hover:bg-slate-50 uppercase tracking-wider transition-colors"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-3 h-3 text-slate-400" />
              业务背景说明 (可选)
            </div>
            {expanded.context ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expanded.context && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <textarea
                  value={config.businessBackground || ''}
                  onChange={(e) => setConfig({...config, businessBackground: e.target.value})}
                  placeholder="简述业务逻辑，帮助 AI 更好理解意图..."
                  className="w-full h-24 p-3 text-xs border-t border-slate-100 focus:ring-0 outline-none resize-none text-slate-600"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 旧需求文档 - 折叠 */}
        <div className="border border-slate-200 rounded overflow-hidden bg-white">
          <button 
            onClick={() => setExpanded({...expanded, old: !expanded.old})}
            className="w-full h-8 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 hover:bg-slate-50 uppercase tracking-wider transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3 text-slate-400" />
              旧需求文档 (可选)
            </div>
            {expanded.old ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expanded.old && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <textarea
                  value={config.oldRequirements || ''}
                  onChange={(e) => setConfig({...config, oldRequirements: e.target.value})}
                  placeholder="粘贴既有文档，供 AI 参考对比..."
                  className="w-full h-32 p-3 text-xs border-t border-slate-100 focus:ring-0 outline-none resize-none text-slate-600"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded text-[11px] flex items-start gap-2 border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <button
          onClick={handleGenerate}
          disabled={isAnalyzing}
          className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${
            isAnalyzing 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-[#3B82F6] text-white hover:bg-blue-600 shadow-sm active:scale-[0.98]'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              正在生成...
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              生成需求文档
            </>
          )}
        </button>
      </div>
    </div>
  );
}
