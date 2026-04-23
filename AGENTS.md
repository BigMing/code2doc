# Code2Doc — 项目指南

本文档面向 AI Coding Agent。阅读前请确认你已了解：本项目是一个基于 Next.js 的单页 Web 应用，所有 UI 文本与代码注释均使用中文。

---

## 项目概述

Code2Doc（代码需求文档智能生成器）是一款将工程源代码翻译为标准化需求文档，并自动补全规范注释的原型工具。

用户粘贴源代码后，应用调用 Google Gemini AI 进行深度分析，返回三份产物：
1. **一句话功能概括**（summary）
2. **结构化需求文档**（requirementDoc）—— Markdown 格式，固定包含：功能概述 → 模块职责 → 业务流程 → 关键逻辑 → 接口定义 → 异常处理
3. **补全注释后的代码**（annotatedCode）—— 在类/方法定义、复杂算法、边界条件处添加标准注释块

前端采用三栏分屏工作区（日志+输入区、需求文档预览区、注释代码预览区），支持同屏互操作与 Markdown 导出。

---

## 技术栈

- **框架**: Next.js 15 (App Router), React 19, TypeScript 5.9
- **AI 系统**: Google Gemini AI (`@google/genai`)
  - 主模型: `gemini-3-flash-preview`
  - 降级模型: `gemini-2.5-flash`
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
  top-action-bar.tsx    # 全局操作栏：保存分析、历史记录、跳过动画、重置
  history-popover.tsx   # 历史记录下拉面板（基于 Popover + AlertDialog）

hooks/                  # 自定义 Hooks
  use-typewriter.ts     # 打字机效果（支持动态加速与跳过）
  use-stream-log.ts     # 流式接收进度日志（防抖）
  use-mobile.ts         # 移动端断点检测（768px）

lib/                    # 工具与核心逻辑
  gemini.ts             # Gemini API 封装：语言检测、流式分析、结构化 JSON 输出
  prompt-template.ts    # 系统提示词（SYSTEM_PROMPT）与分析提示词构造
  stream-parser.ts      # 从流式文本中提取/容错解析 JSON
  context.tsx           # 全局 React Context：状态管理与流式/打字机状态调度
  types.ts              # 核心 TypeScript 类型定义
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
# 必须：Google Gemini API Key（从 Google AI Studio 获取）
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here

