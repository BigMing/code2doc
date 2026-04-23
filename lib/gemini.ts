import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, AnalysisConfig } from "./types";
import { SYSTEM_PROMPT, getAnalysisPrompt } from "./prompt-template";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const ai = new GoogleGenAI({
  apiKey: API_KEY,
});

// [第二轮修改] 优先使用 gemini-3-flash-preview
const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.5-flash";

export async function detectLanguage(code: string): Promise<string> {
  if (!API_KEY) return 'java';
  
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Identify the programming language of the following code snippet. Return ONLY the name of the language (e.g., "javascript", "python", "java", etc.). If unsure, return "java".\n\nCode:\n${code.substring(0, 500)}`,
      config: {
        maxOutputTokens: 10,
        temperature: 0.1,
      }
    });

    const text = response.text?.trim().toLowerCase() || "java";
    // 匹配主流语言，如果不在列表中则返回默认
    const supported = ['java', 'python', 'javascript', 'typescript', 'go', 'cpp', 'csharp', 'ruby', 'rust', 'php', 'swift', 'kotlin', 'sql', 'html', 'css'];
    return supported.includes(text) ? text : 'java';
  } catch (error) {
    console.error("Language Detection Error:", error);
    return 'java';
  }
}

/**
 * [第四轮新增] 流式分析代码
 */
export async function* streamAnalyzeCode(
  code: string, 
  config: AnalysisConfig,
  abortController?: AbortController
) {
  if (!API_KEY) {
    throw new Error("API Key 未配置");
  }

  const prompt = getAnalysisPrompt(code, config);
  
  // 流式请求
  const result = await ai.models.generateContentStream({
    model: PRIMARY_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
    }
  });

  let accumulated = '';
  
  for await (const chunk of result) {
    // 检查是否已中止
    if (abortController?.signal.aborted) {
      break;
    }
    
    const text = chunk.text || "";
    accumulated += text;
    yield { chunk: text, accumulated };
  }

  return accumulated;
}

export async function analyzeCode(
  code: string, 
  config: AnalysisConfig,
  updateRawInfo?: (req: any, res: any) => void
): Promise<AnalysisResult> {
  if (!API_KEY) {
    throw new Error("API Key 未配置");
  }

  const prompt = getAnalysisPrompt(code, config);
  
  // 记录请求体信息（用于调试日志）
  const requestParams = {
    model: PRIMARY_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    }
  };

  const callModel = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            requirementDoc: { type: Type.STRING },
            annotatedCode: { type: Type.STRING },
          },
          required: ["summary", "requirementDoc", "annotatedCode"],
        },
      },
    });
  };

  try {
    let result;
    try {
      result = await callModel(PRIMARY_MODEL);
    } catch (e: any) {
      console.warn("Primary model failed, checking for fallback:", e);
      // Fallback logic
      result = await callModel(FALLBACK_MODEL);
    }

    if (updateRawInfo) {
      // 记录原始请求和完整响应体（供日志面板展示）
      updateRawInfo(requestParams, result);
    }

    const resultText = result.text;
    if (!resultText) {
      throw new Error("AI 未返回有效内容");
    }

    return JSON.parse(resultText) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message?.includes("429")) {
      throw new Error("额度超限：今日免费额度已达上限（每日约250次），请明日再试。");
    }
    
    throw new Error(error.message || "模型返回格式异常或服务不可用，请重试");
  }
}
