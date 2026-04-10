<template>
  <div v-if="node">
    <!-- 头部 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.push('/nodes')" />
        <h2 class="text-2xl font-bold m-0">{{ node.hostname }}</h2>
        <Tag v-if="node.node_type === 'external_service'" value="外部服务" severity="warn" />
        <StatusTag :status="node.status" />
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" label="刷新" severity="secondary" outlined @click="refresh" />
        <Button
          v-if="node.status === 'online' && node.node_type !== 'external_service'"
          icon="pi pi-plus"
          label="启动 Worker"
          @click="showStartDialog = true"
        />
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <StatsCard v-if="node.node_type !== 'external_service'" title="Worker 数量" :value="node.worker_count" icon="pi pi-cog" severity="info" />
      <StatsCard v-else title="服务类型" value="CxCalc" icon="pi pi-box" severity="warn" />
      <StatsCard title="Node ID" :value="node.node_id.slice(0, 16)" icon="pi pi-id-card" />
      <StatsCard title="IP 地址" :value="node.ip_address || '-'" icon="pi pi-globe" />
      <StatsCard title="操作系统" :value="node.os_info || '-'" icon="pi pi-desktop" />
    </div>

    <!-- 能力标签 -->
    <div class="mb-4" v-if="node.capabilities?.length">
      <span class="font-semibold mr-2">支持的服务：</span>
      <Tag v-for="cap in node.capabilities" :key="cap" :value="cap" severity="info" class="mr-1" />
    </div>

    <!-- 外部服务健康详情 -->
    <Panel v-if="node.node_type === 'external_service' && node.health_detail" header="健康详情" class="mb-4">
      <div class="grid grid-cols-2 gap-4">
        <div v-for="(value, key) in node.health_detail" :key="key" class="flex flex-col gap-1">
          <span class="text-sm text-color-secondary">{{ key }}</span>
          <span class="font-semibold">{{ typeof value === 'object' ? JSON.stringify(value) : String(value) }}</span>
        </div>
      </div>
      <div v-if="Object.keys(node.health_detail).length === 0" class="text-color-secondary">暂无健康详情</div>
    </Panel>

    <!-- Worker 列表（仅计算节点显示） -->
    <Panel v-if="node.node_type !== 'external_service'" header="Workers" class="mb-4">
      <DataTable :value="node.workers" stripedRows dataKey="agent_worker_id" emptyMessage="暂无 Worker">
        <Column field="agent_worker_id" header="Agent Worker ID" style="width: 200px">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ data.agent_worker_id }}</span>
          </template>
        </Column>
        <Column field="service" header="服务" style="width: 120px" />
        <Column field="deploy_mode" header="模式" style="width: 80px" />
        <Column field="status" header="状态" style="width: 100px">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="workerStatusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="hostname" header="主机名" style="width: 160px">
          <template #body="{ data }">
            <span v-if="data.hostname">{{ data.hostname }}</span>
            <span v-else class="text-color-secondary">-</span>
          </template>
        </Column>
        <Column field="started_at" header="启动时间" style="width: 180px">
          <template #body="{ data }">
            {{ data.started_at ? new Date(data.started_at).toLocaleString() : '-' }}
          </template>
        </Column>
        <Column field="stop_reason" header="退出原因" style="width: 120px">
          <template #body="{ data }">
            <Button
              v-if="data.stop_reason"
              :label="data.stop_reason.includes('\n') ? '查看日志' : data.stop_reason"
              :severity="data.stop_reason.includes('exit_code') ? 'danger' : 'secondary'"
              text
              size="small"
              @click="showStopReasonDialog(data)"
            />
            <span v-else class="text-color-secondary">-</span>
          </template>
        </Column>
        <Column header="操作" style="width: 100px">
          <template #body="{ data }">
            <Button
              v-if="data.status === 'online' || data.status === 'busy'"
              icon="pi pi-stop"
              severity="danger"
              text
              size="small"
              @click="handleStopWorker(data.agent_worker_id)"
            />
          </template>
        </Column>
      </DataTable>
    </Panel>

    <!-- 最近命令（仅计算节点显示） -->
    <Panel v-if="node.node_type !== 'external_service'" header="最近命令">
      <DataTable :value="node.recent_commands" stripedRows dataKey="request_id" emptyMessage="暂无命令记录">
        <Column field="command" header="命令" style="width: 140px" />
        <Column field="status" header="状态" style="width: 100px">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="cmdStatusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="issued_by" header="执行者" style="width: 100px" />
        <Column field="issued_at" header="下发时间" style="width: 180px">
          <template #body="{ data }">
            {{ data.issued_at ? new Date(data.issued_at).toLocaleString() : '-' }}
          </template>
        </Column>
        <Column field="completed_at" header="完成时间" style="width: 180px">
          <template #body="{ data }">
            {{ data.completed_at ? new Date(data.completed_at).toLocaleString() : '-' }}
          </template>
        </Column>
      </DataTable>
    </Panel>

    <!-- 启动 Worker 对话框 -->
    <Dialog v-model:visible="showStartDialog" header="启动 Worker" modal style="width: 30rem">
      <div class="flex flex-col gap-4 pt-2">
        <div>
          <label class="block font-semibold mb-1">服务类型</label>
          <Select v-model="startForm.service" :options="serviceOptions" placeholder="选择服务" class="w-full" />
        </div>
        <div>
          <label class="block font-semibold mb-1">部署模式</label>
          <Select v-model="startForm.deploy_mode" :options="deployOptions" placeholder="选择模式" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" text @click="showStartDialog = false" />
        <Button label="启动" icon="pi pi-play" @click="handleStartWorker" :loading="starting" />
      </template>
    </Dialog>

    <!-- Worker 异常退出日志对话框 -->
    <Dialog v-model:visible="showLogsDialog" header="Worker 退出日志" modal style="width: 50rem">
      <div v-if="selectedWorkerLogs" class="flex flex-col gap-3">
        <div class="flex gap-4">
          <span class="font-semibold">Worker ID:</span>
          <span class="font-mono text-sm">{{ selectedWorkerLogs.agent_worker_id }}</span>
        </div>
        <div class="flex gap-4">
          <span class="font-semibold">服务:</span>
          <span>{{ selectedWorkerLogs.service }}</span>
        </div>
        <pre class="log-output">{{ selectedWorkerLogs.stop_reason }}</pre>
      </div>
    </Dialog>
  </div>

  <div v-else-if="loading" class="flex justify-center p-8">
    <ProgressSpinner />
  </div>

  <div v-else>
    <Message severity="error">节点不存在</Message>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as nodesApi from '@/api/nodes'
