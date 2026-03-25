# AIDD Platform 前端

AIDD Platform 的管理前端，提供可视化界面用于监控平台运行状态、管理计算任务和 Worker 节点。

## 功能

- **仪表盘** — 平台健康状态、集群资源使用率概览
- **任务管理** — 查看、创建、取消计算任务，跟踪全生命周期
- **Worker 管理** — 监控 Worker 节点状态与资源
- **节点管理** — 查看计算节点详情与资源分配
- **基础设施配置** — 管理平台基础设施参数

## 技术栈

Vue 3 + TypeScript、PrimeVue 4 (Aura 主题)、Pinia、Vue Router 4、Axios、Vite、pnpm

## 本地开发

```bash
pnpm install
pnpm dev
```

开发服务器启动后访问 `http://localhost:5173`，Vite 会自动将 `/api` 请求代理到 `http://localhost:8333`（后端）。

## 构建

```bash
pnpm run build
```

产出在 `dist/` 目录，为纯静态文件（HTML + JS + CSS）。

## 部署

### Docker 镜像构建

```bash
docker build -t aidd-frontend .
```

多阶段构建：Node 22 编译 → Nginx 1.27 运行，最终镜像约 30MB。

### K8s 部署

前端以 Nginx 容器运行，只负责静态文件服务。API 路由由 **Ingress** 统一处理。

```
浏览器
  │
  ▼
Ingress Controller
  ├─ /api/*  ──→  aidd-platform Service (port 8333)
  └─ /*      ──→  aidd-frontend Service (port 80)
```

#### Deployment + Service 示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aidd-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aidd-frontend
  template:
    metadata:
      labels:
        app: aidd-frontend
    spec:
      containers:
      - name: nginx
        image: aidd-frontend:latest
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
        resources:
          limits:
            cpu: 200m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: aidd-frontend
spec:
  selector:
    app: aidd-frontend
  ports:
  - port: 80
    targetPort: 80
```

#### Ingress 示例

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aidd-ingress
spec:
  rules:
  - host: aidd.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: aidd-platform
            port:
              number: 8333
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aidd-frontend
            port:
              number: 80
```

> `/api` 规则须放在 `/` 前面，否则所有请求会先匹配到前端。

### Docker Compose（本地验证）

后端项目的 `docker-compose.yml` 已包含 `frontend` 服务，可一键启动全栈：

```bash
cd aidd-platform
docker-compose up -d --build
```

访问 `http://localhost:3000`。

## 项目结构

```
src/
├── api/          # Axios API 调用层（baseURL: /api/v1）
├── components/   # 通用组件（AppLayout, StatusTag 等）
├── composables/  # 组合式函数（usePolling）
├── router/       # Vue Router 路由定义（History 模式）
├── stores/       # Pinia 状态管理
├── types/        # TypeScript 类型定义
└── views/        # 页面组件
```

## 关键配置说明

| 文件 | 作用 | 生效环境 |
|------|------|----------|
| `vite.config.ts` | `/api` 代理到 `localhost:8333` | 开发 (`pnpm dev`) |
| `nginx.conf` | 静态文件服务 + History 路由回退 | 生产 (Docker) |
| `Dockerfile` | 多阶段构建（Node → Nginx） | 构建镜像时 |
