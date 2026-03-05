# AIDD Platform 前端项目设计文档

## 1. 项目概述

本项目是 AIDD Platform 的管理前端，为运维和管理人员提供可视化界面，用于监控平台运行状态、管理计算任务和 Worker 节点。

### 1.1 核心能力

- 实时查看平台健康状态与集群资源使用率
- 管理和监控计算任务的全生命周期（创建、查看、取消）
- 管理和监控 Worker 节点状态与资源
- 自动轮询机制，保持数据实时性

### 1.2 技术栈

| 层面       | 方案                      | 说明                                      |
| ---------- | ------------------------- | ----------------------------------------- |
| 框架       | Vue 3 + TypeScript        | Composition API + `<script setup>` 语法   |
| UI 组件库  | PrimeVue 4 (Aura 主题)   | DataTable / Chart / Dialog / ProgressBar  |
| 状态管理   | Pinia                     | Vue 官方推荐                               |
| 路由       | Vue Router 4              | 动态路由 + 懒加载                          |
| HTTP 客户端| Axios                     | 统一拦截器、错误处理                       |
| 工具库     | VueUse                    | `useIntervalFn` 用于轮询封装               |
| 日期处理   | date-fns                  | 格式化 + 相对时间 (中文 locale)            |
| 图表       | Chart.js (PrimeVue Chart) | 任务状态分布环形图                         |
| 构建工具   | Vite                      | 极速 HMR + API 代理                       |
| 包管理器   | pnpm                      | 高效依赖管理                               |

---

## 2. 项目结构

```
aidd-platfrom-front/
├── index.html                  # SPA 入口
├── package.json                # 依赖声明
├── vite.config.ts              # Vite 配置 (Vue 插件 + API 代理)
├── tsconfig.json               # TypeScript 根配置
├── tsconfig.app.json           # 应用 TS 配置 (@ 别名)
├── env.d.ts                    # Vite 环境类型声明
└── src/
    ├── main.ts                 # 入口：注册 PrimeVue / Pinia / Router
    ├── App.vue                 # 根组件：Toast + ConfirmDialog + Layout
    │
    ├── types/                  # TypeScript 类型定义
    │   ├── task.ts             # TaskStatus, TaskPriority, Task, QueueStatsResponse 等
    │   ├── worker.ts           # WorkerStatus, Worker, ClusterStatsResponse 等
    │   └── health.ts           # HealthResponse, DetailedHealthResponse
    │
    ├── api/                    # API 调用层
    │   ├── client.ts           # Axios 实例 (baseURL: /api/v1, 错误拦截器)
    │   ├── health.ts           # getHealth(), getDetailedHealth()
    │   ├── tasks.ts            # getTasks(), getTask(), getTaskStats(), createTask(), cancelTask()
    │   └── workers.ts          # getWorkers(), getWorker(), getWorkerStats(), deleteWorker()
    │
    ├── stores/                 # Pinia 状态管理
    │   ├── tasks.ts            # 任务列表 + 统计数据
    │   └── workers.ts          # Worker 列表 + 集群统计
    │
    ├── composables/            # 组合式函数
    │   └── usePolling.ts       # 通用轮询封装 (自动启停、失败暂停、重连)
    │
    ├── router/
    │   └── index.ts            # 5 条路由定义 (懒加载)
    │
    ├── components/             # 通用组件
    │   ├── AppLayout.vue       # 顶部导航栏 + 主内容区 + 底部版本栏
    │   ├── StatusTag.vue       # 状态彩色标签 (任务状态 / Worker 状态)
    │   ├── ResourceBar.vue     # 资源进度条 (used/total + 百分比)
    │   └── StatsCard.vue       # 统计卡片 (图标 + 数值 + 标题)
    │
    └── views/                  # 页面组件
        ├── Dashboard.vue       # 仪表盘 (总览)
        ├── TaskList.vue        # 任务列表 (筛选 + 表格 + 创建)
        ├── TaskDetail.vue      # 任务详情
        ├── WorkerList.vue      # Worker 列表
        └── WorkerDetail.vue    # Worker 详情
```

---

## 3. 页面路由设计

| 路由           | 页面组件            | 说明               |
| -------------- | ------------------- | ------------------ |
| `/`            | `Dashboard.vue`     | 仪表盘 (系统总览)  |
| `/tasks`       | `TaskList.vue`      | 任务列表           |
| `/tasks/:id`   | `TaskDetail.vue`    | 任务详情           |
| `/workers`     | `WorkerList.vue`    | Worker 列表        |
| `/workers/:id` | `WorkerDetail.vue`  | Worker 详情        |

