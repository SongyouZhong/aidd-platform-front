<template>
  <div class="task-list-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-filters">
        <Select
          v-model="filters.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="状态"
          showClear
          style="width: 10rem"
        />
        <Select
          v-model="filters.service"
          :options="serviceOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="服务类型"
          showClear
          style="width: 10rem"
        />
        <Select
          v-model="filters.priority"
          :options="priorityOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="优先级"
          showClear
          style="width: 10rem"
        />
        <InputText v-model="searchQuery" placeholder="搜索任务 ID 或名称..." style="width: 16rem" />
      </div>
      <div class="toolbar-actions">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="loadTasks" />
        <Button label="创建任务" icon="pi pi-plus" @click="showCreateDialog = true" />
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="filteredTasks"
      :loading="loading"
      stripedRows
      paginator
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50, 100]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      dataKey="id"
    >
      <Column header="任务 ID" style="width: 8rem">
        <template #body="{ data }">
          <span class="mono">{{ data.id.substring(0, 8) }}</span>
        </template>
      </Column>
      <Column field="name" header="名称">
        <template #body="{ data }">
          {{ data.name || '-' }}
        </template>
      </Column>
      <Column field="service" header="服务" style="width: 6rem" />
      <Column header="状态" style="width: 7rem">
        <template #body="{ data }">
          <StatusTag :status="data.status" />
        </template>
      </Column>
      <Column header="优先级" style="width: 6rem">
        <template #body="{ data }">
          {{ priorityLabel(data.priority) }}
        </template>
      </Column>
      <Column header="Worker" style="width: 8rem">
        <template #body="{ data }">
          <router-link v-if="data.worker_id" :to="`/workers/${data.worker_id}`" class="link">
            {{ data.worker_id.substring(0, 8) }}
          </router-link>
          <span v-else>-</span>
        </template>
      </Column>
      <Column header="创建时间" style="width: 10rem">
        <template #body="{ data }">
          {{ formatTime(data.created_at) }}
        </template>
      </Column>
      <Column header="耗时" style="width: 6rem">
        <template #body="{ data }">
          {{ computeDuration(data) }}
        </template>
      </Column>
      <Column header="操作" style="width: 10rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button label="详情" size="small" text @click="router.push(`/tasks/${data.id}`)" />
            <Button
              v-if="canCancel(data.status)"
              label="取消"
              size="small"
              text
              severity="danger"
              @click="handleCancel(data.id)"
            />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-muted">暂无任务数据</div>
      </template>
    </DataTable>

    <!-- Create Task Dialog -->
    <Dialog v-model:visible="showCreateDialog" header="创建计算任务" modal :style="{ width: '32rem' }">
      <div class="create-form">
        <div class="form-field">
          <label>服务类型 *</label>
          <Select
            v-model="newTask.service"
            :options="serviceOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择服务"
          />
        </div>
        <div class="form-field">
          <label>任务类型</label>
          <InputText v-model="newTask.task_type" placeholder="如 qikprop, vina, glide" />
        </div>
        <div class="form-field">
          <label>任务名称</label>
          <InputText v-model="newTask.name" placeholder="可选，方便识别" />
        </div>
        <div class="form-field">
          <label>优先级</label>
          <Select
            v-model="newTask.priority"
            :options="priorityOptions"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <Divider />
        <h4>输入参数</h4>
        <div class="form-field">
          <label>参数 (JSON)</label>
          <Textarea v-model="newTask.input_params_raw" rows="4" placeholder='{ "smiles": ["CCO"] }' />
        </div>
        <div class="form-field">
          <label>输入文件路径</label>
          <InputText v-model="newTask.input_files_raw" placeholder="逗号分隔的 MinIO 路径" />
        </div>

        <Divider />
        <h4>资源需求</h4>
        <div class="form-grid-3">
          <div class="form-field">
            <label>CPU 核心</label>
            <InputNumber v-model="newTask.cpu_cores" :min="1" :max="128" />
          </div>
          <div class="form-field">
            <label>内存 (GB)</label>
            <InputNumber v-model="newTask.memory_gb" :min="0.1" :max="1024" :minFractionDigits="1" />
          </div>
          <div class="form-field">
            <label>GPU 数量</label>
            <InputNumber v-model="newTask.gpu_count" :min="0" :max="16" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-field">
            <label>超时 (秒)</label>
            <InputNumber v-model="newTask.timeout_seconds" :min="60" />
          </div>
          <div class="form-field">
            <label>最大重试</label>
            <InputNumber v-model="newTask.max_retries" :min="0" :max="10" />
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="取消" severity="secondary" text @click="showCreateDialog = false" />
        <Button label="提交" :disabled="!newTask.service" @click="handleCreate" :loading="creating" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import Textarea from 'primevue/textarea'
import StatusTag from '@/components/StatusTag.vue'
import { usePolling } from '@/composables/usePolling'
import { getTasks, cancelTask, createTask } from '@/api/tasks'
import { TaskStatus, TaskPriority, TaskPriorityLabel } from '@/types/task'
import type { Task, TaskCreate } from '@/types/task'
import { format } from 'date-fns'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

