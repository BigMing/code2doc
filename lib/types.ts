export interface AnalysisResult {
  summary: string;
  requirementDoc: string;
  annotatedCode: string;
}

export interface AnalysisConfig {
  language: string;
  businessBackground?: string;
  oldRequirements?: string;
}

// [第二轮新增] 工作日志与内容摘要类型
export type LogType = 'info' | 'success' | 'error' | 'warning';

export interface LogEntry {
  id: string;
  timestamp: string; // 格式 HH:mm:ss
  type: LogType;
  message: string;
}

export interface AiParseSummary {
  methodCount: number;      // 识别到的方法/函数数
  classCount: number;       // 识别到的类/模块数
  docSections: number;      // 需求文档章节数
  detectedRules: number;    // 检测到的业务规则数
  codeLines: number;        // 原始代码行数
}
