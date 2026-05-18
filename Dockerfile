# Code2Doc Docker 镜像
# 多阶段构建：先构建 Next.js standalone，再运行

# ========== 构建阶段 ==========
FROM node:22-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# ========== 运行阶段 ==========
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# standalone 输出包含所有必要文件
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 创建数据持久化目录
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
