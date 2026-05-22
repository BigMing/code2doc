'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '@/lib/context';
import { streamAnalyzeCode, detectLanguage } from '@/lib/ai-client';
import { calculateSummary } from '@/lib/summary';
import { getProviderLabel } from '@/lib/ai-config';
import { extractJsonFromStream } from '@/lib/stream-parser';
import { DEMO_CODE_JAVA, DEMO_BUSINESS_CONTEXT } from '@/lib/demo-data';
import { 
  FileCode, 
  ChevronDown, 
  ChevronRight, 
  Briefcase, 
  FileText, 
  Wand2, 
  RotateCw,
  AlertCircle,
  Sparkles,
  Upload,
  Lightbulb,
  X,
  Keyboard
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

const MAX_CODE_LENGTH = 50000;
const WARNING_CODE_LENGTH = 15000;

export function InputPanel() {
  const { 
    rawCode, setRawCode, 
    config, setConfig, 
    setResult, 
    isAnalyzing, setIsAnalyzing,
    addLog, setParseSummary,
    setRawRequest, setRawResponse,
    modelConfig,
    setTokenUsage,
    streamStart, streamChunk, streamEnd, resetStreamState
  } = useAppContext();

  const [expanded, setExpanded] = useState({ context: false, old: false });
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const EXT_TO_LANGUAGE: Record<string, string> = {
    '.java': 'java', '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
    '.go': 'go', '.cpp': 'cpp', '.c': 'cpp', '.h': 'cpp', '.cs': 'csharp',
    '.rb': 'ruby', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin',
    '.php': 'php', '.sql': 'sql', '.html': 'html', '.css': 'css', '.txt': 'auto',
  };

  // [优化] 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isAnalyzing) {
          handleGenerate();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleLoadDemo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalyzing, rawCode, config, modelConfig]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!EXT_TO_LANGUAGE[ext] && ext !== '.txt') {
      addLog(`不支持的文件格式：${ext}，仅支持代码源文件及 .txt`, 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawCode(content);
        addLog(`已上传文件：${file.name}（${(file.size / 1024).toFixed(1)} KB）`, 'success');
        const detectedLang = EXT_TO_LANGUAGE[ext] || 'auto';
        if (detectedLang !== 'auto') {
          setConfig({ ...config, language: detectedLang });
          addLog(`根据文件后缀自动识别语言：${detectedLang}`, 'info');
        }
      }
    };
    reader.onerror = () => {
      addLog('文件读取失败，请重试', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDetectLanguage = useCallback(async (code: string) => {
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
  }, [config, addLog, setConfig]);

  // 自动识别语言
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rawCode && rawCode.length > 20 && config.language === 'auto') {
        handleDetectLanguage(rawCode);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [rawCode, config.language, handleDetectLanguage]);

  // [优化] 加载示例代码
  const handleLoadDemo = () => {
    setRawCode(DEMO_CODE_JAVA);
    setConfig({
      ...config,
      language: 'java',
      businessBackground: DEMO_BUSINESS_CONTEXT,
    });
    addLog('已加载示例代码（电商订单服务），可按 Ctrl+Enter 直接生成', 'info');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // [优化] 取消生成
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    addLog('分析已由用户取消', 'warning');
  };

  const handleGenerate = async () => {
    if (!rawCode || rawCode.length < 50) {
      setError('请输入至少 50 个字符的代码以供分析。');
      addLog('分析中断：代码长度不足 50 字符', 'warning');
      return;
    }

    if (rawCode.length > MAX_CODE_LENGTH) {
      setError(`代码过长（${rawCode.length.toLocaleString()} 字符），建议不超过 ${MAX_CODE_LENGTH.toLocaleString()} 字符以避免 Token 超限。`);
      addLog(`分析中断：代码长度超过上限`, 'warning');
      return;
    }

    // 中断之前的流
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    let finalLanguage = config.language;
    if (finalLanguage === 'auto') {
      setIsDetecting(true);
      addLog('正在自动识别编程语言...', 'info');
      try {
        finalLanguage = await detectLanguage(rawCode);
      } catch {
        finalLanguage = 'java';
      }
      setConfig({ ...config, language: finalLanguage });
      setIsDetecting(false);
    }

    setError(null);
    streamStart();
    addLog(`开始流式分析代码，目标语言：${finalLanguage}`, 'info');

    try {
      addLog(`正在建立与 ${getProviderLabel(modelConfig.provider)} 的流式连接...`, 'info');
      
      const startTime = Date.now();
      const stream = streamAnalyzeCode(
        rawCode, 
        { ...config, language: finalLanguage }, 
        abortControllerRef.current
      );

      let fullText = '';
      let isFirstChunk = true;
      let lastUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;

      for await (const { chunk, accumulated, usage } of stream) {
        if (isFirstChunk) {
          addLog('连接已建立，开始接收数据流', 'success');
          isFirstChunk = false;
        }
        fullText = accumulated;
        streamChunk(chunk, accumulated);
        if (usage) {
          lastUsage = usage;
        }
      }

      const endTime = Date.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(1);

      // Token 统计日志
      if (lastUsage && lastUsage.totalTokens > 0) {
        setTokenUsage(lastUsage);
        addLog(
          `数据接收完成，共 ${fullText.length.toLocaleString()} 字符，Token：${lastUsage.totalTokens.toLocaleString()}（输入 ${lastUsage.promptTokens} / 输出 ${lastUsage.completionTokens}），耗时 ${elapsed} 秒`,
          'success'
        );
      } else {
        addLog(`数据接收完成，共 ${fullText.length.toLocaleString()} 字符，耗时 ${elapsed} 秒`, 'success');
      }
      
      addLog('正在解析 JSON 结构...', 'info');
      try {
        const parsedResult = extractJsonFromStream(fullText);
        setRawResponse(parsedResult as object);
        
        const summary = calculateSummary(parsedResult.annotatedCode, parsedResult.requirementDoc, rawCode);
        setParseSummary(summary);
        
        addLog(`解析完成，识别到 ${summary.methodCount} 个方法、${summary.detectedRules} 条业务规则，开始渲染`, 'success');
        addLog('正在动态渲染需求文档与代码...', 'info');
        
        streamEnd(parsedResult);
      } catch (parseErr: any) {
        addLog(`JSON 解析失败，已回退到文本展示：${parseErr.message}`, 'warning');
        const fallbackResult = {
          summary: "解析失败，原始内容显示",
          requirementDoc: fullText,
          annotatedCode: "// [解析失败] 原始输出如下：\n" + fullText
        };
        setResult(fallbackResult);
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('分析已由用户中断', 'warning');
      } else {
        setError(err.message || '分析过程中发生错误，请重试。');
        addLog(`错误：${err.message}`, 'error');
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  // 输入长度警告
  const codeLengthWarning = rawCode.length > WARNING_CODE_LENGTH && rawCode.length <= MAX_CODE_LENGTH
    ? `代码较长（${rawCode.length.toLocaleString()} 字符），可能消耗较多 Token`
    : null;

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-800/50 transition-colors">
      <div className="h-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5" />
          原始代码 (Source)
        </h2>
        <div className="flex items-center gap-2">
          {isDetecting && <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />}
          <select
            value={config.language}
            onChange={(e) => setConfig({ ...config, language: e.target.value })}
            className="bg-transparent border-none text-[10px] font-bold text-blue-600 dark:text-blue-400 outline-none cursor-pointer uppercase tracking-tight"
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
        {/* 文件上传 + 示例按钮 */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".java,.py,.js,.ts,.go,.cpp,.c,.h,.cs,.rb,.rs,.swift,.kt,.php,.sql,.html,.css,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-9 border border-dashed border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600"
          >
            <Upload className="w-3.5 h-3.5" />
            点击上传代码文件
          </button>
          <button
            onClick={handleLoadDemo}
            disabled={isAnalyzing}
            className="h-9 px-3 border border-amber-200 dark:border-amber-800 rounded bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 disabled:opacity-40"
            title="加载示例代码（快捷键 Ctrl+K）"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            示例
          </button>
        </div>

        {/* 代码编辑器 */}
        <div className="relative group">
          <textarea
            ref={textareaRef}
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            placeholder="// 请在此粘贴业务功能源代码...&#10;// 快捷键：Ctrl+Enter 生成，Ctrl+K 加载示例"
            className="w-full h-56 p-4 font-mono text-xs border border-slate-200 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none resize-none bg-white dark:bg-slate-800 transition-shadow text-slate-600 dark:text-slate-300 leading-relaxed"
            spellCheck={false}
          />
          {rawCode.length > 0 && (
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-300 dark:text-slate-600 pointer-events-none">
              {rawCode.length.toLocaleString()} chars
            </div>
          )}
        </div>

        {/* 长度警告 */}
        {codeLengthWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-2 rounded text-[11px] flex items-start gap-2 border border-amber-100 dark:border-amber-800">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{codeLengthWarning}</span>
          </div>
        )}

        {/* 业务背景 - 折叠 */}
        <div className="border border-slate-200 dark:border-slate-600 rounded overflow-hidden bg-white dark:bg-slate-800">
          <button 
            onClick={() => setExpanded({...expanded, context: !expanded.context})}
            className="w-full h-8 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 uppercase tracking-wider transition-colors"
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
                  className="w-full h-24 p-3 text-xs border-t border-slate-100 dark:border-slate-600 focus:ring-0 outline-none resize-none text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 旧需求文档 - 折叠 */}
        <div className="border border-slate-200 dark:border-slate-600 rounded overflow-hidden bg-white dark:bg-slate-800">
          <button 
            onClick={() => setExpanded({...expanded, old: !expanded.old})}
            className="w-full h-8 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 uppercase tracking-wider transition-colors"
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
                  className="w-full h-32 p-3 text-xs border-t border-slate-100 dark:border-slate-600 focus:ring-0 outline-none resize-none text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded text-[11px] flex items-start gap-2 border border-red-100 dark:border-red-800">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          {isAnalyzing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all bg-red-500 text-white hover:bg-red-600 shadow-sm active:scale-[0.98]"
              >
                <X className="w-3.5 h-3.5" />
                取消生成
              </button>
              <div className="px-3 py-2.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                分析中...
              </div>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              className="flex-1 py-2.5 rounded font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all bg-[#3B82F6] text-white hover:bg-blue-600 shadow-sm active:scale-[0.98]"
            >
              <Wand2 className="w-3.5 h-3.5" />
              生成需求文档
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-slate-300 dark:text-slate-600">
          <Keyboard className="w-2.5 h-2.5" />
          <span>Ctrl+Enter 生成 · Ctrl+K 示例</span>
        </div>
      </div>
    </div>
  );
}
