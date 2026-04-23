# Code2Doc — 代码需求文档智能生成器

Code2Doc 是一款旨在解决长期运行系统中需求文档缺失、版本不对应、注释不完善等痛点的工具。用户粘贴源代码后，应用调用 AI 模型进行深度分析，将工程代码翻译并组织为标准化需求文档，同时补全规范注释。

## 核心功能

- **多模型智能代码分析**: 支持 Google Gemini、OpenAI、Anthropic Claude、阿里通义千问、智谱 GLM、DeepSeek 等主流模型，以及私有化部署的自定义模型（兼容 OpenAI 格式）。
- **模型自主配置**: 顶部工具栏提供「模型配置」面板，可自主选择模型提供商、填写 API Key、配置自定义 API 地址（私有化部署）。
- **结构化需求文档**: 自动生成包含功能概述、模块职责、业务流程、关键逻辑、接口定义及异常处理的 Markdown 文档。
- **注释补全**: 自动补全 Javadoc/JSDoc/PyDoc 等风格的标准化注释。
- **三栏结果页**: 原始代码、需求文档、注释代码同屏展示，支持拖拽调整分栏大小与互操作。
- **流式响应 + 打字机效果**: AI 分析过程实时流式展示，文档与代码以打字机动画逐字渲染，支持跳过动画。
- **Markdown 导出**: 一键导出包含完整文档与代码的归档 Markdown 文件。
- **历史记录**: 分析结果可保存到本地（localStorage），最多保留 10 条历史记录，随时加载复用。
- **工作日志**: 实时展示分析流程日志与统计摘要（方法数、类数、章节数、业务规则数等）。

## 技术栈

- **框架**: Next.js 15 (App Router), React 19, TypeScript 5.9
- **AI 系统**: 统一 AI 调用层 (`lib/ai-client.ts`)，兼容 Gemini SDK 与 OpenAI 格式 API
  - 支持模型: Gemini 3 Flash / 2.5 Flash、GPT-4o / GPT-4o Mini、Claude 3.5 Sonnet、Qwen Max / Plus / Turbo、GLM-4、DeepSeek-V3 / R1 等
- **样式**: Tailwind CSS (v4)
- **UI 组件**: shadcn/ui (base-nova 风格，底层基于 `@base-ui/react`)
- **图标**: Lucide React
- **辅助库**: react-markdown (文档渲染), react-syntax-highlighter (代码高亮), motion (动画), react-resizable-panels (分屏)

## 本地开发指南

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **配置环境变量**（可选）:
   创建 `.env.local` 文件并添加默认 Google API Key:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
   > 注：若不在环境变量中配置，也可在应用顶部的「模型配置」面板中直接选择模型并填写 API Key，配置会自动保存到浏览器 localStorage。

3. **启动开发服务器**:
   ```bash
   npm run dev
   ```

4. **访问应用**:
   打开 [http://localhost:3000](http://localhost:3000) 即可开始使用。

## 服务器部署指南

本项目使用 Next.js `output: 'standalone'` 配置，适合容器化或服务器直接部署。

### 1. 环境准备

- **Node.js**: 建议 v20 或更高版本（当前开发环境使用 v22.22.2）
- **系统要求**: Linux (推荐 CentOS/RHEL/Ubuntu)，x86_64 架构
- **内存**: 建议至少 4GB 可用内存（Next.js 编译过程内存消耗较大）

### 2. 部署步骤

```bash
# 1. 克隆代码到服务器
git clone https://github.com/BigMing/code2doc.git
cd code2doc

# 2. 安装依赖
npm install

# 3. 生产构建
npm run build

# 4. 启动生产服务器（默认监听 3000 端口）
npm run start
```

### 3. 防火墙与端口配置

开发服务器和生产服务器默认均监听 **3000 端口**。若需要从外部访问，请确保防火墙放行该端口：

```bash
# firewalld (CentOS/RHEL/Fedora)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# ufw (Ubuntu/Debian)
sudo ufw allow 3000/tcp
```

### 4. 使用进程管理器持久运行（推荐）

使用 `pm2` 或 `systemd` 确保服务在后台持久运行：

```bash
# 安装 pm2
npm install -g pm2

# 启动（使用 cluster 模式可充分利用多核）
pm2 start npm --name "code2doc" -- start

# 设置开机自启
pm2 startup
pm2 save
```

### 5. 使用 Nginx 反向代理（可选）

若需绑定域名或使用 HTTPS，可通过 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. SELinux 注意事项（CentOS Stream 10）

在较新的 CentOS Stream 10 系统上，SELinux Enforcing 模式可能与 `lightningcss` 等原生编译模块产生冲突，导致 Next.js 编译或运行时出现 **SIGBUS（总线错误）** 崩溃。

**解决方案**：将 SELinux 设为 Permissive 模式：

```bash
# 临时生效
sudo setenforce 0

# 永久生效（需重启）
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

### 7. 模型配置说明

部署完成后，访问应用地址，在顶部工具栏点击 **「模型配置」** 按钮：

- **公有云模型**：选择 Gemini / OpenAI / Claude / 阿里千问，填写对应平台的 API Key 即可。
- **私有化部署模型**：选择「通义千问（私有化）」、「智谱 GLM」或「DeepSeek」，填写 API Key（如需要）和自定义 API 地址（如 `http://your-internal-server:8000/v1`）。

所有配置自动保存到浏览器 localStorage，无需在服务器上配置环境变量。

## 项目结构（精简）

```
app/                    # Next.js App Router
components/             # React 组件
  ui/                   # shadcn/ui 原语
  workspace-layout.tsx  # 三栏分屏核心布局
  input-panel.tsx       # 代码输入与生成按钮
  doc-panel.tsx         # Markdown 文档渲染
  code-panel.tsx        # 语法高亮代码展示
  top-action-bar.tsx    # 全局操作栏（保存/历史/模型配置）
  model-config-dialog.tsx # 模型配置弹窗
  history-popover.tsx   # 历史记录面板
lib/
  ai-client.ts          # 统一 AI 调用层（多模型分发）
  ai-config.ts          # 模型配置定义与持久化
  context.tsx           # 全局状态管理
  prompt-template.ts    # 系统提示词
  types.ts              # TypeScript 类型定义
```

## 备注

- 本项目为纯客户端应用，所有 AI API 调用均发生在浏览器端。API Key 以 `localStorage` 形式保存在用户本地，不会上传到服务器。
- 使用公有云模型时，请遵守对应平台的每日请求配额与使用条款。
