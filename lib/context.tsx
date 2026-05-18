'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AnalysisResult, AnalysisConfig, LogEntry, LogType, AiParseSummary, ModelConfig, TokenUsage } from '@/lib/types';
import { HistoryItem } from '@/lib/storage';
import { calculateSummary } from '@/lib/summary';
import { loadModelConfig, saveModelConfig, DEFAULT_CONFIG } from '@/lib/ai-config';
import { setGlobalModelConfig } from '@/lib/ai-client';

interface AppState {
  rawCode: string;
  config: AnalysisConfig;
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  logs: LogEntry[];
  parseSummary: AiParseSummary | null;
  rawRequest: object | null;
  rawResponse: object | null;

  // [第六轮新增] Token 使用量统计
  tokenUsage: TokenUsage | null;
  setTokenUsage: (usage: TokenUsage | null) => void;

  // [第四轮新增] 流式与打字机状态
  isStreaming: boolean;
  charsReceived: number;
  accumulatedRawText: string;
  isTypewriting: boolean;
  fullDocText: string;
  fullCodeText: string;
  showSkipButton: boolean;

  // [第五轮新增] 模型配置
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
  
  setRawCode: (code: string) => void;
  setConfig: (config: AnalysisConfig) => void;
  setResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (loading: boolean) => void;
  addLog: (message: string, type?: LogType) => void;
  setParseSummary: (summary: AiParseSummary | null) => void;
  setRawRequest: (req: object | null) => void;
  setRawResponse: (res: object | null) => void;
  clearLogs: () => void;
  loadHistoryItem: (item: HistoryItem) => void;
  clearRawData: () => void;

  // [第四轮新增] 流式调度方法
  streamStart: () => void;
  streamChunk: (chunk: string, accumulated: string) => void;
  streamEnd: (result: AnalysisResult) => void;
  setTypewriting: (active: boolean) => void;
  skipAnimation: () => void;
  resetStreamState: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rawCode, setRawCode] = useState('');
  const [config, setConfig] = useState<AnalysisConfig>({
    language: 'java',
    businessBackground: '',
    oldRequirements: '',
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [parseSummary, setParseSummary] = useState<AiParseSummary | null>(null);
  const [rawRequest, setRawRequest] = useState<object | null>(null);
  const [rawResponse, setRawResponse] = useState<object | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  // [第四轮新增] 流式与打字机状态组件内部实现
  const [isStreaming, setIsStreaming] = useState(false);
  const [charsReceived, setCharsReceived] = useState(0);
  const [accumulatedRawText, setAccumulatedRawText] = useState('');
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [fullDocText, setFullDocText] = useState('');
  const [fullCodeText, setFullCodeText] = useState('');
  const [showSkipButton, setShowSkipButton] = useState(false);

  // [第五轮新增] 模型配置状态（从 localStorage 初始化）
  const [modelConfig, setModelConfigState] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [modelConfigReady, setModelConfigReady] = useState(false);

  useEffect(() => {
    loadModelConfig().then(saved => {
      setModelConfigState(saved);
      setGlobalModelConfig(saved);
      setModelConfigReady(true);
    });
  }, []);

  const setModelConfig = useCallback((cfg: ModelConfig) => {
    setModelConfigState(cfg);
    setGlobalModelConfig(cfg);
    saveModelConfig(cfg);
  }, []);

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const id = Math.random().toString(36).substring(2, 9);
    setLogs(prev => [...prev.slice(-49), { id, timestamp, type, message }]);
  }, []);

  const resetStreamState = useCallback(() => {
    setIsStreaming(false);
    setCharsReceived(0);
    setAccumulatedRawText('');
    setIsTypewriting(false);
    setFullDocText('');
    setFullCodeText('');
    setShowSkipButton(false);
    setResult(null);
    setParseSummary(null);
    setTokenUsage(null);
  }, []);

  const streamStart = useCallback(() => {
    resetStreamState();
    setIsStreaming(true);
    setIsAnalyzing(true);
  }, [resetStreamState]);

  const streamChunk = useCallback((chunk: string, accumulated: string) => {
    setAccumulatedRawText(accumulated);
    setCharsReceived(accumulated.length);
  }, []);

  const streamEnd = useCallback((res: AnalysisResult) => {
    setIsStreaming(false);
    setFullDocText(res.requirementDoc);
    setFullCodeText(res.annotatedCode);
    setResult(res);
    setIsTypewriting(true);
    setShowSkipButton(true);
  }, []);

  const setTypewriting = useCallback((active: boolean) => {
    setIsTypewriting(active);
    if (!active) setShowSkipButton(false);
  }, []);

  const skipAnimation = useCallback(() => {
    setIsTypewriting(false);
    setShowSkipButton(false);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const clearRawData = useCallback(() => {
    setRawRequest(null);
    setRawResponse(null);
  }, []);

  const loadHistoryItem = useCallback((item: HistoryItem) => {
    setRawCode(item.originalCode);
    setConfig({
      language: item.language,
      businessBackground: item.businessContext,
      oldRequirements: item.oldRequirement,
    });
    setResult(item.result);
    
    // [修复] 加载历史时重新计算统计摘要
    const summary = calculateSummary(
      item.result.annotatedCode, 
      item.result.requirementDoc, 
      item.originalCode
    );
    setParseSummary(summary);

    // 历史记录不包含原始 API 报文，清空它们
    clearRawData();
    addLog(`已加载历史记录：${item.title}`, 'info');
  }, [addLog, clearRawData]);

  return (
    <AppContext.Provider value={{ 
      rawCode, setRawCode, 
      config, setConfig, 
      result, setResult,
      isAnalyzing, setIsAnalyzing,
      logs, addLog, clearLogs,
      parseSummary, setParseSummary,
      rawRequest, setRawRequest,
      rawResponse, setRawResponse,
      tokenUsage, setTokenUsage,
      loadHistoryItem,
      clearRawData,
      // [第四轮新增] 流式状态导出
      isStreaming,
      charsReceived,
      accumulatedRawText,
      isTypewriting,
      fullDocText,
      fullCodeText,
      showSkipButton,
      streamStart,
      streamChunk,
      streamEnd,
      setTypewriting,
      skipAnimation,
      resetStreamState,
      // [第五轮新增] 模型配置
      modelConfig,
      setModelConfig,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
