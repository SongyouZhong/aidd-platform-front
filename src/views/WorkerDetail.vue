<template>
  <div class="worker-detail">
    <div class="page-header">
      <Button icon="pi pi-arrow-left" label="返回 Worker 列表" text @click="router.push('/workers')" />
      <span v-if="worker" class="page-title">Worker: {{ worker.hostname }}</span>
    </div>

    <div v-if="!worker && !loading" class="text-muted">Worker 不存在或加载失败</div>
    <ProgressSpinner v-if="loading && !worker" style="display: flex; justify-content: center; padding: 3rem" />

    <template v-if="worker">
      <!-- Basic info -->
      <Card class="section-card">
        <template #title>基本信息</template>
        <template #content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">ID</span>
              <span class="mono">{{ worker.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">主机名</span>
              <span>{{ worker.hostname }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">地址</span>
              <span>{{ worker.ip_address || '-' }}:{{ worker.port }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态</span>
              <StatusTag :status="worker.status" />
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span>{{ formatTime(worker.registered_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">最后心跳</span>
              <span>{{ formatTime(worker.last_heartbeat) }} ({{ relativeTime(worker.last_heartbeat) }})</span>
            </div>
            <div class="info-item">
              <span class="info-label">支持服务</span>
              <span>{{ worker.supported_services.join(', ') || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">最大并发</span>
              <span>{{ worker.max_concurrent_tasks }}</span>
            </div>
            <div class="info-item" v-if="Object.keys(worker.labels).length">
              <span class="info-label">标签</span>
              <span>{{ Object.entries(worker.labels).map(([k, v]) => `${k}=${v}`).join(', ') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">累计完成</span>
              <span>{{ worker.total_tasks_completed }} 成功 / {{ worker.total_tasks_failed }} 失败</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Resource usage -->
      <Card class="section-card">
        <template #title>资源使用</template>
        <template #content>
          <div class="resource-grid">
            <ResourceBar
              label="CPU"
              :used="worker.used_resources.cpu_cores"
              :total="worker.total_resources.cpu_cores"
              unit="核"
            />
            <ResourceBar
              label="内存"
              :used="Math.round(worker.used_resources.memory_gb * 10) / 10"
              :total="Math.round(worker.total_resources.memory_gb * 10) / 10"
              unit="GB"
            />
            <ResourceBar
              v-if="worker.total_resources.gpu_count > 0"
              label="GPU"
              :used="worker.used_resources.gpu_count"
              :total="worker.total_resources.gpu_count"
              unit="卡"
            />
            <ResourceBar
              v-if="worker.total_resources.gpu_memory_gb > 0"
              label="GPU 显存"
              :used="Math.round(worker.used_resources.gpu_memory_gb * 10) / 10"
              :total="Math.round(worker.total_resources.gpu_memory_gb * 10) / 10"
              unit="GB"
            />
          </div>
        </template>
      </Card>

      <!-- Current tasks -->
      <Card class="section-card">
        <template #title>当前运行任务 ({{ worker.current_tasks.length }})</template>
        <template #content>
          <DataTable v-if="worker.current_tasks.length" :value="currentTaskDetails" dataKey="id">
            <Column header="任务 ID">
              <template #body="{ data }">
                <router-link :to="`/tasks/${data.id}`" class="link mono">
                  {{ data.id.substring(0, 12) }}...
                </router-link>
              </template>
            </Column>
            <Column header="服务" style="width: 6rem">
              <template #body="{ data }">
                {{ data.service || '-' }}
              </template>
            </Column>
            <Column header="状态" style="width: 7rem">
              <template #body="{ data }">
                <StatusTag v-if="data.status" :status="data.status" />
                <span v-else>-</span>
              </template>
            </Column>
            <Column header="开始时间" style="width: 10rem">
              <template #body="{ data }">
                {{ data.started_at ? formatTime(data.started_at) : '-' }}
              </template>
            </Column>
          </DataTable>
          <div v-else class="text-muted-sm">无运行中的任务</div>
        </template>
      </Card>

      <!-- Actions -->
      <div class="actions" v-if="worker.status !== 'offline'">
        <Button label="注销 Worker" severity="danger" icon="pi pi-trash" @click="handleDelete" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import StatusTag from '@/components/StatusTag.vue'
import ResourceBar from '@/components/ResourceBar.vue'
import { usePolling } from '@/composables/usePolling'
import { getWorker, deleteWorker } from '@/api/workers'
import { getTask } from '@/api/tasks'
import type { Worker } from '@/types/worker'
import type { Task } from '@/types/task'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const worker = ref<Worker | null>(null)
const loading = ref(true)
const workerId = route.params.id as string
const taskDetailsMap = ref<Record<string, Task>>({})

async function loadWorker() {
  try {
    const { data } = await getWorker(workerId)
    worker.value = data
  } finally {
    loading.value = false
  }
}

async function loadCurrentTaskDetails() {
  if (!worker.value?.current_tasks.length) return
  const taskIds = worker.value.current_tasks
  const newIds = taskIds.filter((id) => !taskDetailsMap.value[id])
  const removedIds = Object.keys(taskDetailsMap.value).filter((id) => !taskIds.includes(id))
  removedIds.forEach((id) => delete taskDetailsMap.value[id])
  await Promise.allSettled(
    newIds.map(async (id) => {
      try {
        const { data } = await getTask(id)
        taskDetailsMap.value[id] = data
      } catch { /* task may no longer exist */ }
    })
  )
}

watch(() => worker.value?.current_tasks, () => loadCurrentTaskDetails(), { deep: true })

usePolling(loadWorker, 10000)

const currentTaskDetails = computed(() =>
  (worker.value?.current_tasks || []).map((id) => {
    const detail = taskDetailsMap.value[id]
    return detail || { id, service: '', status: '', started_at: '' }
  })
)

function formatTime(iso?: string): string {
  if (!iso) return '-'
  return format(new Date(iso), 'yyyy-MM-dd HH:mm:ss')
}

function relativeTime(iso?: string): string {
  if (!iso) return '-'
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: zhCN })
}

function handleDelete() {
  if (!worker.value) return
  const hostname = worker.value.hostname
  confirm.require({
    message: `确定要注销 Worker ${hostname} 吗？`,
    header: '确认注销',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteWorker(workerId)
        toast.add({ severity: 'success', summary: '已注销', detail: `Worker ${hostname} 已注销`, life: 3000 })
        router.push('/workers')
      } catch {
        toast.add({ severity: 'error', summary: '错误', detail: '注销 Worker 失败', life: 3000 })
      }
    },
  })
}
</script>

<style scoped>
.worker-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.section-card {
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.info-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 2rem;
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.link {
  color: var(--p-primary-color);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}

.actions {
  padding-top: 0.5rem;
}

.text-muted {
  color: var(--p-text-muted-color);
  text-align: center;
  padding: 3rem;
  font-size: 1.1rem;
}

.text-muted-sm {
  color: var(--p-text-muted-color);
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
}
</style>
