<template>
  <div class="dashboard">
    <!-- Connection lost banner -->
    <div v-if="healthPoll.paused.value || statsPoll.paused.value" class="connection-banner">
      <i class="pi pi-exclamation-triangle"></i>
      连接断开，数据可能不是最新的。
      <Button label="重新连接" size="small" severity="warn" @click="reconnectAll" />
    </div>

    <!-- Status cards -->
    <div class="grid-4">
      <StatsCard
        title="平台状态"
        :value="healthData?.status === 'healthy' ? '正常' : '异常'"
        icon="pi pi-heart"
        :severity="healthData?.status === 'healthy' ? 'success' : 'danger'"
      />
      <StatsCard
        title="在线 Worker"
        :value="healthData?.online_workers ?? '-'"
        icon="pi pi-server"
        severity="info"
      />
      <StatsCard
        title="运行中任务"
        :value="healthData?.running_tasks ?? '-'"
        icon="pi pi-spin pi-spinner"
        severity="warn"
      />
      <StatsCard
        title="待处理任务"
        :value="healthData?.pending_tasks ?? '-'"
        icon="pi pi-clock"
        severity="secondary"
      />
    </div>

    <!-- Cluster resources -->
    <Card class="section-card">
      <template #title>集群资源</template>
      <template #content>
        <div class="grid-3" v-if="clusterStats">
          <ResourceBar
            label="CPU"
            :used="clusterStats.used_cpu"
            :total="clusterStats.total_cpu"
            unit="核"
          />
          <ResourceBar
            label="内存"
            :used="Math.round(clusterStats.used_memory_gb * 10) / 10"
            :total="Math.round(clusterStats.total_memory_gb * 10) / 10"
            unit="GB"
          />
          <ResourceBar
            label="GPU"
            :used="clusterStats.used_gpu"
            :total="clusterStats.total_gpu"
            unit="卡"
          />
        </div>
        <div v-else class="text-muted">暂无数据</div>
      </template>
    </Card>

    <!-- Task stats + Worker overview -->
    <div class="grid-2">
      <!-- Task status distribution chart -->
      <Card class="section-card">
        <template #title>任务队列统计</template>
        <template #content>
          <div v-if="taskStats && chartData" class="chart-container">
            <Chart type="doughnut" :data="chartData" :options="chartOptions" />
            <div class="chart-total">
              总提交: {{ taskStats.total_submitted }}
            </div>
          </div>
          <div v-else class="text-muted">暂无数据</div>
        </template>
      </Card>

      <!-- Worker status list -->
      <Card class="section-card">
        <template #title>Worker 节点状态</template>
        <template #content>
          <div v-if="workers.length" class="worker-list">
            <div
              v-for="w in workers"
              :key="w.id"
              class="worker-item"
              @click="router.push(`/workers/${w.id}`)"
            >
              <StatusTag :status="w.status" />
              <span class="worker-hostname">{{ w.hostname }}</span>
              <span class="worker-metric">CPU {{ Math.round(w.utilization) }}%</span>
              <span class="worker-metric">{{ w.current_tasks.length }} 任务</span>
            </div>
          </div>
          <div v-else class="text-muted">暂无 Worker 节点</div>
        </template>
      </Card>
    </div>

    <!-- Service stats -->
    <Card class="section-card">
      <template #title>按服务分类统计</template>
      <template #content>
        <div v-if="serviceStatsEntries.length" class="service-stats-grid">
          <div v-for="[svc, stats] in serviceStatsEntries" :key="svc" class="service-stats-card">
            <div class="service-name">{{ svc }}</div>
            <div class="service-metrics">
              <span class="metric pending">待处理 {{ stats.pending }}</span>
              <span class="metric running">运行中 {{ stats.running }}</span>
              <span class="metric completed">已完成 {{ stats.completed }}</span>
              <span class="metric failed">失败 {{ stats.failed }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-muted">暂无服务统计</div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Chart from 'primevue/chart'
import Button from 'primevue/button'
import StatsCard from '@/components/StatsCard.vue'
import ResourceBar from '@/components/ResourceBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePolling } from '@/composables/usePolling'
import { getDetailedHealth } from '@/api/health'
import { getTaskStats, getTaskStatsByService } from '@/api/tasks'
import type { ServiceStats } from '@/api/tasks'
import { getWorkers } from '@/api/workers'
import { getWorkerStats } from '@/api/workers'
import type { DetailedHealthResponse } from '@/types/health'
import type { QueueStatsResponse } from '@/types/task'
import type { Worker, ClusterStatsResponse } from '@/types/worker'

const router = useRouter()

const healthData = ref<DetailedHealthResponse | null>(null)
const taskStats = ref<QueueStatsResponse | null>(null)
const clusterStats = ref<ClusterStatsResponse | null>(null)
const workers = ref<Worker[]>([])
const serviceStats = ref<Record<string, ServiceStats>>({})

const serviceStatsEntries = computed(() => Object.entries(serviceStats.value))
const healthPoll = usePolling(async () => {
  const { data } = await getDetailedHealth()
  healthData.value = data
}, 10000)

const statsPoll = usePolling(async () => {
  const [statsRes, clusterRes, workersRes, svcRes] = await Promise.all([
    getTaskStats(),
    getWorkerStats(),
    getWorkers(),
    getTaskStatsByService(),
  ])
  taskStats.value = statsRes.data
  clusterStats.value = clusterRes.data
  workers.value = workersRes.data.items
  serviceStats.value = svcRes.data.services
}, 15000)

function reconnectAll() {
  healthPoll.reconnect()
  statsPoll.reconnect()
}

const chartData = computed<object | undefined>(() => {
  if (!taskStats.value) return undefined
  const s = taskStats.value
  return {
    labels: ['Pending', 'Running', 'Completed', 'Failed', 'Cancelled'],
    datasets: [
      {
        data: [s.pending, s.running, s.completed, s.failed, s.cancelled],
        backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#6b7280'],
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
}
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.connection-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--p-yellow-50);
  border: 1px solid var(--p-yellow-300);
  border-radius: var(--p-content-border-radius);
  color: var(--p-yellow-800);
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.section-card {
  min-height: 200px;
}

.chart-container {
  position: relative;
  height: 280px;
}

.chart-total {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.worker-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.worker-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--p-content-border-radius);
  cursor: pointer;
  transition: background 0.15s;
}

.worker-item:hover {
  background: var(--p-content-hover-background);
}

.worker-hostname {
  font-weight: 600;
  flex: 1;
}

.worker-metric {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.text-muted {
  color: var(--p-text-muted-color);
  text-align: center;
  padding: 2rem;
}

.service-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.service-stats-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
}

.service-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.service-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.metric {
  font-size: 0.8rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.metric.pending { background: #fef3c7; color: #92400e; }
.metric.running { background: #dbeafe; color: #1e40af; }
.metric.completed { background: #dcfce7; color: #166534; }
.metric.failed { background: #fee2e2; color: #991b1b; }

@media (max-width: 768px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: 1fr; }
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
