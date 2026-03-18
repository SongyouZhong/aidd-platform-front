<template>
  <div v-if="node">
    <!-- 头部 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.push('/nodes')" />
        <h2 class="text-2xl font-bold m-0">{{ node.hostname }}</h2>
        <StatusTag :status="node.status" />
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" label="刷新" severity="secondary" outlined @click="refresh" />
        <Button
          v-if="node.status === 'online'"
          icon="pi pi-plus"
          label="启动 Worker"
          @click="showStartDialog = true"
        />
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <StatsCard title="Worker 数量" :value="node.worker_count" icon="pi pi-cog" severity="info" />
      <StatsCard title="Node ID" :value="node.node_id.slice(0, 16)" icon="pi pi-id-card" />
      <StatsCard title="IP 地址" :value="node.ip_address || '-'" icon="pi pi-globe" />
      <StatsCard title="操作系统" :value="node.os_info || '-'" icon="pi pi-desktop" />
    </div>

    <!-- 能力标签 -->
    <div class="mb-4" v-if="node.capabilities?.length">
      <span class="font-semibold mr-2">支持的服务：</span>
      <Tag v-for="cap in node.capabilities" :key="cap" :value="cap" severity="info" class="mr-1" />
    </div>

    <!-- Worker 列表 -->
    <Panel header="活跃 Workers" class="mb-4">
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
        <Column field="platform_worker_id" header="Platform Worker ID" style="width: 200px">
          <template #body="{ data }">
            <router-link
              v-if="data.platform_worker_id"
              :to="{ name: 'worker-detail', params: { id: data.platform_worker_id } }"
              class="text-primary no-underline font-mono text-sm"
            >
              {{ data.platform_worker_id.slice(0, 8) }}...
            </router-link>
            <span v-else class="text-color-secondary">-</span>
          </template>
        </Column>
        <Column field="started_at" header="启动时间" style="width: 180px">
          <template #body="{ data }">
            {{ data.started_at ? new Date(data.started_at).toLocaleString() : '-' }}
          </template>
        </Column>
        <Column header="操作" style="width: 100px">
          <template #body="{ data }">
            <Button
              v-if="data.status === 'running'"
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

    <!-- 最近命令 -->
    <Panel header="最近命令">
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

const startForm = ref({
  service: 'admet',
  deploy_mode: 'host',
})
const serviceOptions = ['admet', 'docking', 'qsar', 'md']
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
    running: 'success',
    draining: 'warn',
    stopping: 'warn',
    stopped: 'secondary',
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
</script>
