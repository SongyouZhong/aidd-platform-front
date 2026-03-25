<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold m-0">计算节点</h2>
      <Button
        icon="pi pi-refresh"
        label="刷新"
        severity="secondary"
        outlined
        @click="refresh"
      />
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <StatsCard title="总节点数" :value="store.totalNodes" icon="pi pi-server" severity="info" />
      <StatsCard title="在线节点" :value="store.onlineNodes" icon="pi pi-check-circle" severity="success" />
      <StatsCard title="离线节点" :value="store.totalNodes - store.onlineNodes" icon="pi pi-times-circle" severity="danger" />
    </div>

    <!-- 连接中断提示 -->
    <Message v-if="paused" severity="warn" class="mb-4">
      自动刷新已暂停（连续失败 {{ failCount }} 次）
      <Button label="重新连接" size="small" class="ml-2" @click="reconnect" />
    </Message>

    <!-- 节点列表 -->
    <DataTable
      :value="store.nodes"
      :loading="store.loading"
      stripedRows
      paginator
      :rows="20"
      dataKey="node_id"
    >
      <Column field="hostname" header="主机名" sortable>
        <template #body="{ data }">
          <router-link :to="{ name: 'node-detail', params: { id: data.node_id } }" class="text-primary font-semibold no-underline">
            {{ data.hostname }}
          </router-link>
        </template>
      </Column>
      <Column field="node_id" header="Node ID" sortable>
        <template #body="{ data }">
          <span class="text-sm text-color-secondary font-mono">{{ data.node_id }}</span>
        </template>
      </Column>
      <Column field="status" header="状态" sortable style="width: 100px">
        <template #body="{ data }">
          <StatusTag :status="data.status" />
        </template>
      </Column>
      <Column field="worker_count" header="Worker" sortable style="width: 80px" />
      <Column field="capabilities" header="能力" style="width: 200px">
        <template #body="{ data }">
          <Tag v-for="cap in data.capabilities" :key="cap" :value="cap" severity="info" class="mr-1" />
        </template>
      </Column>
      <Column field="ip_address" header="IP" style="width: 140px" />
      <Column field="last_heartbeat" header="最后心跳" sortable style="width: 180px">
        <template #body="{ data }">
          {{ data.last_heartbeat ? new Date(data.last_heartbeat).toLocaleString() : '-' }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { useNodesStore } from '@/stores/nodes'
import { usePolling } from '@/composables/usePolling'
import StatsCard from '@/components/StatsCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

const store = useNodesStore()

const { paused, failCount, reconnect, refresh } = usePolling(
  () => store.fetchNodes(),
  10_000,
)
</script>
