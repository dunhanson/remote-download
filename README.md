# remote-download 离线下载服务

用户通过网页提交远程文件 URL，由服务器代理下载，生成独立下载链接供用户高速下载。

## 功能特性

- 在线提交下载任务，支持批量 URL 提交
- 异步下载与实时进度监控（已下载字节、网速、百分比）
- 下载状态跟踪（等待中、下载中、已完成、下载失败）
- 断点续传支持（大文件）
- 下载失败自动重试
- 生成独立下载链接，支持签名认证
- 暗色/亮色主题切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Nuxt 4 (全栈) |
| UI | Vue 3 + Element Plus |
| 数据库 | SQLite (better-sqlite3) |
| 任务队列 | BullMQ + Redis |
| 下载 | axios stream + Range 支持 |

## 项目结构

```
remote-download/
├── app/
│   ├── components/       # UI 组件 (UrlInput, TaskItem, TaskList, ProgressBar, StatusBadge, ThemeToggle)
│   ├── pages/index.vue  # 首页
│   ├── composables/     # useTasks, useTheme, useUser
│   └── assets/css/      # 全局样式
├── server/
│   ├── api/             # API 接口 (tasks, user)
│   ├── routes/          # 文件下载路由
│   ├── database/        # SQLite 数据库层
│   ├── services/        # 下载服务、队列服务
│   └── utils/           # 工具函数
├── config/              # 配置文件
└── storage/downloads/   # 下载文件存储目录
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置

创建 `.env` 文件：

```bash
# Redis 配置（可选，使用 SQLite 作为默认队列驱动）
REDIS_URL=redis://localhost:6379
QUEUE_DRIVER=sqlite

# 下载配置
DOWNLOAD_ROOT_PATH=/data/downloads
PUBLIC_URL=https://download.example.com
```

### 启动服务

```bash
npm run dev
```

## API 接口

### 用户相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/create` | 创建新用户 |
| GET | `/api/user/info` | 获取用户信息 |

### 任务相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tasks` | 批量创建任务 |
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/tasks/:id` | 任务详情 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/tasks/:id/retry` | 重试失败任务 |
| GET | `/api/tasks/:id/progress` | 实时进度 (SSE) |

### 文件相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/files/:filename` | 下载文件（需签名验证） |

## 任务状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待中 |
| `downloading` | 下载中 |
| `completed` | 已完成 |
| `failed` | 下载失败 |

## 数据模型

### tasks 表

| 字段 | 说明 |
|------|------|
| id | 任务唯一ID |
| user_id | 用户ID |
| source_url | 原始下载地址 |
| filename | 保存的文件名 |
| filesize | 文件大小（字节） |
| downloaded | 已下载字节 |
| status | 状态 |
| speed | 下载速度 (bytes/s) |
| created_at | 创建时间 |
| completed_at | 完成时间 |

## License

MIT
