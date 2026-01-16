# ===============================
# Stage 1 — Build (Vite + React + TS)
# ===============================

FROM node:20-alpine AS builder

WORKDIR /app

# 只复制依赖清单 (加速缓存)
COPY package.json package-lock.json* ./

RUN npm install

# 复制全部源码（包含 .env.local）
COPY . .

# 执行你真实的构建命令
RUN npm run build


# ===============================
# Stage 2 — Runtime (Nginx)
# ===============================

FROM nginx:alpine

# 删除默认站点
RUN rm /etc/nginx/conf.d/default.conf

# 使用你项目自带 nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝 Vite 构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露 nginx 端口
EXPOSE 80

# 前台运行
CMD ["nginx", "-g", "daemon off;"]
