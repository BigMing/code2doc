import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, AnalysisConfig } from "./types";
import { SYSTEM_PROMPT, getAnalysisPrompt } from "./prompt-template";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// [第二轮修改] 优先使用 gemini-3-flash-preview
const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.5-flash";

export async function analyzeCode(
  code: string, 
  config: AnalysisConfig,
  updateRawInfo?: (req: any, res: any) => void
): Promise<AnalysisResult> {
  if (!API_KEY) {
    throw new Error("API Key 未配置");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const prompt = getAnalysisPrompt(code, config);
  
  // 记录请求体信息（用于调试日志）
  const requestParams = {
    model: PRIMARY_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    }
  };

  const callModel = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: prompt,
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
    let response;
    try {
      response = await callModel(PRIMARY_MODEL);
    } catch (e: any) {
      console.warn("Primary model failed, checking for 404/Not Found to fallback:", e);
      if (e.message?.includes("not found") || e.message?.includes("404")) {
        response = await callModel(FALLBACK_MODEL);
      } else {
        throw e;
      }
    }

    if (updateRawInfo) {
      // 获取响应原始内容
      updateRawInfo(requestParams, response);
    }

    const resultText = response.text;
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
