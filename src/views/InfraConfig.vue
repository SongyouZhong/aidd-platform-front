<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold m-0">基础设施配置</h2>
      <Button icon="pi pi-plus" label="新建配置集" @click="openCreateDialog" />
    </div>

    <Message v-if="actionResult" :severity="actionResult.severity" class="mb-4" closable @close="actionResult = null">
      {{ actionResult.message }}
    </Message>

    <!-- Config List -->
    <DataTable
      :value="configs"
      :loading="loading"
      stripedRows
      dataKey="config_name"
      emptyMessage="暂无配置集"
    >
      <Column field="config_name" header="配置名称" style="width: 140px">
        <template #body="{ data }">
          <span class="font-semibold">{{ data.config_name }}</span>
        </template>
      </Column>
      <Column header="Redis" style="width: 180px">
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.redis_host }}:{{ data.redis_port }}</span>
        </template>
      </Column>
      <Column header="PostgreSQL" style="width: 220px">
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.postgres_host }}:{{ data.postgres_port }}/{{ data.postgres_db }}</span>
        </template>
      </Column>
      <Column field="platform_url" header="Platform URL" style="width: 200px">
        <template #body="{ data }">
          <span class="text-sm">{{ data.platform_url || '-' }}</span>
        </template>
      </Column>
      <Column field="agent_image" header="Agent 镜像" style="width: 220px">
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.agent_image }}</span>
        </template>
      </Column>
      <Column header="Docking 扫描" style="width: 140px">
        <template #body="{ data }">
          <span class="text-sm">{{ data.docking_sync_interval }}s / 批{{ data.docking_sync_batch_size }}</span>
        </template>
      </Column>
      <Column header="ADMET 扫描" style="width: 140px">
        <template #body="{ data }">
          <span class="text-sm">{{ data.admet_sync_interval }}s / 批{{ data.admet_sync_batch_size }}</span>
        </template>
      </Column>
      <Column header="CxCalc 扫描" style="width: 140px">
        <template #body="{ data }">
          <span class="text-sm">{{ data.cxcalc_sync_interval }}s / 批{{ data.cxcalc_sync_batch_size }}</span>
        </template>
      </Column>
      <Column header="Schrödinger" style="width: 200px">
        <template #body="{ data }">
          <span class="font-mono text-sm">{{ data.schrodinger_path || '-' }}</span>
        </template>
      </Column>
      <Column field="updated_at" header="更新时间" style="width: 160px">
        <template #body="{ data }">
          {{ data.updated_at ? new Date(data.updated_at).toLocaleString() : '-' }}
        </template>
      </Column>
      <Column header="操作" style="width: 180px">
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
              v-tooltip.top="'快速测试'"
              icon="pi pi-bolt"
              text
              size="small"
              severity="info"
              :loading="!!testingMap[data.config_name]"
              @click="handleTest(data.config_name)"
            />
            <Button
              v-tooltip.top="'推送到节点'"
              icon="pi pi-send"
              text
              size="small"
              severity="warn"
              :loading="!!pushingMap[data.config_name]"
              @click="handlePush(data.config_name)"
            />
            <Button
              v-if="data.config_name !== 'default'"
              v-tooltip.top="'删除'"
              icon="pi pi-trash"
              text
              size="small"
              severity="danger"
              @click="handleDelete(data.config_name)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Test Result Dialog -->
    <Dialog
      v-model:visible="testDialogVisible"
      :header="`连通性测试：${testingConfigName}`"
      modal
      :style="{ width: '520px' }"
    >
      <div v-if="testResult" class="flex flex-col gap-3">
        <div
          v-for="item in testResultRows"
          :key="item.key"
          class="flex items-center justify-between px-3 py-2 rounded border"
          :class="item.borderClass"
        >
          <div class="flex items-center gap-2">
            <i :class="item.icon" :style="{ color: item.iconColor }" />
            <span class="font-semibold">{{ item.label }}</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <span v-if="item.latency !== null" class="text-surface-500">{{ item.latency }} ms</span>
            <Tag
              :value="item.tagLabel"
              :severity="item.severity"
            />
          </div>
        </div>
        <div
          v-for="item in testResultRows.filter(r => r.errorMsg)"
          :key="item.key + '_err'"
          class="text-xs text-red-500 font-mono px-2 py-1 bg-red-50 rounded"
        >
          <span class="font-semibold">{{ item.label }}：</span>{{ item.errorMsg }}
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
      :header="dialogMode === 'create' ? '新建配置集' : `编辑配置集：${editingName}`"
      modal
      :style="{ width: '960px' }"
      :maximizable="true"
    >
      <div class="overflow-y-auto" style="max-height: 72vh">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- Redis -->
          <Panel header="Redis">
            <div class="flex flex-col gap-3">
              <div v-if="dialogMode === 'create'" class="flex flex-col gap-1">
                <label class="font-semibold text-sm">配置名称 *</label>
                <InputText v-model="form.config_name" placeholder="如 production" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Host *</label>
                <InputText v-model="form.redis_host" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Port</label>
                <InputNumber v-model="form.redis_port" :useGrouping="false" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Password</label>
                <Password v-model="form.redis_password" :feedback="false" toggleMask placeholder="不修改请留空" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">DB</label>
                <InputNumber v-model="form.redis_db" :useGrouping="false" />
              </div>
            </div>
          </Panel>

          <!-- PostgreSQL -->
          <Panel header="PostgreSQL">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Host</label>
                <InputText v-model="form.postgres_host" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Port</label>
                <InputNumber v-model="form.postgres_port" :useGrouping="false" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">User</label>
                <InputText v-model="form.postgres_user" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Password</label>
                <Password v-model="form.postgres_password" :feedback="false" toggleMask placeholder="不修改请留空" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Database</label>
                <InputText v-model="form.postgres_db" />
              </div>
            </div>
          </Panel>

          <!-- Docker Registry -->
          <Panel header="Docker Registry">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Host *</label>
                <InputText v-model="form.registry_host" />
              </div>
              <div class="flex items-center gap-2 mt-1">
                <Checkbox v-model="form.registry_insecure" :binary="true" inputId="insecure" />
                <label for="insecure" class="text-sm">Insecure (HTTP)</label>
              </div>
            </div>
          </Panel>

          <!-- MinIO -->
          <Panel header="MinIO 对象存储">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Endpoint</label>
                <InputText v-model="form.minio_endpoint" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Access Key</label>
                <InputText v-model="form.minio_access_key" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Secret Key</label>
                <Password v-model="form.minio_secret_key" :feedback="false" toggleMask placeholder="不修改请留空" />
              </div>
              <div class="flex items-center gap-2 mt-1">
                <Checkbox v-model="form.minio_use_ssl" :binary="true" inputId="ssl" />
                <label for="ssl" class="text-sm">Use SSL</label>
              </div>
            </div>
          </Panel>

          <!-- Platform & Agent -->
          <Panel header="平台 & Agent" class="lg:col-span-2">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Platform URL</label>
                <InputText v-model="form.platform_url" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">心跳间隔（秒）</label>
                <InputNumber v-model="form.heartbeat_interval" :useGrouping="false" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Agent 镜像</label>
                <InputText v-model="form.agent_image" />
              </div>
            </div>
          </Panel>

          <!-- Docking 配置 -->
          <Panel header="Docking 配置" class="lg:col-span-2">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">扫描间隔（秒）</label>
                <InputNumber v-model="form.docking_sync_interval" :useGrouping="false" :min="10" />
                <small class="text-surface-500">建议 60 ~ 3600，修改后下一轮生效</small>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">每批化合物数</label>
                <InputNumber v-model="form.docking_sync_batch_size" :useGrouping="false" :min="1" :max="200" />
                <small class="text-surface-500">Glide 计算较慢，建议 5 ~ 50</small>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">Schrödinger 路径</label>
                <InputText v-model="form.schrodinger_path" placeholder="/opt/schrodinger" />
                <small class="text-surface-500">推送到节点后对新 Worker 生效</small>
              </div>
            </div>
          </Panel>

          <!-- ADMET 配置 -->
          <Panel header="ADMET 配置">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">扫描间隔（秒）</label>
                <InputNumber v-model="form.admet_sync_interval" :useGrouping="false" :min="10" />
                <small class="text-surface-500">建议 60 ~ 3600，修改后下一轮生效</small>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">每批化合物数</label>
                <InputNumber v-model="form.admet_sync_batch_size" :useGrouping="false" :min="1" :max="500" />
                <small class="text-surface-500">QikProp 计算较快，建议 50 ~ 200</small>
              </div>
            </div>
          </Panel>

          <!-- CxCalc 配置 -->
          <Panel header="CxCalc 配置">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">扫描间隔（秒）</label>
                <InputNumber v-model="form.cxcalc_sync_interval" :useGrouping="false" :min="10" />
                <small class="text-surface-500">建议 60 ~ 3600，修改后下一轮生效</small>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-semibold text-sm">每批化合物数</label>
                <InputNumber v-model="form.cxcalc_sync_batch_size" :useGrouping="false" :min="1" :max="500" />
                <small class="text-surface-500">ChemAxon 计算较快，建议 50 ~ 200</small>
              </div>
            </div>
          </Panel>

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
import { ref, reactive, onMounted, computed } from 'vue'
import * as infraApi from '@/api/infraConfig'
import type { InfraConfig, InfraConfigTestResult } from '@/types/infraConfig'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Panel from 'primevue/panel'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'

