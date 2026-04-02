<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold m-0">外部服务探针</h2>
      <Button icon="pi pi-plus" label="添加服务" @click="openCreateDialog" />
    </div>

    <Message v-if="actionResult" :severity="actionResult.severity" class="mb-4" closable @close="actionResult = null">
      {{ actionResult.message }}
    </Message>

    <!-- Service List -->
    <DataTable
      :value="services"
      :loading="loading"
      stripedRows
      dataKey="name"
      emptyMessage="暂无外部服务"
    >
      <Column field="name" header="服务名称" sortable style="width: 160px">
        <template #body="{ data }">
          <span class="font-semibold">{{ data.name }}</span>
        </template>
      </Column>
      <Column field="url" header="URL" style="width: 260px">
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.url }}</span>
        </template>
      </Column>
      <Column field="health_endpoint" header="健康端点" style="width: 220px">
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.health_endpoint }}</span>
        </template>
      </Column>
      <Column field="check_interval" header="探测间隔" sortable style="width: 110px">
        <template #body="{ data }">
          {{ data.check_interval }}s
        </template>
      </Column>
      <Column field="enabled" header="探针" sortable style="width: 90px">
        <template #body="{ data }">
          <Tag :value="data.enabled ? '已启用' : '已停用'" :severity="data.enabled ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column field="node_status" header="运行状态" sortable style="width: 110px">
        <template #body="{ data }">
          <Tag v-if="data.node_status === 'online'" value="在线" severity="success" />
          <Tag v-else-if="data.node_status === 'offline'" value="离线" severity="danger" />
          <Tag v-else value="未知" severity="secondary" />
        </template>
      </Column>
      <Column field="capabilities" header="能力标签" style="width: 160px">
        <template #body="{ data }">
          <Tag v-for="cap in data.capabilities" :key="cap" :value="cap" severity="info" class="mr-1" />
          <span v-if="!data.capabilities?.length" class="text-color-secondary">-</span>
        </template>
      </Column>
      <Column field="updated_at" header="最后探测" style="width: 160px">
        <template #body="{ data }">
          {{ data.last_heartbeat ? new Date(data.last_heartbeat).toLocaleString() : '-' }}
        </template>
      </Column>
      <Column header="操作" style="width: 160px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-tooltip.top="'编辑'"
              icon="pi pi-pencil"
              text
              size="small"
              @click="openEditDialog(data)"
            />
            <Button
              v-tooltip.top="'手动探测'"
              icon="pi pi-bolt"
              text
              size="small"
              severity="info"
              :loading="!!testingMap[data.name]"
              @click="handleTest(data.name)"
            />
            <Button
              v-tooltip.top="'删除'"
              icon="pi pi-trash"
              text
              size="small"
              severity="danger"
              @click="handleDelete(data.name)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Test Result Dialog -->
    <Dialog
      v-model:visible="testDialogVisible"
      :header="`手动探测：${testingServiceName}`"
      modal
      :style="{ width: '520px' }"
    >
      <div v-if="testResult" class="flex flex-col gap-3">
        <div
          class="flex items-center justify-between px-3 py-2 rounded border"
          :class="testResult.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'"
        >
          <div class="flex items-center gap-2">
            <i :class="testResult.ok ? 'pi pi-check-circle' : 'pi pi-times-circle'" :style="{ color: testResult.ok ? '#22c55e' : '#ef4444' }" />
            <span class="font-semibold">健康检查</span>
          </div>
          <Tag :value="testResult.ok ? '正常' : '失败'" :severity="testResult.ok ? 'success' : 'danger'" />
        </div>
        <div v-if="testResult.status_code" class="text-sm text-surface-600 px-2">
          HTTP 状态码：<span class="font-mono">{{ testResult.status_code }}</span>
        </div>
        <div v-if="testResult.error" class="text-sm text-red-500 font-mono px-2 py-1 bg-red-50 rounded">
          {{ testResult.error }}
        </div>
        <div v-if="testResult.detail" class="mt-2">
          <label class="font-semibold text-sm block mb-1">响应详情</label>
          <pre class="text-xs bg-surface-50 border rounded p-2 overflow-auto max-h-48 font-mono">{{ JSON.stringify(testResult.detail, null, 2) }}</pre>
        </div>
      </div>
      <div v-else class="flex justify-center py-6">
        <i class="pi pi-spin pi-spinner text-3xl text-primary" />
      </div>
      <template #footer>
        <Button label="关闭" severity="secondary" outlined @click="testDialogVisible = false" />
      </template>
    </Dialog>

    <!-- Create / Edit Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="dialogMode === 'create' ? '添加外部服务' : `编辑：${editingName}`"
      modal
      :style="{ width: '560px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div v-if="dialogMode === 'create'" class="flex flex-col gap-1">
          <label class="font-semibold text-sm">服务名称 *</label>
          <InputText v-model="form.name" placeholder="如 marvin-vbox" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm">URL *</label>
          <InputText v-model="form.url" placeholder="http://10.18.85.10:8111" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm">健康检查端点</label>
          <InputText v-model="form.health_endpoint" placeholder="/health" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-sm">探测间隔（秒）</label>
            <InputNumber v-model="form.check_interval" :useGrouping="false" :min="10" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-sm">超时（秒）</label>
            <InputNumber v-model="form.timeout" :useGrouping="false" :min="3" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm">能力标签</label>
          <InputText v-model="capsInput" placeholder="逗号分隔，如 cxcalc,pka" />
          <small class="text-color-secondary">多个标签用逗号分隔</small>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.enabled" :binary="true" inputId="enabled" />
          <label for="enabled" class="text-sm">启用探测</label>
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" outlined @click="dialogVisible = false" />
        <Button
          :label="dialogMode === 'create' ? '创建' : '保存'"
          icon="pi pi-save"
          :loading="saving"
          @click="handleSave"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import * as esApi from '@/api/externalServices'
