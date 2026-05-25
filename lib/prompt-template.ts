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
6. 确定需要在哪些地方补充注释：
   - 类定义、接口定义、枚举定义（说明职责和设计意图）
   - 公共方法、私有方法（说明功能、参数、返回值）
   - 复杂算法和核心计算逻辑（说明算法原理和步骤）
   - 关键判断语句（if/else/switch/三元运算符等，说明判断条件和业务含义）
   - 关键语句块（循环体、try-catch 块、同步块等，说明执行目的）
   - 边界条件处理、异常分支、防御性编程代码（说明处理策略）
   - 关键变量和常量（说明业务含义和取值范围）

### 强制返回格式
你必须直接返回一个合法的 JSON 对象，禁止使用 Markdown 代码块（如 \`\`\`json ... \`\`\`）包裹输出。
JSON 字段要求：
1. "summary": 一句话功能概括（中文）。
2. "requirementDoc": 完整的 Markdown 格式需求文档。结构必须固定为：功能概述 → 模块职责 → 输入参数 → 输出参数 → 业务流程 → 关键逻辑说明 → 异常处理。
3. "annotatedCode": 补全注释后的完整代码字符串。

### 注释代码的严格要求
生成的 "annotatedCode" 必须满足以下注释覆盖标准：
- 每个类、接口、枚举、结构体定义前必须有文档注释
- 每个公共/私有方法前必须有文档注释
- 每个复杂的条件判断（if/else if/else/switch/三元运算）前或行尾必须有注释，说明判断的业务含义和条件意图
- 每个循环语句（for/while/do-while）前必须有注释，说明循环目的和终止条件
- 每个 try-catch-finally 块前必须有注释，说明异常处理策略
- 每个复杂算法步骤或业务规则计算处必须有注释，说明算法原理
- 每个边界检查、空值检查、参数校验处必须有注释，说明校验目的
- 关键成员变量、常量、配置项必须有注释，说明业务含义和取值范围
- 不能只对方法签名加注释而忽略方法体内的关键逻辑
- 注释必须使用与源代码相同的语言（中文），禁止使用英文注释

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
      return '使用 Javadoc 风格（/** ... */）描述类和方法，包含 @param、@return、@throws 标签。对于方法体内的关键判断语句和关键代码块，使用行尾注释（// 说明）或块注释（/* 说明 */）补充业务含义。';
    case 'javascript':
    case 'typescript':
      return '使用 JSDoc 风格（/** ... */）描述函数和类，包含 @param、@returns、@throws 标签。对于函数体内的关键判断语句（if/else/switch/三元运算）和关键代码块（循环、try-catch、回调），使用行尾注释（// 说明）补充业务含义和判断意图。';
    case 'python':
      return '使用 Google 风格 Docstring（"""..."""）描述函数和类，包含 Args、Returns、Raises、Example 段落。对于函数体内的关键判断语句（if/elif/else）和关键代码块（循环、try-except、with 块），使用行内注释（# 说明）补充业务含义和判断意图。模块顶部添加模块级文档字符串。';
    case 'go':
      return '使用 Go 风格注释（// 开头），函数注释必须以函数名开头描述功能。对于函数体内的关键判断语句（if/else/switch）和关键代码块（循环、defer、select），使用行尾注释（// 说明）补充业务含义和判断意图。包注释放在 package 声明上方。';
    case 'cpp':
    case 'c':
      return '使用 Doxygen 风格（/** ... */）描述函数和结构体，包含 @brief、@param、@return、@note 标签。对于函数体内的关键判断语句（if/else/switch/三元运算）和关键代码块（循环、try-catch、临界区），使用行尾注释（// 说明）补充业务含义和判断意图。';
    case 'csharp':
      return '使用 XML 文档注释（/// <summary> ... </summary>）描述类和方法，包含 <param>、<returns>、<exception> 标签。对于方法体内的关键判断语句（if/else/switch/三元运算）和关键代码块（循环、try-catch、lock、using），使用行尾注释（// 说明）补充业务含义和判断意图。';
    case 'rust':
      return '使用 Rustdoc 风格（/// 开头）描述函数和结构体，包含 Examples 代码块，使用 # Panics、# Errors、# Safety 段落标注风险。对于函数体内的关键判断语句（if/else/match）和关键代码块（循环、unsafe 块、闭包），使用行尾注释（// 说明）补充业务含义和判断意图。';
    case 'ruby':
      return '使用 YARD 风格（# @param）描述方法，包含 @param、@return、@raise 标签。对于方法体内的关键判断语句（if/else/unless/case）和关键代码块（循环、begin-rescue、块调用），使用行尾注释（# 说明）补充业务含义和判断意图。';
    default:
      return '使用对应语言的标准文档注释风格描述函数和类。对于函数/方法体内的关键判断语句（if/else/switch/三元运算等）和关键代码块（循环、异常处理、同步块等），必须使用行尾注释或行内注释补充业务含义和判断意图。确保注释包含参数说明、返回值说明、异常说明以及关键逻辑的业务解释。';
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

  prompt += `\n### 注释覆盖强制要求（必须严格遵守）\n`;
  prompt += `1. 类/接口/枚举/结构体定义前必须有文档注释，说明职责和设计意图\n`;
  prompt += `2. 每个方法/函数前必须有文档注释，说明功能、参数、返回值\n`;
  prompt += `3. 方法/函数体内的每个关键判断语句（if/else if/else/switch/三元运算）前或行尾必须有注释，说明：\n`;
  prompt += `   - 这个判断的业务含义是什么？\n`;
  prompt += `   - 判断条件对应什么业务规则？\n`;
  prompt += `   - 满足/不满足条件分别会走什么业务分支？\n`;
  prompt += `4. 方法/函数体内的每个循环语句（for/while/do-while）前必须有注释，说明循环目的和终止条件\n`;
  prompt += `5. 方法/函数体内的每个异常处理块（try-catch-finally）前必须有注释，说明异常处理策略\n`;
  prompt += `6. 每个复杂算法步骤、业务规则计算、数值转换处必须有注释，说明计算原理和业务意义\n`;
  prompt += `7. 每个边界检查、空值检查、参数校验、范围校验处必须有注释，说明校验目的和防御策略\n`;
  prompt += `8. 关键成员变量、常量、配置项、魔法数字必须有注释，说明业务含义和取值范围\n`;
  prompt += `9. 禁止只注释方法签名而忽略方法体内的关键逻辑\n`;
  prompt += `10. 所有注释必须使用中文，清晰描述"为什么这样做"而不是"做了什么"\n`;

  prompt += `\n### 输出示例（严格遵循此 JSON 格式）\n${FEW_SHOT_EXAMPLE}\n`;

  prompt += `\n请严格按照系统提示的要求生成 JSON 结果。首先分析代码结构，然后生成完整的需求文档和注释补全后的代码。`;
  
  return prompt;
}