所有路由均使用动态 `import()` 懒加载，通过 `meta.title` 设置页面标题。

---

## 4. 页面功能设计

### 4.1 仪表盘 (Dashboard)

一屏展示平台全局状态，是管理人员的首要视角。

**布局结构：**

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  平台状态     │ │  在线 Worker  │ │  运行中任务   │ │  待处理任务   │
│  StatsCard   │ │  StatsCard   │ │  StatsCard   │ │  StatsCard   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────┐
│  集群资源                                                │
│  [CPU 进度条]    [内存 进度条]    [GPU 进度条]            │
└─────────────────────────────────────────────────────────┘

┌───────────────────────────┐ ┌───────────────────────────┐
│  任务队列统计 (环形图)      │ │  Worker 节点状态列表       │
│  pending / running /       │ │  状态 + CPU% + 任务数      │
│  completed / failed        │ │  点击跳转详情              │
└───────────────────────────┘ └───────────────────────────┘
```

**数据来源与轮询：**

| 区域           | API                       | 轮询间隔 |
| -------------- | ------------------------- | -------- |
| 状态卡片       | `GET /health/detailed`    | 10s      |
| 资源 + 统计    | `GET /workers/stats` + `GET /tasks/stats` + `GET /workers` | 15s |

**断线处理：** 连续 3 次请求失败后显示黄色 banner 并暂停轮询，提供「重新连接」按钮。

---

### 4.2 任务列表 (TaskList)

**功能要素：**

- **筛选栏：** 3 个 Select 下拉框 (状态 / 服务类型 / 优先级) + 搜索框 (ID 或名称模糊匹配)
- **工具按钮：** 刷新 + 创建任务
- **DataTable：** 8 列

| 列        | 说明                                               |
| --------- | -------------------------------------------------- |
| 任务 ID   | 前 8 位，等宽字体                                    |
| 名称      | 用户自定义名称                                       |
| 服务      | admet / docking / md / qsar                        |
| 状态      | StatusTag 彩色标签                                   |
| 优先级    | critical / high / normal / low / batch             |
| Worker    | 前 8 位，可点击跳转 Worker 详情                       |
| 创建时间  | `yyyy-MM-dd HH:mm` 格式                             |
| 操作      | 详情 (跳转) + 取消 (pending/queued/running 时可用)    |

- **分页：** 默认 20 条/页，可选 10/20/50/100
- **轮询：** 15s 自动刷新
- **取消操作：** 弹出确认对话框 → `DELETE /api/v1/tasks/{id}`

**创建任务对话框 (Modal)：**

| 字段           | 类型        | 默认值  | 验证             |
| -------------- | ----------- | ------- | ---------------- |
| 服务类型 *     | Select      | -       | 必填             |
| 任务类型       | InputText   | -       |                  |
| 任务名称       | InputText   | -       |                  |
| 优先级         | Select      | Normal  |                  |
| 输入参数 (JSON)| Textarea    | -       | 合法 JSON        |
| 输入文件路径   | InputText   | -       | 逗号分隔         |
| CPU 核心       | InputNumber | 2       | ≥ 1              |
| 内存 (GB)      | InputNumber | 4.0     | ≥ 0.1            |
| GPU 数量       | InputNumber | 0       | ≥ 0              |
| 超时 (秒)      | InputNumber | 3600    | ≥ 60             |
| 最大重试       | InputNumber | 3       | 0-10             |

提交调用 `POST /api/v1/tasks`，成功后关闭 Dialog 并刷新列表。

---

### 4.3 任务详情 (TaskDetail)

展示单个任务的完整信息，共 6 个信息区域：

1. **基本信息** — ID、名称、服务、任务类型、状态 (StatusTag)、优先级、Job ID
2. **时间线** — created_at、scheduled_at、started_at、completed_at、总耗时 (自动计算)
3. **执行信息** — Worker (可跳转)、重试次数、超时设置、资源需求、进度条
4. **输入参数** — JSON 格式化展示 `input_params`
5. **执行结果** — JSON 格式化展示 `result` (仅有结果时显示)
6. **错误信息** — 红色高亮块展示 `error_message` (仅 failed/timeout 时显示)

- **操作：** 取消任务按钮 (非终态时可用)
- **轮询：** 5s (运行中任务需要更快的刷新频率)

---

### 4.4 Worker 列表 (WorkerList)

**顶部统计卡片 (4个)：**

| 卡片     | 数据来源              |
| -------- | --------------------- |
| 总节点数  | `total_workers`       |
| 在线节点  | `online_workers`      |
| 总 CPU   | `total_cpu` 核        |
| 总 GPU   | `total_gpu` 卡        |

**DataTable 列：**

| 列         | 说明                                                     |
| ---------- | -------------------------------------------------------- |
| Worker ID  | 前 8 位                                                   |
| 主机名     | hostname                                                  |
| IP         | ip_address:port                                           |
| 状态       | StatusTag (online→绿 / busy→黄 / offline→红 / draining→橙) |
| CPU 使用   | mini ProgressBar + used/total 文字                         |
| 内存使用   | mini ProgressBar + used/total GB                           |
| GPU        | used/total (有 GPU 时)                                     |
| 当前任务   | current_tasks 数量                                         |
| 支持服务   | supported_services 逗号分隔                                 |
| 最后心跳   | 相对时间 (中文 locale，如「5 秒前」)                         |
| 操作       | 详情 + 注销 (非 offline 时可用，需确认弹窗)                  |

- **轮询：** 15s

---

### 4.5 Worker 详情 (WorkerDetail)

1. **基本信息** — ID、主机名、地址、状态、注册时间、最后心跳 (绝对时间 + 相对时间)、支持服务、最大并发、标签、累计完成/失败任务数
2. **资源使用** — 4 个 ResourceBar (CPU / 内存 / GPU / GPU 显存)
3. **当前运行任务** — 小型 DataTable，任务 ID 可点击跳转到任务详情
4. **操作：** 注销 Worker 按钮 (需确认 → `DELETE /api/v1/workers/{id}` → 跳回列表)

- **轮询：** 10s

---

## 5. 数据层架构

### 5.1 类型系统

所有类型定义在 `src/types/` 下，与后端 API 响应 Schema 严格对应：

**任务相关核心类型：**

```typescript
enum TaskStatus {
  PENDING, QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED, TIMEOUT
}