// Data
const tasks = ref<Task[]>([])
const loading = ref(false)
const searchQuery = ref('')
const showCreateDialog = ref(false)
const creating = ref(false)

const filters = reactive({
  status: null as string | null,
  service: null as string | null,
  priority: null as number | null,
})

// Options
const statusOptions = [
  { label: 'Pending', value: TaskStatus.PENDING },
  { label: 'Queued', value: TaskStatus.QUEUED },
  { label: 'Running', value: TaskStatus.RUNNING },
  { label: 'Success', value: TaskStatus.SUCCESS },
  { label: 'Failed', value: TaskStatus.FAILED },
  { label: 'Cancelled', value: TaskStatus.CANCELLED },
  { label: 'Timeout', value: TaskStatus.TIMEOUT },
]

const serviceOptions = [
  { label: 'ADMET', value: 'admet' },
  { label: 'Docking', value: 'docking' },
  { label: 'MD', value: 'md' },
  { label: 'QSAR', value: 'qsar' },
]

const priorityOptions = [
  { label: 'Critical', value: TaskPriority.CRITICAL },
  { label: 'High', value: TaskPriority.HIGH },
  { label: 'Normal', value: TaskPriority.NORMAL },
  { label: 'Low', value: TaskPriority.LOW },
  { label: 'Batch', value: TaskPriority.BATCH },
]

// New task form
const newTask = reactive({
  service: '',
  task_type: '',
  name: '',
  priority: TaskPriority.NORMAL,
  input_params_raw: '',
  input_files_raw: '',
  cpu_cores: 2,
  memory_gb: 4.0,
  gpu_count: 0,
  timeout_seconds: 3600,
  max_retries: 3,
})

// Computed
const filteredTasks = computed(() => {
  let result = tasks.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (t) => t.id.toLowerCase().includes(q) || (t.name && t.name.toLowerCase().includes(q))
    )
  }
  return result
})

// Functions
async function loadTasks() {
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (filters.status) params.status = filters.status
    if (filters.service) params.service = filters.service
    params.limit = 200
    const { data } = await getTasks(params)
    let items = data.items
    if (filters.priority !== null && filters.priority !== undefined) {
      items = items.filter((t) => t.priority === filters.priority)
    }
    tasks.value = items
  } finally {
    loading.value = false
  }
}

usePolling(loadTasks, 15000)

function priorityLabel(p: number): string {
  return TaskPriorityLabel[p] || String(p)
}

function canCancel(status: string): boolean {
  return status === TaskStatus.PENDING || status === TaskStatus.QUEUED || status === TaskStatus.RUNNING
}

function formatTime(iso: string): string {
  if (!iso) return '-'
  return format(new Date(iso), 'yyyy-MM-dd HH:mm')
}

function computeDuration(task: Task): string {
  if (!task.started_at) return '-'
  const start = new Date(task.started_at).getTime()
  const end = task.completed_at ? new Date(task.completed_at).getTime() : Date.now()
  const seconds = Math.round((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function handleCancel(taskId: string) {
  confirm.require({
    message: `确定要取消任务 ${taskId.substring(0, 8)}... 吗？`,
    header: '确认取消',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await cancelTask(taskId)
        toast.add({ severity: 'success', summary: '已取消', detail: '任务已取消', life: 3000 })
        loadTasks()
      } catch {
        toast.add({ severity: 'error', summary: '错误', detail: '取消任务失败', life: 3000 })
      }
    },
  })
}

async function handleCreate() {
  creating.value = true
  try {
    let inputParams = {}
    if (newTask.input_params_raw.trim()) {
      try {
        inputParams = JSON.parse(newTask.input_params_raw)
      } catch {
        toast.add({ severity: 'error', summary: '格式错误', detail: '输入参数不是合法的 JSON', life: 3000 })
        creating.value = false
        return
      }
    }
    const inputFiles = newTask.input_files_raw
      ? newTask.input_files_raw.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const payload: TaskCreate = {
      service: newTask.service,
      task_type: newTask.task_type || undefined,
      name: newTask.name || undefined,
      priority: newTask.priority,
      input_params: inputParams,
      input_files: inputFiles,
      resource_requirement: {
        cpu_cores: newTask.cpu_cores,
        memory_gb: newTask.memory_gb,
        gpu_count: newTask.gpu_count,
      },
      timeout_seconds: newTask.timeout_seconds,
      max_retries: newTask.max_retries,
    }
    await createTask(payload)
    toast.add({ severity: 'success', summary: '成功', detail: '任务已创建', life: 3000 })
    showCreateDialog.value = false
    loadTasks()
  } catch {
    toast.add({ severity: 'error', summary: '错误', detail: '创建任务失败', life: 3000 })
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.task-list-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
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

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.text-muted {
  color: var(--p-text-muted-color);
  text-align: center;
  padding: 2rem;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.create-form h4 {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
</style>
