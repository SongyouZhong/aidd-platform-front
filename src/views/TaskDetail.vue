<template>
  <div class="task-detail">
    <div class="page-header">
      <Button icon="pi pi-arrow-left" label="返回任务列表" text @click="router.push('/tasks')" />
      <span v-if="task" class="page-title mono">任务: {{ task.id.substring(0, 8) }}...</span>
    </div>

    <div v-if="!task && !loading" class="text-muted">任务不存在或加载失败</div>
    <ProgressSpinner v-if="loading && !task" style="display: flex; justify-content: center; padding: 3rem" />

    <template v-if="task">
      <!-- Basic info -->
      <Card class="section-card">
        <template #title>基本信息</template>
        <template #content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">ID</span>
              <span class="mono">{{ task.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">名称</span>
              <span>{{ task.name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">服务</span>
              <span>{{ task.service }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">任务类型</span>
              <span>{{ task.task_type || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态</span>
              <StatusTag :status="task.status" />
            </div>
            <div class="info-item">
              <span class="info-label">优先级</span>
              <span>{{ priorityLabel(task.priority) }} ({{ task.priority }})</span>
            </div>
            <div class="info-item" v-if="task.job_id">
              <span class="info-label">Job ID</span>
              <span class="mono">{{ task.job_id }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Timeline -->
      <Card class="section-card">
        <template #title>时间线</template>
        <template #content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span>{{ formatTime(task.created_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">调度时间</span>
              <span>{{ formatTime(task.scheduled_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">开始执行</span>
              <span>{{ formatTime(task.started_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">完成时间</span>
              <span>{{ formatTime(task.completed_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">总耗时</span>
              <span>{{ computeDuration() }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Execution info -->
      <Card class="section-card">
        <template #title>执行信息</template>
        <template #content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Worker</span>
              <router-link v-if="task.worker_id" :to="`/workers/${task.worker_id}`" class="link">
                {{ task.worker_id.substring(0, 8) }}...
              </router-link>
              <span v-else>-</span>
            </div>
            <div class="info-item">
              <span class="info-label">重试次数</span>
              <span>{{ task.retry_count }} / {{ task.max_retries }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">超时设置</span>
              <span>{{ task.timeout_seconds }} 秒</span>
            </div>
            <div class="info-item" v-if="task.resources">
              <span class="info-label">资源需求</span>
              <span>CPU {{ task.resources.cpu_cores }}核, 内存 {{ task.resources.memory_gb }}GB, GPU {{ task.resources.gpu_count }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">进度</span>
              <ProgressBar :value="task.progress" :showValue="true" style="height: 1rem; width: 200px" />
            </div>
          </div>
        </template>
      </Card>

      <!-- Input params -->
      <Card class="section-card">
        <template #title>输入参数</template>
        <template #content>
          <pre class="json-block">{{ formatJson(task.input_params) }}</pre>
        </template>
      </Card>

      <!-- Input files -->
      <Card v-if="task.input_files && task.input_files.length" class="section-card">
        <template #title>输入文件</template>
        <template #content>
          <ul class="file-list">
            <li v-for="f in task.input_files" :key="f" class="mono">{{ f }}</li>
          </ul>
        </template>
      </Card>

      <!-- Output files -->
      <Card v-if="task.output_files && task.output_files.length" class="section-card">
        <template #title>输出文件</template>
        <template #content>
          <ul class="file-list">
            <li v-for="f in task.output_files" :key="f" class="mono">{{ f }}</li>
          </ul>
        </template>
      </Card>

      <!-- Result -->
      <Card v-if="task.result" class="section-card">
        <template #title>执行结果</template>
        <template #content>
          <pre class="json-block">{{ formatJson(task.result) }}</pre>
        </template>
      </Card>

      <!-- Error -->
      <Card v-if="task.error_message" class="section-card error-card">
        <template #title>错误信息</template>
        <template #content>
          <pre class="error-block">{{ task.error_message }}</pre>
        </template>
      </Card>

      <!-- Actions -->
      <div class="actions" v-if="canCancel">
        <Button label="取消任务" severity="danger" icon="pi pi-times" @click="handleCancel" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import ProgressSpinner from 'primevue/progressspinner'
import StatusTag from '@/components/StatusTag.vue'
import { usePolling } from '@/composables/usePolling'
import { getTask, cancelTask } from '@/api/tasks'
import { TaskStatus, TaskPriorityLabel } from '@/types/task'
import type { Task } from '@/types/task'
import { format } from 'date-fns'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const task = ref<Task | null>(null)
const loading = ref(true)
const taskId = route.params.id as string

async function loadTask() {
  try {
    const { data } = await getTask(taskId)
    task.value = data
  } finally {
    loading.value = false
  }
}

// Poll every 5s for running tasks, 15s otherwise
usePolling(loadTask, 5000)

const canCancel = computed(() => {
  if (!task.value) return false
  const s = task.value.status
  return s === TaskStatus.PENDING || s === TaskStatus.QUEUED || s === TaskStatus.RUNNING
})

function priorityLabel(p: number): string {
  return TaskPriorityLabel[p] || String(p)
}

function formatTime(iso?: string): string {
  if (!iso) return '-'
  return format(new Date(iso), 'yyyy-MM-dd HH:mm:ss')
}

function computeDuration(): string {
  if (!task.value?.started_at) return '-'
  const start = new Date(task.value.started_at).getTime()
  const end = task.value.completed_at ? new Date(task.value.completed_at).getTime() : Date.now()
  const seconds = Math.round((end - start) / 1000)
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
  return `${Math.floor(seconds / 3600)} 时 ${Math.floor((seconds % 3600) / 60)} 分`
}

function formatJson(obj: any): string {
  if (!obj || Object.keys(obj).length === 0) return '{}'
  return JSON.stringify(obj, null, 2)
}

function handleCancel() {
  confirm.require({
    message: `确定要取消此任务吗？`,
    header: '确认取消',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await cancelTask(taskId)
        toast.add({ severity: 'success', summary: '已取消', detail: '任务已取消', life: 3000 })
        loadTask()
      } catch {
        toast.add({ severity: 'error', summary: '错误', detail: '取消任务失败', life: 3000 })
      }
    },
  })
}
</script>

<style scoped>
.task-detail {
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

.mono {
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.link {
  color: var(--p-primary-color);
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85rem;
}
.link:hover {
  text-decoration: underline;
}

.json-block {
  background: var(--p-surface-100);
  padding: 1rem;
  border-radius: var(--p-content-border-radius);
  font-size: 0.85rem;
  font-family: monospace;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-card {
  border-left: 4px solid var(--p-red-500);
}

.error-block {
  background: var(--p-red-50);
  color: var(--p-red-700);
  padding: 1rem;
  border-radius: var(--p-content-border-radius);
  font-size: 0.85rem;
  font-family: monospace;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-list {
  margin: 0;
  padding-left: 1.5rem;
  list-style: disc;
}

.file-list li {
  padding: 0.25rem 0;
  font-size: 0.85rem;
  word-break: break-all;
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
</style>