# 可选：应用托管 URL（用于自引用链接等）
APP_URL=http://localhost:3000
```

> ⚠️ **关键说明**：AI API Key 通过 `NEXT_PUBLIC_` 前缀暴露到客户端，因为所有 Gemini 调用均发生在浏览器端（无后端 API Route 代理）。在 AI Studio 部署环境中，该变量由平台自动注入。

---

## 代码组织与架构约定

### 1. 纯客户端应用
所有业务组件与逻辑均标记 `'use client'`。没有使用 Next.js API Routes，也没有服务端渲染的数据获取逻辑。

### 2. 状态管理
全局状态统一通过 `lib/context.tsx` 中的 `AppContext` 管理。Context 包含：
- 原始代码、分析配置、分析结果
- 工作日志队列（最多保留最近 50 条）
- 流式接收状态（`isStreaming`, `accumulatedRawText` 等）
- 打字机动画状态（`isTypewriting`, `fullDocText`, `fullCodeText`）
- 原始请求/响应报文（用于调试面板）

组件通过 `useAppContext()` 消费状态。若需新增全局状态，应扩展 `AppState` 接口并在 `AppProvider` 中添加对应的 `useState` + 回调函数。

### 3. 流式处理链路
`input-panel.tsx` 是主要调度者，流程如下：
1. 用户点击「生成需求文档」
2. 创建 `AbortController`，调用 `streamStart()` 重置状态
3. 调用 `lib/gemini.ts` 的 `streamAnalyzeCode()` 获取异步生成器
4. 循环 `yield` 接收 chunk，调用 `streamChunk()` 更新累积文本
5. 流结束后，用 `stream-parser.ts` 的 `extractJsonFromStream()` 解析 JSON
6. 调用 `streamEnd(parsedResult)` 触发打字机效果
7. `doc-panel.tsx` 与 `code-panel.tsx` 中的 `useTypewriter` Hook 接管逐字渲染

### 4. 日志系统
工作日志采用结构化数组，每条包含 `id`, `timestamp`, `type`, `message`。`type` 分为 `info` | `success` | `error` | `warning`。日志自动滚动到底部，上限 50 条。

### 5. 历史记录
使用 `localStorage` 持久化，key 为 `CODE2DOC_HISTORY_V1`，最多保存 10 条。记录包含原始代码、配置、分析结果。标题自动生成规则：优先提取第一个类名/函数名，否则截取代码前 20 字。

### 6. shadcn/ui 组件规范
项目使用 shadcn/ui `base-nova` 风格，组件底层基于 `@base-ui/react` 原语而非 Radix UI。新增 UI 组件时：
- 样式使用 `class-variance-authority` (cva) 管理变体
- 工具类组合使用 `cn()`（来自 `lib/utils.ts`）
- 颜色变量依赖 CSS 自定义属性（`--color-primary`, `--color-accent` 等）

---

## 代码风格指南

- **文件命名**: 组件文件使用 `kebab-case.tsx`，组件名使用 `PascalCase`
- **路径别名**: 统一使用 `@/` 前缀（`@/components`, `@/lib`, `@/hooks`）
- **注释风格**: 代码注释以中文为主，常用标记：
  - `[第二轮新增]` / `[第三轮新增]` / `[第四轮新增]` —— 标识迭代新增的功能
  - `[修复]` —— 标识 bug 修复
  - 函数级 JSDoc 用于说明用途
- **UI 文本风格**: 界面标签大量使用 `text-[10px]` / `text-[11px]`、`font-bold`、`uppercase`、`tracking-wider/tracking-widest`，配色以 slate、blue、emerald 为主
- **TypeScript**: 严格模式开启 (`"strict": true`)，无隐式 any

---

## 测试说明

本项目**当前未配置任何测试框架**，也没有测试文件。若需添加测试，建议：
- 单元测试：选择 `vitest` 测试 `lib/` 下的纯函数（如 `stream-parser.ts`, `summary.ts`, `storage.ts`）
- 组件测试：使用 `@testing-library/react`
- E2E 测试：使用 `playwright` 测试核心用户流（粘贴代码 → 生成 → 导出）

---

## 安全与部署注意事项

1. **API Key 暴露风险**：`NEXT_PUBLIC_GEMINI_API_KEY` 会在浏览器中可见。项目当前无后端代理，这是架构上的已知权衡。若需保护密钥，应增加 Next.js API Route 作为代理层。
2. **Standalone 输出**：`next.config.ts` 中设置 `output: 'standalone'`，用于容器化部署（如 Cloud Run）。
3. **HMR 控制**：开发配置中检测 `DISABLE_HMR` 环境变量，若设为 `true` 则禁用文件监听，防止 agent 编辑时触发频繁刷新。
4. **AI 配额**：项目使用 Google AI Studio 免费层，每日限额约 250 次请求。`gemini.ts` 中对 429 错误做了专门提示。
5. **JSON Schema 约束**：非流式请求时，Gemini 输出强制绑定 JSON Schema（`summary`, `requirementDoc`, `annotatedCode` 三个必填字段），以提升解析稳定性。

---

## 常用修改场景速查

| 场景 | 目标文件 |
|---|---|
| 修改 AI 模型或温度参数 | `lib/gemini.ts` |
| 修改系统提示词/输出格式要求 | `lib/prompt-template.ts` |
| 修改三栏布局比例或面板结构 | `components/workspace-layout.tsx` |
| 新增全局状态 | `lib/context.tsx` + `lib/types.ts` |
| 修改 UI 主题色 | `app/globals.css`（`:root` 与 `.dark` 变量） |
| 修改统计摘要算法 | `lib/summary.ts` |
| 修改历史记录存储逻辑 | `lib/storage.ts` |
| 新增/修改 UI 组件 | `components/ui/`（遵循 shadcn/base-nova 风格） |