const configs = ref<InfraConfig[]>([])
const loading = ref(false)
const saving = ref(false)
const pushingMap = reactive<Record<string, boolean>>({})
const testingMap = reactive<Record<string, boolean>>({})
const testDialogVisible = ref(false)
const testingConfigName = ref('')
const testResult = ref<InfraConfigTestResult | null>(null)
const actionResult = ref<{ severity: string; message: string } | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('edit')
const editingName = ref('')
const originalConfig = ref<InfraConfig | null>(null)

const MASK = '********'

const form = reactive({
  config_name: '',
  redis_host: '',
  redis_port: 6379,
  redis_password: '',
  redis_db: 0,
  registry_host: '',
  registry_insecure: true,
  postgres_host: '',
  postgres_port: 5432,
  postgres_user: 'appuser',
  postgres_password: '',
  postgres_db: 'aichemol',
  minio_endpoint: '',
  minio_access_key: '',
  minio_secret_key: '',
  minio_use_ssl: false,
  platform_url: '',
  heartbeat_interval: 30,
  agent_image: 'aidd-node-agent:latest',
  docking_sync_interval: 3600,
  docking_sync_batch_size: 10,
  schrodinger_path: '/opt/schrodinger',
  admet_sync_interval: 3600,
  admet_sync_batch_size: 50,
  cxcalc_sync_interval: 60,
  cxcalc_sync_batch_size: 50,
})

