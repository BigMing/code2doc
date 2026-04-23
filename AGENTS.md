# Code2Doc — 项目指南

本文档面向 AI Coding Agent。阅读前请确认你已了解：本项目是一个基于 Next.js 的单页 Web 应用，所有 UI 文本与代码注释均使用中文。

---

## 项目概述

Code2Doc（代码需求文档智能生成器）是一款将工程源代码翻译为标准化需求文档，并自动补全规范注释的工具。

用户粘贴源代码后，应用调用配置的 AI 模型进行深度分析，返回三份产物：
1. **一句话功能概括**（summary）
2. **结构化需求文档**（requirementDoc）—— Markdown 格式，固定包含：功能概述 → 模块职责 → 业务流程 → 关键逻辑 → 接口定义 → 异常处理
3. **补全注释后的代码**（annotatedCode）—— 在类/方法定义、复杂算法、边界条件处添加标准注释块

前端采用三栏分屏工作区（日志+输入区、需求文档预览区、注释代码预览区），支持同屏互操作与 Markdown 导出。

**核心亮点**：支持多模型自主配置，包括 Google Gemini、OpenAI、Anthropic Claude、阿里通义千问（公有云/私有化）、智谱 GLM、DeepSeek 等，统一通过 `lib/ai-client.ts` 进行调用分发。

---

## 技术栈

- **框架**: Next.js 15 (App Router), React 19, TypeScript 5.9
- **AI 系统**: 统一 AI 调用层 (`lib/ai-client.ts`)
  - **Gemini**: 使用 `@google/genai` SDK，支持 JSON Schema 约束输出
  - **OpenAI 兼容模型**: 使用原生 `fetch` + SSE 解析，覆盖 OpenAI / 阿里千问 / GLM / DeepSeek / 私有化部署模型
  - **Anthropic Claude**: 使用原生 `fetch` + SSE 解析，独立协议
- **样式**: Tailwind CSS v4 + PostCSS, 主题变量通过 CSS 自定义属性管理
- **UI 组件库**: shadcn/ui (style: `base-nova`)，底层基于 `@base-ui/react` 原语
- **图标**: `lucide-react`
- **动画**: `motion` (Framer Motion 继任者)
- **Markdown 渲染**: `react-markdown` + `remark-gfm` + `rehype-slug`
- **代码高亮**: `react-syntax-highlighter` (Prism, vs 主题)
- **分屏布局**: `react-resizable-panels`
- **Toast 通知**: `sonner`

---

## 项目结构

```
app/                    # Next.js App Router
  layout.tsx            # 根布局：字体(Geist + JetBrains Mono)、AppProvider、Toaster
  page.tsx              # 首页：仅渲染 WorkspaceLayout
  globals.css           # Tailwind 入口、主题变量、自定义滚动条、Prose 样式覆盖

components/             # React 组件（全部使用 'use client'）
  ui/                   # shadcn/ui 原语组件
    alert-dialog.tsx    # 确认对话框
    badge.tsx           # 标签
    button.tsx          # 按钮（基于 @base-ui/react/button + cva）
    dropdown-menu.tsx   # 下拉菜单
    popover.tsx         # 气泡卡片
    skeleton.tsx        # 骨架屏
    sonner.tsx          # Toast 通知器
  workspace-layout.tsx  # 核心布局：顶部导航 + 操作栏 + 三栏分屏 + 状态栏
  input-panel.tsx       # 左下：代码输入、语言选择、业务背景/旧需求折叠面板、生成按钮
  doc-panel.tsx         # 中栏：Markdown 文档渲染、目录、导出、打字机效果
  code-panel.tsx        # 右栏：语法高亮代码、复制、打字机效果
  log-panel.tsx         # 左上：工作日志时间线、统计摘要、原始 JSON 请求/响应查看器
  top-action-bar.tsx    # 全局操作栏：保存分析、历史记录、模型配置、跳过动画、重置
  model-config-dialog.tsx # 模型配置弹窗：提供商/模型/API Key/自定义地址选择
  history-popover.tsx   # 历史记录下拉面板（基于 Popover + AlertDialog）

hooks/                  # 自定义 Hooks
  use-typewriter.ts     # 打字机效果（支持动态加速与跳过）
  use-stream-log.ts     # 流式接收进度日志（防抖）
  use-mobile.ts         # 移动端断点检测（768px）

lib/                    # 工具与核心逻辑
  ai-client.ts          # [第五轮新增] 统一 AI 调用层：GeminiClient / OpenAiCompatibleClient / AnthropicClient
  ai-config.ts          # [第五轮新增] 模型配置定义、提供商列表、localStorage 持久化
  gemini.ts             # [保留] Gemini 专用 API 封装（已被 ai-client.ts 替代，保留供参考）
  prompt-template.ts    # 系统提示词（SYSTEM_PROMPT）与分析提示词构造
  stream-parser.ts      # 从流式文本中提取/容错解析 JSON
  context.tsx           # 全局 React Context：状态管理与流式/打字机状态调度
  types.ts              # 核心 TypeScript 类型定义（含 ModelConfig / AiProvider / ProviderInfo）
  storage.ts            # localStorage 历史记录持久化（最多 10 条）
  summary.ts            # 基于生成结果计算概览统计（方法数、类数、章节数等）
  clipboard.ts          # 剪贴板写入（含降级方案）
  file-download.ts      # Markdown 文件下载（含 YAML Frontmatter）
  json-truncate.ts      # JSON 字符串截断（用于日志面板展示）
  utils.ts              # cn() 工具（clsx + tailwind-merge）
```

