'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AnalysisResult, AnalysisConfig, LogEntry, LogType, AiParseSummary } from '@/lib/types';

interface AppState {
  rawCode: string;
  config: AnalysisConfig;
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  logs: LogEntry[];
  parseSummary: AiParseSummary | null;
  rawRequest: object | null;
  rawResponse: object | null;
  
  setRawCode: (code: string) => void;
  setConfig: (config: AnalysisConfig) => void;
  setResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (loading: boolean) => void;
  addLog: (message: string, type?: LogType) => void;
  setParseSummary: (summary: AiParseSummary | null) => void;
  setRawRequest: (req: object | null) => void;
  setRawResponse: (res: object | null) => void;
  clearLogs: () => void;
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

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const id = Math.random().toString(36).substring(2, 9);
    setLogs(prev => [...prev.slice(-49), { id, timestamp, type, message }]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <AppContext.Provider value={{ 
      rawCode, setRawCode, 
      config, setConfig, 
      result, setResult,
      isAnalyzing, setIsAnalyzing,
      logs, addLog, clearLogs,
      parseSummary, setParseSummary,
      rawRequest, setRawRequest,
      rawResponse, setRawResponse
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