enum TaskPriority {
  CRITICAL = 0, HIGH = 1, NORMAL = 2, LOW = 3, BATCH = 4
}

interface Task {
  id: string
  service: string
  status: TaskStatus
  priority: TaskPriority
  input_params: Record<string, any>
  worker_id?: string
  created_at: string
  // ... 完整字段见 src/types/task.ts
}
```

**Worker 相关核心类型：**

```typescript
enum WorkerStatus { ONLINE, BUSY, OFFLINE, DRAINING }

interface ResourceUsage {
  cpu_cores: number
  memory_gb: number
  gpu_count: number
  // ...
}

interface Worker {
  id: string
  hostname: string
  status: WorkerStatus
  total_resources: ResourceUsage
  used_resources: ResourceUsage
  current_tasks: string[]
  // ...
}
```

### 5.2 API 层

`src/api/client.ts` 创建统一 Axios 实例：

- **baseURL:** `/api/v1`
- **超时:** 15s
- **响应拦截器:** 统一提取错误信息并 `console.error`

各 API 模块返回 `AxiosPromise<T>` 带类型的 Promise，页面直接 `const { data } = await getXxx()` 解构使用。

### 5.3 Pinia Store

两个 Store 管理共享状态：

- `useTasksStore` — `tasks`, `totalTasks`, `stats`, `loading`, `fetchTasks()`, `fetchStats()`
- `useWorkersStore` — `workers`, `totalWorkers`, `onlineWorkers`, `clusterStats`, `loading`, `fetchWorkers()`, `fetchClusterStats()`

页面也可以直接调用 API 函数管理本地 `ref`，无需所有数据都经过 Store。

---

## 6. 通用组件设计

### 6.1 AppLayout

顶部 PrimeVue `Menubar` 导航栏，包含 3 个菜单项 (Dashboard / Tasks / Workers) + 左侧 Logo。主内容区域通过 `<slot />` 注入。底部版本信息栏。

### 6.2 StatusTag

接收 `status: string` 属性，内部维护状态 → 颜色/标签的映射表，同时覆盖 `TaskStatus` 和 `WorkerStatus` 的所有值。使用 PrimeVue `Tag` 组件渲染。

| 状态         | 颜色     |
| ------------ | -------- |
| pending/queued | warn (黄) |
| running       | info (蓝) |
| success/online| success (绿) |
| failed/timeout/offline | danger (红) |
| cancelled     | secondary (灰) |
| busy/draining | warn (黄) |

### 6.3 ResourceBar

接收 `label`, `used`, `total`, `unit`，自动计算百分比，渲染标题行 (label + used/total unit) + PrimeVue `ProgressBar`。

### 6.4 StatsCard

接收 `title`, `value`, `icon`, `severity`，渲染圆形图标 + 大数字 + 小标题的卡片。severity 控制图标背景颜色。

---

## 7. 轮询机制

`usePolling(callback, interval, options)` 封装自 VueUse `useIntervalFn`：

- **自动启动：** 组件挂载时立即执行一次 + 开始定时轮询
- **自动停止：** 组件卸载时 (`onUnmounted`) 自动暂停
- **失败容错：** 连续 3 次失败后自动暂停，设置 `paused = true`
- **手动操作：** 暴露 `reconnect()` (重置失败计数并恢复)、`refresh()` (立即执行一次)、`stop()` (完全停止)

各页面的轮询策略：

| 页面         | 间隔 | 说明                           |
| ------------ | ---- | ------------------------------ |
| Dashboard    | 10s + 15s | 健康状态 10s，资源/统计/Worker 15s |
| TaskList     | 15s  | 列表自动刷新                    |
| TaskDetail   | 5s   | 运行中任务需要更快刷新          |
| WorkerList   | 15s  | 列表自动刷新                    |
| WorkerDetail | 10s  | 单节点详情                      |

---

## 8. 后端 API 对接

前端对接 AIDD Platform 后端 REST API (`/api/v1`)：

### 健康检查

| 方法 | 路径                    | 用途               |
| ---- | ----------------------- | ------------------ |
| GET  | `/health`               | 基础健康检查        |
| GET  | `/health/detailed`      | 详细状态 (仪表盘用) |

### 任务管理

| 方法   | 路径               | 用途         |
| ------ | ------------------ | ------------ |
| GET    | `/tasks`           | 获取任务列表  |
| GET    | `/tasks/stats`     | 队列统计      |
| GET    | `/tasks/{id}`      | 任务详情      |
| POST   | `/tasks`           | 创建任务      |
| DELETE | `/tasks/{id}`      | 取消任务      |

### Worker 管理

| 方法   | 路径               | 用途         |
| ------ | ------------------ | ------------ |
| GET    | `/workers`         | Worker 列表   |
| GET    | `/workers/stats`   | 集群统计      |
| GET    | `/workers/{id}`    | Worker 详情   |
| DELETE | `/workers/{id}`    | 注销 Worker   |

### Vite 开发代理

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8333',  // 后端地址
      changeOrigin: true
    }
  }
}
```

