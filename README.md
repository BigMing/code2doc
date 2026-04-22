# Code2Doc — 代码需求文档智能生成器

Code2Doc 是一款旨在解决长期运行系统中需求文档缺失、版本不对应、注释不完善等痛点的原型工具。它能够将工程代码翻译并组织为标准化需求文档，同时补全规范注释。

## 核心功能

- **智能代码分析**: 基于 Gemini 1.5 Flash 深度分析代码逻辑。
- **结构化需求文档**: 自动生成包含功能概述、模块职责、业务流程、关键逻辑、接口定义及异常处理的 Markdown 文档。
- **注释补全**: 自动补全 Javadoc/JSDoc/PyDoc 等风格的标准化注释。
- **三栏结果页**: 原始代码、需求文档、注释代码同屏展示，支持互操作。
- **Markdown 导出**: 一键导出包含完整文档与代码的归档 Markdown。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **AI 系统**: Google Gemini AI (@google/genai)
- **样式**: Tailwind CSS (v4)
- **图标**: Lucide React
- **辅助库**: react-markdown (文档渲染), react-syntax-highlighter (代码高亮), motion (动画)

## 本地开发指南

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **配置环境变量**:
   创建 `.env.local` 文件并添加您的 Google API Key (从 Google AI Studio 获取):
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```

3. **启动开发服务器**:
   ```bash
   npm run dev
   ```

4. **访问应用**:
   打开 [http://localhost:3000](http://localhost:3000) 即可开始使用。

## 备注

本项目使用 Google AI Studio 免费层，请遵守每日请求配额。

- 模型版本: `gemini-1.5-flash` / `gemini-3-flash-preview`
- 每日限额: 约 250 次请求 (取决于模型配额)
