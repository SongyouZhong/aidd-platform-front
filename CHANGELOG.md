# 前端功能补全说明

## 概述

对 `aidd-platform-front` 前端项目进行了全面审查，对照 `docs/frontend-design.md` 设计文档找出缺失功能并逐一实现。

---

## 修改详情

### 1. Worker 列表页 (`src/views/WorkerList.vue`)

**问题**：缺少筛选栏和刷新按钮，无法按状态或服务类型过滤 Worker。

**修改内容**：
- 新增 **状态筛选下拉框**，选项：Online / Busy / Offline / Draining
- 新增 **支持服务筛选下拉框**，选项：ADMET / Docking / MD / QSAR
- 新增 **手动刷新按钮**
- 筛选条件变更时通过 `watch()` 立即触发数据重新加载，并将筛选参数传递给后端 API

---

### 2. Worker 详情页 (`src/views/WorkerDetail.vue`)

**问题**：当前运行任务列表仅显示任务 ID，缺少服务类型、状态、开始时间等关键信息。

**修改内容**：
- 当前运行任务表格新增 **服务** 列
- 新增 **状态** 列（使用 StatusTag 组件显示彩色标签）
- 新增 **开始时间** 列
- 通过调用 `GET /api/v1/tasks/{id}` 接口批量获取各任务详情，监听任务列表变化后增量拉取新任务数据

---

### 3. 任务详情页 (`src/views/TaskDetail.vue`)

**问题**：缺少输入文件和输出文件的展示区域（设计文档中有明确要求）。

**修改内容**：
- 新增 **输入文件** card 区块，仅在 `input_files` 非空时显示，列表展示各文件路径
- 新增 **输出文件** card 区块，仅在 `output_files` 非空时显示，列表展示各文件路径

---

### 4. 任务列表页 (`src/views/TaskList.vue`)

**问题**：
1. 缺少自动刷新开关，用户无法暂停自动轮询
2. 状态/服务/优先级筛选条件变更后需等待下一次轮询才生效，响应不及时

**修改内容**：
- 新增 **自动刷新切换按钮**，可随时暂停/恢复 15 秒轮询，按钮文字和图标随状态动态切换
- 通过 `watch(filters, ...)` 监听筛选条件变化，变更后**立即触发一次数据加载**

---

### 5. 仪表盘 (`src/views/Dashboard.vue`)

**问题**：连接断开提示横幅仅检测健康检查轮询（`healthPoll`）的暂停状态，未检测统计数据轮询（`statsPoll`），导致统计数据断连时不提示。

**修改内容**：
- 连接断开横幅改为检测 `healthPoll.paused` **或** `statsPoll.paused`，任意一个轮询断开都会显示提示

---

## 验证

所有修改完成后通过以下验证：

```bash
# TypeScript 类型检查 —— 无任何错误
npx vue-tsc --noEmit

# Vite 生产构建 —— 构建成功
npx vite build
# ✓ built in 2.88s
```