---

## 9. 开发与部署

### 9.1 本地开发

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 → http://localhost:5173
```

确保后端运行在 `http://localhost:8333`，Vite 会自动代理 `/api` 请求。

### 9.2 生产构建

```bash
pnpm build            # TypeScript 类型检查 + Vite 构建 → dist/
pnpm preview          # 本地预览构建产物
```

### 9.3 部署方式

**方案 A：FastAPI 挂载静态文件 (最简单)**

```python
# aidd-platform/app/main.py
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
```

**方案 B：Nginx 反向代理**

```nginx
location / {
    root /path/to/dist;
    try_files $uri $uri/ /index.html;
}
location /api/ {
    proxy_pass http://localhost:8333;
}
```

---

## 10. 后续迭代方向

以下功能已在架构中预留扩展空间，可按需逐步实现：

| 优先级 | 功能                        | 说明                                    |
| ------ | --------------------------- | --------------------------------------- |
| P1     | 手动重试失败任务             | 需后端新增 `POST /tasks/{id}/retry`      |
| P1     | Worker Drain 操作           | 需后端新增 `PATCH /workers/{id}/drain`   |
| P2     | 按服务类型分组统计图表       | 需后端 stats 接口增加 `by_service` 字段  |
| P2     | 任务列表导出 CSV             | 前端纯实现                               |
| P2     | 后台调度器状态展示           | 需后端新增 scheduler status 接口         |
| P3     | WebSocket 实时推送替代轮询   | 减少轮询开销                              |
| P3     | 资源使用历史趋势图           | 需后端采集时序数据                        |
| P3     | 用户权限 (查看/操作分离)     | JWT 认证 + 角色                          |
| P3     | 暗色主题                     | PrimeVue darkModeSelector 已配置         |
