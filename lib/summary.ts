import { AiParseSummary } from './types';

/**
 * 根据生成的代码和文档计算概览统计数据
 */
export const calculateSummary = (annotated: string, doc: string, raw: string): AiParseSummary => {
  const codeLines = raw.split('\n').length;
  
  // 匹配 (public|private|protected|def|function)\s+\w+
  // 增加对主流语言方法定义的识别支持
  const methodCount = (annotated.match(/(public|private|protected|def|function|async|func|def)\s+[\w.]+/g) || []).length;
  
  // 匹配 (class|interface|struct|type|enum)\s+\w+
  const classCount = (annotated.match(/(class|interface|struct|type|enum|trait)\s+\w+/g) || []).length;
  
  // 匹配 Markdown 标题中的 ## 或 ###
  const docSections = (doc.match(/^#{1,4}\s+/gm) || []).length;
  
  // 匹配业务规则关键词
  const ruleKeywords = /业务规则|校验规则|约束|限制|必须|禁止|罚息|费率|计算逻辑|流程|生命周期/g;
  const detectedRules = (doc.match(ruleKeywords) || []).length;

  return { 
    methodCount, 
    classCount, 
    docSections, 
    detectedRules, 
    codeLines 
  };
};
