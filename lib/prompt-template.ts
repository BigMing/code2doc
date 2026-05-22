import { AnalysisConfig } from "./types";

export const SYSTEM_PROMPT = `你是一位资深业务分析师兼技术架构师，擅长从代码中还原业务需求并编写企业级技术文档。
你的任务是分析用户提供的源代码，并生成结构化的需求文档以及补全注释后的代码。

### 思考过程要求（思维链 CoT）
在生成最终输出之前，请先按以下步骤思考：
1. 识别代码中的主要模块、类、接口和方法
2. 分析输入参数的业务含义和数据流向
3. 分析输出结果的结构和业务意义
4. 梳理核心业务流程的先后顺序
5. 识别边界条件和异常处理逻辑
6. 确定需要在哪些地方补充注释（类定义、公共方法、复杂算法、边界条件）

### 强制返回格式
你必须直接返回一个合法的 JSON 对象，禁止使用 Markdown 代码块（如 \`\`\`json ... \`\`\`）包裹输出。
JSON 字段要求：
1. "summary": 一句话功能概括（中文）。
2. "requirementDoc": 完整的 Markdown 格式需求文档。结构必须固定为：功能概述 → 模块职责 → 输入参数 → 输出参数 → 业务流程 → 关键逻辑说明 → 异常处理。
3. "annotatedCode": 补全注释后的完整代码字符串。

### 需求文档结构要求 (Markdown)
- # 功能概述: 简述代码实现的核心业务功能。
- ## 模块职责: 列出主要类/模块及其在业务中的角色。
- ## 输入参数: 详细说明每个接口/方法的输入参数名称、类型、是否必填、默认值及业务含义。
- ## 输出参数: 详细说明每个接口/方法的返回值/输出结果的结构、字段类型及业务含义。
- ## 业务流程: 描述业务操作的逻辑先后顺序。
- ## 关键逻辑说明: 深入解释核心算法、业务规则或复杂判断条件的设计意图。
- ## 异常处理: 说明代码如何处理边界情况或错误。

生成的 Markdown 标题必须使用标准 HTML ID（如 # 功能概述 {#summary}）。`;

// Few-shot 示例（精简版，避免过多消耗 Token）
const FEW_SHOT_EXAMPLE = `示例输入（Java）：
public class Calculator { public int add(int a, int b) { return a + b; } }
示例输出 JSON：
{ "summary": "实现了一个基础的整数加法计算器类。", "requirementDoc": "# 功能概述\\n\\n实现整数加法计算。\\n\\n## 模块职责\\n\\n- Calculator: 执行数学运算。\\n\", "annotatedCode": "/** 基础整数加法计算器 */\\npublic class Calculator {\\n  /** 计算两数之和 @param a 第一个加数 @param b 第二个加数 @return 两数之和 */\\n  public int add(int a, int b) { return a + b; }\\n}" }`;

function getLanguageCommentStyle(language: string): string {
  switch (language.toLowerCase()) {
    case 'java':
    case 'kotlin':
      return '使用 Javadoc 风格（/** ... */），包含 @param、@return、@throws 标签。类注释需描述职责，方法注释需描述功能、参数、返回值和异常。';
    case 'javascript':
    case 'typescript':
      return '使用 JSDoc 风格（/** ... */），包含 @param、@returns、@throws 标签。复杂类型使用 @typedef 或 @type 说明。';
    case 'python':
      return '使用 Google 风格 Docstring（"""..."""），包含 Args、Returns、Raises、Example 段落。模块顶部添加模块级文档字符串。';
    case 'go':
      return '使用 Go 风格注释（// 开头），函数注释必须以函数名开头描述功能。包注释放在 package 声明上方。';
    case 'cpp':
    case 'c':
      return '使用 Doxygen 风格（/** ... */），包含 @brief、@param、@return、@note 标签。';
    case 'csharp':
      return '使用 XML 文档注释（/// <summary> ... </summary>），包含 <param>、<returns>、<exception> 标签。';
    case 'rust':
      return '使用 Rustdoc 风格（/// 开头），包含 Examples 代码块。使用 # Panics、# Errors、# Safety 段落标注风险。';
    case 'ruby':
      return '使用 YARD 风格（# @param），包含 @param、@return、@raise 标签。';
    default:
      return '使用对应语言的标准文档注释风格，确保注释包含参数说明、返回值说明和异常说明。';
  }
}

export function getAnalysisPrompt(code: string, config: AnalysisConfig): string {
  let prompt = `请分析以下代码：\n\n\`\`\`${config.language}\n${code}\n\`\`\`\n\n`;
  
  prompt += `### 配置信息\n`;
  prompt += `- 编程语言: ${config.language}\n`;
  if (config.businessBackground) {
    prompt += `- 业务背景: ${config.businessBackground}\n`;
  }
  if (config.oldRequirements) {
    prompt += `- 参考旧需求文档: \n${config.oldRequirements}\n`;
  }

  prompt += `\n### 注释风格要求\n`;
  prompt += `${getLanguageCommentStyle(config.language)}\n`;

  prompt += `\n### 输出示例（严格遵循此 JSON 格式）\n${FEW_SHOT_EXAMPLE}\n`;

  prompt += `\n请严格按照系统提示的要求生成 JSON 结果。首先分析代码结构，然后生成完整的需求文档和注释补全后的代码。`;
  
  return prompt;
}
