# DreamForge - 类即梦多模态 AI 创作平台

基于 LobeHub 式"任意 LLM 接入"的理念，向前再走一步——允许用户自由组合"任意文字 API + 任意图像 API + 任意视频 API"，构建一套像即梦一样支持文生图、图生图、文生视频、图生视频、首尾帧、智能画布的端到端创作平台。

## 核心特性

- 🔓 **任意 Provider 接入** - 任何兼容 OpenAI 协议的 LLM、图像、视频 API 都能接入
- 🎨 **多模态创作** - 文生图、图生图、文生视频、图生视频、首尾帧模式
- 🧩 **流水线编排** - LLM 导演 + 图像生成 + 视频生成，可视化节点串起创作流程
- 🖼️ **智能画布** - 消除笔、局部重绘、无损扩图、高清放大
- 📦 **资产管理** - 版本谱系、可追溯、可复现、可计费
- 🔒 **完全自托管** - 数据、模型、资产全部在你掌控中

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Next.js 14 (App Router) + React 18 + Zustand |
| 状态管理 | Zustand (slice 模式) |
| 数据获取 | SWR + tRPC |
| 后端 | Next.js Route Handlers + 独立 Worker |
| 消息队列 | BullMQ + Redis |
| 数据库 | PostgreSQL 14+ (Prisma) |
| 对象存储 | S3 兼容 (MinIO/R2/AWS S3) |
| 鉴权 | Better Auth |

## 项目结构

```
dreamforge-ai/
├── apps/
│   ├── web/              # Next.js Web 应用
│   │   └── src/
│   │       ├── app/      # App Router 页面
│   │       ├── components/
│   │       ├── features/
│   │       ├── lib/      # auth, trpc, utils
│   │       ├── server/   # tRPC 路由
│   │       └── stores/   # Zustand stores
│   └── worker/           # 独立 Worker 服务（异步任务处理）
├── packages/
│   ├── db/               # Prisma 数据库层
│   ├── types/            # 共享类型定义
│   ├── model-runtime/    # LLM 运行时抽象
│   ├── image-runtime/    # 图像生成运行时抽象
│   ├── video-runtime/    # 视频生成运行时抽象
│   ├── providers/        # 提供商管理服务
│   ├── tasks/            # 任务服务
│   ├── queue/            # 队列服务 (BullMQ)
│   ├── billing/          # 计费与配额服务
│   ├── assets/           # 资产管理服务
│   └── storage/          # S3 存储服务
├── docker-compose.yml    # 开发环境
├── Dockerfile.web
├── Dockerfile.worker
└── .env.example
```

## 快速开始

### 1. 使用 Docker Compose（推荐）

```bash
# 复制环境变量
cp .env.example .env

# 启动所有服务
docker compose up -d

# 初始化数据库
docker compose exec web pnpm db:push

# 打开应用
# http://localhost:3000
```

### 2. 本地开发

```bash
# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 配置数据库、Redis、S3 等

# 启动依赖服务（PostgreSQL, Redis, MinIO）
docker compose up postgres redis minio -d

# 初始化数据库
pnpm db:generate
pnpm db:push

# 启动 Web 服务
pnpm dev

# 另开终端启动 Worker
pnpm dev:worker
```

## 配置提供商

1. 登录后进入 **设置 → 提供商管理**
2. 点击"添加提供商"
3. 填写提供商信息：
   - **ID**: 唯一标识（如 `my-sd-cluster`）
   - **Base URL**: 提供商 API 端点
   - **协议**: OpenAI 兼容 / Apimart / 原生
   - **API Key**: 你的密钥
   - **模型列表**: 逗号分隔（如 `flux-2, sd-xl, kolors`）
4. 保存后即可在创作工作台使用

### 支持的提供商类型

任何兼容以下协议的服务都能接入：

- **OpenAI 兼容协议** - 大多数 AI API 都兼容（OpenAI、Together、Groq、Replicate、自建 SD/FLUX 等）
- **Apimart 协议**
- **原生协议**（通过扩展适配）

## 核心模块

### 文生图
- 提示词 + LLM 智能润色
- 画面比例、画质、生成数量控制
- 种子（Seed）精确复现
- 负面提示词

### 图生图
- 参考图上传
- 重绘强度控制（0-1）
- 多图融合（最多 9 张）

### 视频生成
- 文生视频 / 图生视频
- 时长、分辨率、运镜方式控制
- 首尾帧精确控制
- 运动强度调节

### 工作流编排
- 可视化节点编辑器
- LLM 导演生成结构化 Brief
- 多步骤自动执行
- 节点间资产传递

## 架构设计

### 六层架构

```
┌─────────────────────────────────────────────────────────┐
│  Frontend Layer  │  Next.js RSC + SPA 混合 + Canvas 编辑器 │
├─────────────────────────────────────────────────────────┤
│  API Gateway     │  RESTful（流式/文件）+ tRPC（业务）      │
├─────────────────────────────────────────────────────────┤
│  Orchestration   │  创作流水线引擎 / 智能体编排             │
├─────────────────────────────────────────────────────────┤
│  Multi-Provider Abstraction │  LLM + Image + Video 适配层  │
├─────────────────────────────────────────────────────────┤
│  Async Task Fabric │  队列 + 状态机 + 轮询/回调/Webhook    │
├─────────────────────────────────────────────────────────┤
│  Infra & Storage │  PostgreSQL + Redis + S3(MinIO)       │
└─────────────────────────────────────────────────────────┘
```

### 混合抽象设计

- **通用字段**（prompt、model、aspect_ratio、strength）走统一接口
- **提供商特有字段**通过 `vendor_params` 透传至原生 provider

### 任务状态机

```
created → queued → running → succeeded
                           ↓
                         failed
                           ↓
                        retrying
```

## 部署

### 生产环境建议

- **Web 服务**: 独立部署（Vercel / Docker / K8s）
- **Worker 服务**: 独立部署，支持水平扩展（K8s HPA）
- **PostgreSQL**: 托管服务（Supabase / Neon / AWS RDS）
- **Redis**: 托管服务（Upstash / Redis Cloud）
- **S3 存储**: Cloudflare R2 / AWS S3 / 自建 MinIO

### 环境变量

参见 `.env.example` 文件，所有配置项都有详细说明。

## 开发路线图

- ✅ **Phase 1**: 项目脚手架 + 鉴权 + LLM 抽象层 + 提供商管理 UI
- ✅ **Phase 2**: Image Provider 抽象层 + 任务队列 + 文生图/图生图 UI + 资产库
- ✅ **Phase 3**: Video Provider 抽象层 + 文生视频/图生视频 UI
- 🚧 **Phase 4**: 流水线编排 + Brief 结构化生成
- 🚧 **Phase 5**: 智能画布（Canvas 编辑器）
- 🚧 **Phase 6**: 计费系统 + 订阅套餐 + 内容审核
- 🚧 **Phase 7**: 企业级特性（多租户、区域路由、开放 API）

## License

MIT
