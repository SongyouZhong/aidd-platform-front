<template>
  <div class="worker-list-page">
    <!-- Cluster summary cards -->
    <div class="grid-4">
      <StatsCard
        title="总节点数"
        :value="clusterStats?.total_workers ?? '-'"
        icon="pi pi-server"
      />
      <StatsCard
        title="在线节点"
        :value="clusterStats?.online_workers ?? '-'"
        icon="pi pi-check-circle"
        severity="success"
      />
      <StatsCard
        title="总 CPU"
        :value="clusterStats ? `${clusterStats.total_cpu} 核` : '-'"
        icon="pi pi-microchip"
        severity="info"
      />
      <StatsCard
        title="总 GPU"
        :value="clusterStats ? `${clusterStats.total_gpu} 卡` : '-'"
        icon="pi pi-bolt"
        severity="warn"
      />
    </div>

    <!-- Worker table -->
    <DataTable
      :value="workers"
      :loading="loading"
      stripedRows
      paginator
      :rows="20"
      dataKey="id"
    >
      <Column header="Worker ID" style="width: 7rem">
        <template #body="{ data }">
          <span class="mono">{{ data.id.substring(0, 8) }}</span>
        </template>
      </Column>
      <Column field="hostname" header="主机名" />
      <Column header="IP" style="width: 10rem">
        <template #body="{ data }">
          {{ data.ip_address || '-' }}:{{ data.port }}
        </template>
      </Column>
      <Column header="状态" style="width: 7rem">
        <template #body="{ data }">
          <StatusTag :status="data.status" />
        </template>
      </Column>
      <Column header="CPU 使用" style="width: 9rem">
        <template #body="{ data }">
          <div v-if="data.status !== 'offline'" class="mini-resource">
            <ProgressBar :value="cpuPercent(data)" style="height: 0.6rem;" :showValue="false" />
            <span class="resource-text">{{ data.used_resources.cpu_cores }}/{{ data.total_resources.cpu_cores }}</span>
          </div>
          <span v-else>-</span>
        </template>
      </Column>
      <Column header="内存使用" style="width: 10rem">
        <template #body="{ data }">
          <div v-if="data.status !== 'offline'" class="mini-resource">
            <ProgressBar :value="memPercent(data)" style="height: 0.6rem;" :showValue="false" />
            <span class="resource-text">{{ round1(data.used_resources.memory_gb) }}/{{ round1(data.total_resources.memory_gb) }} GB</span>
          </div>
          <span v-else>-</span>
        </template>
      </Column>
      <Column header="GPU" style="width: 7rem">
        <template #body="{ data }">
          <template v-if="data.total_resources.gpu_count > 0 && data.status !== 'offline'">
            {{ data.used_resources.gpu_count }}/{{ data.total_resources.gpu_count }}
          </template>
          <span v-else>-</span>
        </template>
      </Column>
      <Column header="任务" style="width: 4rem">
        <template #body="{ data }">
          {{ data.current_tasks.length }}
        </template>
      </Column>
      <Column header="支持服务" style="width: 10rem">
        <template #body="{ data }">
          {{ data.supported_services.join(', ') || '-' }}
        </template>
      </Column>
      <Column header="最后心跳" style="width: 7rem">
        <template #body="{ data }">
          {{ relativeTime(data.last_heartbeat) }}
        </template>
      </Column>
      <Column header="操作" style="width: 10rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button label="详情" size="small" text @click="router.push(`/workers/${data.id}`)" />
            <Button
              v-if="data.status !== 'offline'"
              label="注销"
              size="small"
              text
              severity="danger"
              @click="handleDelete(data)"
            />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-muted">暂无 Worker 节点</div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressBar from 'primevue/progressbar'
import Button from 'primevue/button'
import StatsCard from '@/components/StatsCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import { usePolling } from '@/composables/usePolling'
import { getWorkers, getWorkerStats, deleteWorker } from '@/api/workers'
import type { Worker, ClusterStatsResponse } from '@/types/worker'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const workers = ref<Worker[]>([])
const clusterStats = ref<ClusterStatsResponse | null>(null)
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [workersRes, statsRes] = await Promise.all([getWorkers(), getWorkerStats()])
    workers.value = workersRes.data.items
    clusterStats.value = statsRes.data
  } finally {
    loading.value = false
  }
}

usePolling(loadData, 15000)

function cpuPercent(w: Worker): number {
  if (w.total_resources.cpu_cores === 0) return 0
  return Math.round((w.used_resources.cpu_cores / w.total_resources.cpu_cores) * 100)
}

function memPercent(w: Worker): number {
  if (w.total_resources.memory_gb === 0) return 0
  return Math.round((w.used_resources.memory_gb / w.total_resources.memory_gb) * 100)
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString()
}

function relativeTime(iso?: string): string {
  if (!iso) return '-'
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: zhCN })
}

function handleDelete(worker: Worker) {
  confirm.require({
    message: `确定要注销 Worker ${worker.hostname} 吗？这将使该节点无法接收新任务。`,
    header: '确认注销',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteWorker(worker.id)
        toast.add({ severity: 'success', summary: '已注销', detail: `Worker ${worker.hostname} 已注销`, life: 3000 })
        loadData()
      } catch {
        toast.add({ severity: 'error', summary: '错误', detail: '注销 Worker 失败', life: 3000 })
      }
    },
  })
}
</script>

<style scoped>
.worker-list-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.mini-resource {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.resource-text {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.text-muted {
  color: var(--p-text-muted-color);
  text-align: center;
  padding: 2rem;
}

@media (max-width: 768px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
}
</style>