---

## 构建与运行命令

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 生产构建（输出 standalone 模式）
npm run build

# 生产服务器
npm run start

# 代码检查
npm run lint

# 清理构建缓存
npm run clean
```

开发服务器默认在 `http://localhost:3000` 启动。

---

## 环境变量

复制 `.env.example` 为 `.env.local`：

```env
# 可选：默认 Google Gemini API Key（从 Google AI Studio 获取）
# 若不在环境变量配置，用户也可在应用内的「模型配置」面板中直接填写
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here

# 可选：应用托管 URL（用于自引用链接等）
APP_URL=http://localhost:3000
```

> ⚠️ **关键说明**：AI API Key 通过 `NEXT_PUBLIC_` 前缀暴露到客户端，因为所有 AI 调用均发生在浏览器端（无后端 API Route 代理）。用户也可以在应用内的「模型配置」面板中自主选择模型并填写密钥，配置会保存到 `localStorage`。

---

## 代码组织与架构约定

### 1. 纯客户端应用
所有业务组件与逻辑均标记 `'use client'`。没有使用 Next.js API Routes，也没有服务端渲染的数据获取逻辑。

### 2. 状态管理
全局状态统一通过 `lib/context.tsx` 中的 `AppContext` 管理。Context 包含：
- 原始代码、分析配置、分析结果
- 模型配置（`modelConfig`: provider / model / apiKey / baseUrl）
- 工作日志队列（最多保留最近 50 条）
- 流式接收状态（`isStreaming`, `accumulatedRawText` 等）
- 打字机动画状态（`isTypewriting`, `fullDocText`, `fullCodeText`）
- 原始请求/响应报文（用于调试面板）

组件通过 `useAppContext()` 消费状态。若需新增全局状态，应扩展 `AppState` 接口并在 `AppProvider` 中添加对应的 `useState` + 回调函数。

### 3. AI 调用架构
`lib/ai-client.ts` 是统一的 AI 调用入口，对外暴露：
- `detectLanguage(code)` — 自动识别编程语言
- `streamAnalyzeCode(code, config, abortController?)` — 流式分析
- `analyzeCode(code, config, updateRawInfo?)` — 非流式分析

内部通过 `createClient(modelConfig)` 工厂函数根据 `provider` 分发：
- `gemini` → `GeminiClient`（使用 `@google/genai`）
- `openai` / `qwen` / `qwen-private` / `glm` / `deepseek` → `OpenAiCompatibleClient`（使用 `fetch` + SSE）
- `anthropic` → `AnthropicClient`（使用 `fetch` + SSE）

全局模型配置通过 `setGlobalModelConfig(config)` 注入，`ai-client.ts` 内部持有 `_globalModelConfig` 引用。

### 4. 流式处理链路
`input-panel.tsx` 是主要调度者，流程如下：
1. 用户点击「生成需求文档」
2. 创建 `AbortController`，调用 `streamStart()` 重置状态
3. 调用 `lib/ai-client.ts` 的 `streamAnalyzeCode()` 获取异步生成器
4. 循环 `yield` 接收 chunk，调用 `streamChunk()` 更新累积文本
5. 流结束后，用 `stream-parser.ts` 的 `extractJsonFromStream()` 解析 JSON
6. 调用 `streamEnd(parsedResult)` 触发打字机效果
7. `doc-panel.tsx` 与 `code-panel.tsx` 中的 `useTypewriter` Hook 接管逐字渲染

### 5. 模型配置链路
1. 用户在 `model-config-dialog.tsx` 中选择提供商、模型、填写 API Key 和自定义地址
2. 调用 `setModelConfig(cfg)`（来自 AppContext）
3. `setModelConfig` 同时更新 React state 和调用 `setGlobalModelConfig(cfg)`（写入 `ai-client.ts` 的全局引用）
4. 配置通过 `saveModelConfig()` 持久化到 `localStorage`（key: `CODE2DOC_MODEL_CONFIG_V2`）
5. 下次打开应用时，`loadModelConfig()` 自动读取并恢复

