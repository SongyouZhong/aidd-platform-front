import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { title: '仪表盘' },
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('@/views/TaskList.vue'),
      meta: { title: '任务列表' },
    },
    {
      path: '/tasks/:id',
      name: 'task-detail',
      component: () => import('@/views/TaskDetail.vue'),
      meta: { title: '任务详情' },
    },
    {
      path: '/workers',
      name: 'workers',
      component: () => import('@/views/WorkerList.vue'),
      meta: { title: 'Worker 列表' },
    },
    {
      path: '/workers/:id',
      name: 'worker-detail',
      component: () => import('@/views/WorkerDetail.vue'),
      meta: { title: 'Worker 详情' },
    },
    {
      path: '/nodes',
      name: 'nodes',
      component: () => import('@/views/NodeList.vue'),
      meta: { title: '计算节点' },
    },
    {
      path: '/nodes/:id',
      name: 'node-detail',
      component: () => import('@/views/NodeDetail.vue'),
      meta: { title: '节点详情' },
    },
    {
      path: '/infra-config',
      name: 'infra-config',
      component: () => import('@/views/InfraConfig.vue'),
      meta: { title: '基础设施配置' },
    },
  ],
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'AIDD Platform'} - AIDD Platform`
})

export default router