const testResultRows = computed(() => {
  if (!testResult.value) return []
  const r = testResult.value
  const makeRow = (key: keyof InfraConfigTestResult, label: string, serviceIcon: string) => {
    const s = r[key]
    const skipped = s.ok === null
    const ok = s.ok === true
    return {
      key,
      label,
      icon: skipped ? 'pi pi-minus-circle' : ok ? 'pi pi-check-circle' : 'pi pi-times-circle',
      iconColor: skipped ? '#94a3b8' : ok ? '#22c55e' : '#ef4444',
      borderClass: skipped ? 'border-surface-200' : ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
      tagLabel: skipped ? '未配置' : ok ? '正常' : '失败',
      severity: (skipped ? 'secondary' : ok ? 'success' : 'danger') as 'secondary' | 'success' | 'danger',
      latency: s.latency_ms,
      errorMsg: s.error,
    }
  }
  return [
    makeRow('redis', 'Redis', 'pi pi-database'),
    makeRow('postgres', 'PostgreSQL', 'pi pi-database'),
    makeRow('minio', 'MinIO', 'pi pi-box'),
    makeRow('registry', 'Docker Registry', 'pi pi-box'),
    makeRow('platform', 'Platform URL', 'pi pi-globe'),
  ]
})

async function handleTest(configName: string) {
  testingMap[configName] = true
  testingConfigName.value = configName
  testResult.value = null
  testDialogVisible.value = true
  try {
    const { data } = await infraApi.testInfraConfig(configName)
    testResult.value = data
  } catch (e: any) {
    testDialogVisible.value = false
    actionResult.value = { severity: 'error', message: '测试失败：' + (e.response?.data?.detail || e.message) }
  } finally {
    testingMap[configName] = false
  }
}

