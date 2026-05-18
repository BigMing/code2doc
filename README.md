# Code2Doc — 代码需求文档智能生成器

Code2Doc 是一款旨在解决长期运行系统中需求文档缺失、版本不对应、注释不完善等痛点的工具。用户粘贴源代码后，应用调用 AI 模型进行深度分析，将工程代码翻译并组织为标准化需求文档，同时补全规范注释。

## 核心功能

- **多模型智能代码分析**: 支持 Google Gemini、OpenAI、Anthropic Claude、阿里通义千问、智谱 GLM、DeepSeek、Kimi (Moonshot) 等主流模型，以及私有化部署的自定义模型（兼容 OpenAI 格式）。
- **模型自主配置**: 顶部工具栏提供「模型配置」面板，可自主选择模型提供商、填写 API Key、配置自定义 API 地址（私有化部署）。
- **结构化需求文档**: 自动生成包含功能概述、模块职责、输入参数、输出参数、业务流程、关键逻辑说明及异常处理的 Markdown 文档。
- **注释补全**: 自动补全 Javadoc/JSDoc/PyDoc 等风格的标准化注释。
- **三栏结果页**: 原始代码、需求文档、注释代码同屏展示，支持拖拽调整分栏大小与互操作。
- **流式响应 + 打字机效果**: AI 分析过程实时流式展示，文档与代码以打字机动画逐字渲染，支持跳过动画。
- **Token 用量统计**: 实时展示 LLM 响应的 Token 消耗（输入 / 输出 / 总计）。
- **文件上传**: 支持直接上传代码源文件（.java/.py/.js/.ts 等）或 .txt 文件，自动识别语言并填充。
- **Markdown 导出**: 一键导出包含完整文档与代码的归档 Markdown 文件。
- **历史记录**: 分析结果可保存到本地，最多保留 10 条历史记录，随时加载复用。Docker 部署时数据持久化到服务器挂载卷。
- **工作日志**: 实时展示分析流程日志与统计摘要（方法数、类数、章节数、业务规则数、Token 用量等）。

## 技术栈

- **框架**: Next.js 15 (App Router), React 19, TypeScript 5.9
- **AI 系统**: 统一 AI 调用层 (`lib/ai-client.ts`)，兼容 Gemini SDK 与 OpenAI 格式 API
  - 支持模型: Gemini 3 Flash / 2.5 Flash、GPT-4o / GPT-4o Mini、Claude 3.5 Sonnet、Qwen Max / Plus / Turbo、GLM-4、DeepSeek-V3 / R1、Moonshot V1 等
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
   > 注：若不在环境变量中配置，也可在应用顶部的「模型配置」面板中直接选择模型并填写 API Key。

3. **启动开发服务器**:
   ```bash
   npm run dev
   ```

4. **访问应用**:
   打开 [http://localhost:3000](http://localhost:3000) 即可开始使用。

## Docker 部署（推荐）

项目已内置 Dockerfile 与 docker-compose.yml，支持一键容器化部署，数据自动持久化到宿主机本地目录。

### 快速启动

```bash
# 1. 克隆代码到服务器
git clone https://github.com/BigMing/code2doc.git
cd code2doc

# 2. 构建镜像并启动容器
docker compose up -d --build

# 3. 查看日志
docker compose logs -f
```

访问 `http://localhost:3000` 即可使用。

### 数据持久化

历史记录与模型配置默认持久化到 `./data` 目录（相对 `docker-compose.yml` 的位置），可通过 volume 挂载自定义宿主机路径：

```yaml
# docker-compose.yml
volumes:
  - /your/local/data/path:/app/data
```

### 常用命令

```bash
# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看容器状态
docker compose ps

# 数据备份
cp -r ./data /backup/code2doc-data
```

## 服务器直接部署

本项目使用 Next.js `output: 'standalone'` 配置，也支持直接在服务器上部署。

### 环境准备

- **Node.js**: 建议 v20 或更高版本
- **系统要求**: Linux (推荐 CentOS/RHEL/Ubuntu)，x86_64 架构
- **内存**: 建议至少 4GB 可用内存（Next.js 编译过程内存消耗较大）

### 部署步骤

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

### 防火墙与端口配置

开发服务器和生产服务器默认均监听 **3000 端口**。若需要从外部访问，请确保防火墙放行该端口：

```bash
# firewalld (CentOS/RHEL/Fedora)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# ufw (Ubuntu/Debian)
sudo ufw allow 3000/tcp
```

### 使用进程管理器持久运行（推荐）

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

### 使用 Nginx 反向代理（可选）

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

### SELinux 注意事项（CentOS Stream 10）

在较新的 CentOS Stream 10 系统上，SELinux Enforcing 模式可能与 `lightningcss` 等原生编译模块产生冲突，导致 Next.js 编译或运行时出现 **SIGBUS（总线错误）** 崩溃。

**解决方案**：将 SELinux 设为 Permissive 模式：

```bash
# 临时生效
sudo setenforce 0

# 永久生效（需重启）
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

### 模型配置说明

部署完成后，访问应用地址，在顶部工具栏点击 **「模型配置」** 按钮：

- **公有云模型**：选择 Gemini / OpenAI / Claude / 阿里千问 / Kimi，填写对应平台的 API Key 即可。
- **私有化部署模型**：选择「通义千问（私有化）」、「智谱 GLM」或「DeepSeek」，填写 API Key（如需要）和自定义 API 地址（如 `http://your-internal-server:8000/v1`）。

Docker 部署时，配置会自动持久化到服务器挂载卷，换浏览器或清理缓存后数据不会丢失。

## 项目结构（精简）

```
app/                    # Next.js App Router
  api/data/             # 服务端文件存储 API（Docker 持久化）
  layout.tsx            # 根布局
  page.tsx              # 首页
  globals.css           # Tailwind 入口、主题变量
components/             # React 组件（全部使用 'use client'）
  ui/                   # shadcn/ui 原语
  workspace-layout.tsx  # 三栏分屏核心布局
  input-panel.tsx       # 代码输入、文件上传、生成按钮
  doc-panel.tsx         # Markdown 文档渲染
  code-panel.tsx        # 语法高亮代码展示
  log-panel.tsx         # 工作日志与 Token 统计
  top-action-bar.tsx    # 全局操作栏
  model-config-dialog.tsx # 模型配置弹窗
  history-popover.tsx   # 历史记录面板
  logo.tsx              # 品牌 Logo
lib/
  ai-client.ts          # 统一 AI 调用层（多模型分发，含 Token 提取）
  ai-config.ts          # 模型配置定义与持久化
  server-storage.ts     # 服务端存储 API 调用封装
  context.tsx           # 全局状态管理
  prompt-template.ts    # 系统提示词
  types.ts              # TypeScript 类型定义
  storage.ts            # 历史记录存储（localStorage + API 双写）
```

## 备注

- 本项目 AI API 调用均发生在浏览器端。API Key 可选择保存在浏览器 localStorage 中（开发模式），或随 Docker 数据卷持久化到服务器（Docker 部署模式）。
- 使用公有云模型时，请遵守对应平台的每日请求配额与使用条款。
