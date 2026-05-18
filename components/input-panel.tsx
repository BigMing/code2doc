'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { streamAnalyzeCode, detectLanguage } from '@/lib/ai-client';
import { AiParseSummary } from '@/lib/types';
import { calculateSummary } from '@/lib/summary';
import { getProviderLabel } from '@/lib/ai-config';
import { extractJsonFromStream } from '@/lib/stream-parser';
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
  Upload
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
    setRawRequest, setRawResponse,
    modelConfig,
    setTokenUsage,
    // [第四轮新增] 流式调度方法
    streamStart, streamChunk, streamEnd, resetStreamState
  } = useAppContext();

  const [expanded, setExpanded] = useState({ context: false, old: false });
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const EXT_TO_LANGUAGE: Record<string, string> = {
    '.java': 'java', '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
    '.go': 'go', '.cpp': 'cpp', '.c': 'cpp', '.h': 'cpp', '.cs': 'csharp',
    '.rb': 'ruby', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin',
    '.php': 'php', '.sql': 'sql', '.html': 'html', '.css': 'css', '.txt': 'auto',
  };

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
        // 自动识别语言
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

    // 清空 input 值，允许重复上传同一文件
    e.target.value = '';
  };

  const handleDetectLanguage = React.useCallback(async (code: string) => {
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
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (rawCode && rawCode.length > 20 && config.language === 'auto') {
        handleDetectLanguage(rawCode);
      }
    }, 1000); // 防抖
    return () => clearTimeout(timer);
  }, [rawCode, config.language, handleDetectLanguage]);

  const handleGenerate = async () => {
    if (!rawCode || rawCode.length < 50) {
      setError('请输入至少 50 个字符的代码以供分析。');
      addLog('分析中断：代码长度不足 50 字符', 'warning');
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
      finalLanguage = await detectLanguage(rawCode);
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
        setRawResponse(parsedResult as any); // 记录作为结果
        
        const summary = calculateSummary(parsedResult.annotatedCode, parsedResult.requirementDoc, rawCode);
        setParseSummary(summary);
        
        addLog(`解析完成，识别到 ${summary.methodCount} 个方法、${summary.detectedRules} 条业务规则，开始渲染`, 'success');
        addLog('正在动态渲染需求文档与代码...', 'info');
        
        // 触发打字机效果
        streamEnd(parsedResult);

      } catch (parseErr: any) {
        // 如果 JSON 解析完全失败，回退到普通显示模式
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

      <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
        {/* 文件上传 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".java,.py,.js,.ts,.go,.cpp,.c,.h,.cs,.rb,.rs,.swift,.kt,.php,.sql,.html,.css,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-9 border border-dashed border-slate-300 rounded bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-[11px] text-slate-500 hover:text-blue-600"
        >
          <Upload className="w-3.5 h-3.5" />
          点击上传代码文件或 .txt 文件
        </button>

        {/* 代码编辑器 */}
        <div className="relative group">
          <textarea
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            placeholder="// 请在此粘贴业务功能源代码..."
            className="w-full h-56 p-4 font-mono text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none resize-none bg-white transition-shadow text-slate-600 leading-relaxed"
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