async function loadConfigs() {
  loading.value = true
  try {
    const { data } = await infraApi.listInfraConfigs()
    configs.value = data
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: '加载配置列表失败：' + (e.response?.data?.detail || e.message) }
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  Object.assign(form, {
    config_name: '',
    redis_host: '',
    redis_port: 6379,
    redis_password: '',
    redis_db: 0,
    registry_host: '',
    registry_insecure: true,
    postgres_host: '',
    postgres_port: 5432,
    postgres_user: 'appuser',
    postgres_password: '',
    postgres_db: 'aichemol',
    minio_endpoint: '',
    minio_access_key: '',
    minio_secret_key: '',
    minio_use_ssl: false,
    platform_url: '',
    heartbeat_interval: 30,
    agent_image: 'aidd-node-agent:latest',
    docking_sync_interval: 3600,
    docking_sync_batch_size: 10,
    schrodinger_path: '/opt/schrodinger',
    admet_sync_interval: 3600,
    admet_sync_batch_size: 50,
    cxcalc_sync_interval: 60,
    cxcalc_sync_batch_size: 50,
  })
  dialogVisible.value = true
}

function openEditDialog(c: InfraConfig) {
  dialogMode.value = 'edit'
  editingName.value = c.config_name
  originalConfig.value = c
  Object.assign(form, {
    config_name: c.config_name,
    redis_host: c.redis_host,
    redis_port: c.redis_port,
    redis_password: '',
    redis_db: c.redis_db,
    registry_host: c.registry_host,
    registry_insecure: c.registry_insecure,
    postgres_host: c.postgres_host,
    postgres_port: c.postgres_port,
    postgres_user: c.postgres_user,
    postgres_password: '',
    postgres_db: c.postgres_db,
    minio_endpoint: c.minio_endpoint || '',
    minio_access_key: c.minio_access_key || '',
    minio_secret_key: '',
    minio_use_ssl: c.minio_use_ssl,
    platform_url: c.platform_url || '',
    heartbeat_interval: c.heartbeat_interval,
    agent_image: c.agent_image,
    docking_sync_interval: c.docking_sync_interval,
    docking_sync_batch_size: c.docking_sync_batch_size,
    schrodinger_path: c.schrodinger_path || '/opt/schrodinger',
    admet_sync_interval: c.admet_sync_interval,
    admet_sync_batch_size: c.admet_sync_batch_size,
    cxcalc_sync_interval: c.cxcalc_sync_interval,
    cxcalc_sync_batch_size: c.cxcalc_sync_batch_size,
  })
  dialogVisible.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      const payload: any = { ...form }
      if (!payload.redis_password) delete payload.redis_password
      if (!payload.postgres_password) delete payload.postgres_password
      if (!payload.minio_secret_key) delete payload.minio_secret_key
      await infraApi.createInfraConfig(payload)
      actionResult.value = { severity: 'success', message: `配置集 '${form.config_name}' 已创建` }
    } else {
      const orig = originalConfig.value!
      const payload: Record<string, any> = {}
      if (form.redis_host !== orig.redis_host) payload.redis_host = form.redis_host
      if (form.redis_port !== orig.redis_port) payload.redis_port = form.redis_port
      if (form.redis_password && form.redis_password !== MASK) payload.redis_password = form.redis_password
      if (form.redis_db !== orig.redis_db) payload.redis_db = form.redis_db
      if (form.registry_host !== orig.registry_host) payload.registry_host = form.registry_host
      if (form.registry_insecure !== orig.registry_insecure) payload.registry_insecure = form.registry_insecure
      if (form.postgres_host !== orig.postgres_host) payload.postgres_host = form.postgres_host
      if (form.postgres_port !== orig.postgres_port) payload.postgres_port = form.postgres_port
      if (form.postgres_user !== orig.postgres_user) payload.postgres_user = form.postgres_user
      if (form.postgres_password && form.postgres_password !== MASK) payload.postgres_password = form.postgres_password
      if (form.postgres_db !== orig.postgres_db) payload.postgres_db = form.postgres_db
      if (form.minio_endpoint !== (orig.minio_endpoint || '')) payload.minio_endpoint = form.minio_endpoint
      if (form.minio_access_key !== (orig.minio_access_key || '')) payload.minio_access_key = form.minio_access_key
      if (form.minio_secret_key && form.minio_secret_key !== MASK) payload.minio_secret_key = form.minio_secret_key
      if (form.minio_use_ssl !== orig.minio_use_ssl) payload.minio_use_ssl = form.minio_use_ssl
      if (form.platform_url !== (orig.platform_url || '')) payload.platform_url = form.platform_url
      if (form.heartbeat_interval !== orig.heartbeat_interval) payload.heartbeat_interval = form.heartbeat_interval
      if (form.agent_image !== orig.agent_image) payload.agent_image = form.agent_image
      if (form.docking_sync_interval !== orig.docking_sync_interval) payload.docking_sync_interval = form.docking_sync_interval
      if (form.docking_sync_batch_size !== orig.docking_sync_batch_size) payload.docking_sync_batch_size = form.docking_sync_batch_size
      if (form.schrodinger_path !== (orig.schrodinger_path || '/opt/schrodinger')) payload.schrodinger_path = form.schrodinger_path
      if (form.admet_sync_interval !== orig.admet_sync_interval) payload.admet_sync_interval = form.admet_sync_interval
      if (form.admet_sync_batch_size !== orig.admet_sync_batch_size) payload.admet_sync_batch_size = form.admet_sync_batch_size
      if (form.cxcalc_sync_interval !== orig.cxcalc_sync_interval) payload.cxcalc_sync_interval = form.cxcalc_sync_interval
      if (form.cxcalc_sync_batch_size !== orig.cxcalc_sync_batch_size) payload.cxcalc_sync_batch_size = form.cxcalc_sync_batch_size

      if (Object.keys(payload).length === 0) {
        actionResult.value = { severity: 'info', message: '没有修改' }
        dialogVisible.value = false
        return
      }
      await infraApi.updateInfraConfig(editingName.value, payload)
      actionResult.value = { severity: 'success', message: '配置已保存' }
    }
    dialogVisible.value = false
    await loadConfigs()
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: '保存失败：' + (e.response?.data?.detail || e.message) }
  } finally {
    saving.value = false
  }
}

async function handlePush(configName: string) {
  pushingMap[configName] = true
  actionResult.value = null
  try {
    const { data } = await infraApi.pushConfigToNodes(configName)
    actionResult.value = {
      severity: 'success',
      message: `已推送到 ${data.pushed_count} / ${data.online_count} 个在线节点`,
    }
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: '推送失败：' + (e.response?.data?.detail || e.message) }
  } finally {
    pushingMap[configName] = false
  }
}

async function handleDelete(configName: string) {
  if (!confirm(`确定要删除配置集 '${configName}' 吗？此操作不可恢复。`)) return
  try {
    await infraApi.deleteInfraConfig(configName)
    actionResult.value = { severity: 'success', message: `配置集 '${configName}' 已删除` }
    await loadConfigs()
  } catch (e: any) {
    actionResult.value = { severity: 'error', message: '删除失败：' + (e.response?.data?.detail || e.message) }
  }
}

onMounted(loadConfigs)
</script>