import type { NodeDetailResponse } from '@/types/node'
import { usePolling } from '@/composables/usePolling'
import StatsCard from '@/components/StatsCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Panel from 'primevue/panel'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

const route = useRoute()
const router = useRouter()
const nodeId = route.params.id as string

const node = ref<NodeDetailResponse | null>(null)
const loading = ref(true)
const showStartDialog = ref(false)
const starting = ref(false)
const showLogsDialog = ref(false)
const selectedWorkerLogs = ref<{ agent_worker_id: string; service: string; stop_reason: string } | null>(null)

const startForm = ref({
  service: 'admet',
  deploy_mode: 'docker',
})
const serviceOptions = ['admet', 'cxcalc', 'docking']
const deployOptions = ['host', 'docker']

async function fetchDetail() {
  try {
    const { data } = await nodesApi.getNode(nodeId)
    node.value = data
  } catch {
    node.value = null
  } finally {
    loading.value = false
  }
}

const { refresh } = usePolling(fetchDetail, 10_000)

function workerStatusSeverity(status: string) {
  const map: Record<string, string> = {
    starting: 'warn',
    online: 'success',
    busy: 'warn',
    draining: 'warn',
    stopping: 'warn',
    stopped: 'secondary',
    offline: 'danger',
  }
  return (map[status] || 'secondary') as any
}

function cmdStatusSeverity(status: string) {
  const map: Record<string, string> = {
    pending: 'warn',
    success: 'success',
    failed: 'danger',
    timeout: 'danger',
  }
  return (map[status] || 'secondary') as any
}

async function handleStartWorker() {
  starting.value = true
  try {
    await nodesApi.startWorker(nodeId, {
      service: startForm.value.service,
      deploy_mode: startForm.value.deploy_mode,
    })
    showStartDialog.value = false
    refresh()
  } finally {
    starting.value = false
  }
}

async function handleStopWorker(agentWorkerId: string) {
  await nodesApi.stopWorker(nodeId, agentWorkerId, { graceful: true, timeout: 300 })
  refresh()
}

function showStopReasonDialog(worker: any) {
  selectedWorkerLogs.value = {
    agent_worker_id: worker.agent_worker_id,
    service: worker.service,
    stop_reason: worker.stop_reason,
  }
  showLogsDialog.value = true
}
</script>

<style scoped>
.log-output {
  background: var(--p-surface-900);
  color: var(--p-green-400);
  padding: 1rem;
  border-radius: var(--p-content-border-radius);
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
}
</style>
