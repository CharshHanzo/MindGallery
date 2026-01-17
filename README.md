# MindGallery - AI图像分析应用

基于单仓库（Monorepo）架构的AI图像分析应用，包含前端（Vue 3）和后端（Fastify）服务。

## 项目结构

```
mindgallery-monorepo/
├── packages/
│   ├── frontend/          # Vue 3 前端应用
│   └── backend/           # Fastify 后端API服务
├── package.json           # 根目录配置
├── docker-compose.yml     # Docker 编排配置
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 在根目录安装所有依赖
npm run install:all
```

### 2. 开发模式启动

```bash
# 同时启动前端和后端服务
npm run dev
```

或者分别启动：

```bash
# 只启动前端
npm run dev:frontend

# 只启动后端
npm run dev:backend
```

### 3. Docker 部署

```bash
# 启动所有服务（包括数据库）
npm run docker:up

# 停止服务
npm run docker:down
```

## 服务端口

- **前端**: http://localhost:5173
- **后端API**: http://localhost:3000
- **数据库**: PostgreSQL on localhost:5432

## 开发命令

- `npm run build` - 构建所有包
- `npm run lint` - 运行代码检查
- `npm run docker:up` - Docker 启动
- `npm run docker:down` - Docker 停止

## 技术栈

- **前端**: Vue 3, TypeScript, Vite, Pinia, Axios
- **后端**: Fastify, TypeScript, PostgreSQL (pgvector)
- **AI**: Ollama (本地AI模型)
- **数据库**: PostgreSQL with pgvector 扩展
- **容器化**: Docker, Docker Compose