### 6. 日志系统
工作日志采用结构化数组，每条包含 `id`, `timestamp`, `type`, `message`。`type` 分为 `info` | `success` | `error` | `warning`。日志自动滚动到底部，上限 50 条。

### 7. 历史记录
使用 `localStorage` 持久化，key 为 `CODE2DOC_HISTORY_V1`，最多保存 10 条。记录包含原始代码、配置、分析结果。标题自动生成规则：优先提取第一个类名/函数名，否则截取代码前 20 字。

### 8. shadcn/ui 组件规范
项目使用 shadcn/ui `base-nova` 风格，组件底层基于 `@base-ui/react` 原语而非 Radix UI。新增 UI 组件时：
- 样式使用 `class-variance-authority` (cva) 管理变体
- 工具类组合使用 `cn()`（来自 `lib/utils.ts`）
- 颜色变量依赖 CSS 自定义属性（`--color-primary`, `--color-accent` 等）
- **特别注意**：`AlertDialogTrigger`、`PopoverTrigger` 等应使用 `render` 属性传入 Button，而不是将 Button 作为子元素嵌套，避免 `<button>` 嵌套 `<button>` 的 hydration error

---

## 代码风格指南

- **文件命名**: 组件文件使用 `kebab-case.tsx`，组件名使用 `PascalCase`
- **路径别名**: 统一使用 `@/` 前缀（`@/components`, `@/lib`, `@/hooks`）
- **注释风格**: 代码注释以中文为主，常用标记：
  - `[第二轮新增]` / `[第三轮新增]` / `[第四轮新增]` / `[第五轮新增]` —— 标识迭代新增的功能
  - `[修复]` —— 标识 bug 修复
  - 函数级 JSDoc 用于说明用途
- **UI 文本风格**: 界面标签大量使用 `text-[10px]` / `text-[11px]`、`font-bold`、`uppercase`、`tracking-wider/tracking-widest`，配色以 slate、blue、emerald 为主
- **TypeScript**: 严格模式开启 (`"strict": true`)，无隐式 any

---

## 测试说明

本项目**当前未配置任何测试框架**，也没有测试文件。若需添加测试，建议：
- 单元测试：选择 `vitest` 测试 `lib/` 下的纯函数（如 `stream-parser.ts`, `summary.ts`, `storage.ts`, `ai-config.ts`）
- 组件测试：使用 `@testing-library/react`
- E2E 测试：使用 `playwright` 测试核心用户流（粘贴代码 → 生成 → 导出）

---

## 安全与部署注意事项

1. **API Key 暴露风险**：`NEXT_PUBLIC_GEMINI_API_KEY` 会在浏览器中可见。项目当前无后端代理，这是架构上的已知权衡。若需保护密钥，应增加 Next.js API Route 作为代理层。用户也可在应用内「模型配置」面板中直接填写密钥，密钥仅保存在用户本地 `localStorage` 中。
2. **Standalone 输出**：`next.config.ts` 中设置 `output: 'standalone'`，用于容器化部署（如 Cloud Run、Docker）。
3. **SELinux 兼容性**：在 CentOS Stream 10 等较新系统上，SELinux Enforcing 模式可能导致 `lightningcss` 等原生模块触发 `SIGBUS` 崩溃。部署前建议将 SELinux 设为 Permissive：
   ```bash
   sudo setenforce 0
   sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
   ```
4. **防火墙配置**：生产服务器默认监听 3000 端口，需确保防火墙放行该端口。
5. **HMR 控制**：开发配置中检测 `DISABLE_HMR` 环境变量，若设为 `true` 则禁用文件监听，防止 agent 编辑时触发频繁刷新。
6. **AI 配额**：使用公有云模型时，请遵守对应平台的每日请求配额。`ai-client.ts` 中对 429 错误做了统一提示。

---

## 常用修改场景速查

| 场景 | 目标文件 |
|---|---|
| 新增/修改支持的 AI 模型或提供商 | `lib/ai-config.ts` + `lib/types.ts` + `lib/ai-client.ts` |
| 修改 AI 调用参数（温度、Token 限制等） | `lib/ai-client.ts` 对应 Client 类 |
| 修改系统提示词/输出格式要求 | `lib/prompt-template.ts` |
| 修改三栏布局比例或面板结构 | `components/workspace-layout.tsx` |
| 新增全局状态 | `lib/context.tsx` + `lib/types.ts` |
| 修改 UI 主题色 | `app/globals.css`（`:root` 与 `.dark` 变量） |
| 修改统计摘要算法 | `lib/summary.ts` |
| 修改历史记录存储逻辑 | `lib/storage.ts` |
| 修改模型配置弹窗 UI | `components/model-config-dialog.tsx` |
| 新增/修改 UI 组件 | `components/ui/`（遵循 shadcn/base-nova 风格） |