import type { ExternalService, ExternalServiceTestResult } from '@/types/externalService'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'

const services = ref<ExternalService[]>([])
const loading = ref(false)
const saving = ref(false)
const testingMap = reactive<Record<string, boolean>>({})
const testDialogVisible = ref(false)
const testingServiceName = ref('')
const testResult = ref<ExternalServiceTestResult | null>(null)
const actionResult = ref<{ severity: string; message: string } | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingName = ref('')

const form = reactive({
  name: '',
  url: '',
  health_endpoint: '/health',
  check_interval: 30,
  timeout: 10,
  enabled: true,
  capabilities: [] as string[],
})

const capsInput = computed({
  get: () => form.capabilities.join(', '),
  set: (val: string) => {
    form.capabilities = val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  },
})

// ---- Data loading ----
async function loadServices() {
  loading.value = true
  try {
    const { data } = await esApi.listExternalServices()
    services.value = data
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: '加载失败：' + (e.response?.data?.detail || e.message) }
  } finally {
    loading.value = false
  }
}

// ---- Create / Edit ----
function openCreateDialog() {
  dialogMode.value = 'create'
  Object.assign(form, {
    name: '',
    url: '',
    health_endpoint: '/health',
    check_interval: 30,
    timeout: 10,
    enabled: true,
    capabilities: [],
  })
  dialogVisible.value = true
}

function openEditDialog(svc: ExternalService) {
  dialogMode.value = 'edit'
  editingName.value = svc.name
  Object.assign(form, {
    name: svc.name,
    url: svc.url,
    health_endpoint: svc.health_endpoint,
    check_interval: svc.check_interval,
    timeout: svc.timeout,
    enabled: svc.enabled,
    capabilities: [...(svc.capabilities || [])],
  })
  dialogVisible.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      await esApi.createExternalService({
        name: form.name,
        url: form.url,
        health_endpoint: form.health_endpoint,
        check_interval: form.check_interval,
        timeout: form.timeout,
        enabled: form.enabled,
        capabilities: form.capabilities,
      })
      actionResult.value = { severity: 'success', message: `服务 "${form.name}" 已创建` }
    } else {
      await esApi.updateExternalService(editingName.value, {
        url: form.url,
        health_endpoint: form.health_endpoint,
        check_interval: form.check_interval,
        timeout: form.timeout,
        enabled: form.enabled,
        capabilities: form.capabilities,
      })
      actionResult.value = { severity: 'success', message: `服务 "${editingName.value}" 已更新` }
    }
    dialogVisible.value = false
    await loadServices()
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: (e.response?.data?.detail || e.message) }
  } finally {
    saving.value = false
  }
}

// ---- Delete ----
async function handleDelete(name: string) {
  if (!confirm(`确定删除外部服务 "${name}" 吗？相关节点记录也会一并删除。`)) return
  try {
    await esApi.deleteExternalService(name)
    actionResult.value = { severity: 'success', message: `服务 "${name}" 已删除` }
    await loadServices()
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: '删除失败：' + (e.response?.data?.detail || e.message) }
  }
}

// ---- Manual Test ----
async function handleTest(name: string) {
  testingMap[name] = true
  testingServiceName.value = name
  testResult.value = null
  testDialogVisible.value = true
  try {
    const { data } = await esApi.testExternalService(name)
    testResult.value = data
  } catch (e: any) {
    testDialogVisible.value = false
    actionResult.value = { severity: 'error', message: '探测失败：' + (e.response?.data?.detail || e.message) }
  } finally {
    testingMap[name] = false
  }
}

onMounted(loadServices)
</script>
