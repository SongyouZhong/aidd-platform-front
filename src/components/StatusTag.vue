<template>
  <Tag :value="label" :severity="severity" :style="{ textTransform: 'uppercase' }" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import { TaskStatus } from '@/types/task'
import { WorkerStatus } from '@/types/worker'

const props = defineProps<{
  status: string
}>()

const statusConfig: Record<string, { label: string; severity: string }> = {
  [TaskStatus.PENDING]: { label: 'Pending', severity: 'warn' },
  [TaskStatus.QUEUED]: { label: 'Queued', severity: 'warn' },
  [TaskStatus.RUNNING]: { label: 'Running', severity: 'info' },
  [TaskStatus.SUCCESS]: { label: 'Success', severity: 'success' },
  [TaskStatus.FAILED]: { label: 'Failed', severity: 'danger' },
  [TaskStatus.CANCELLED]: { label: 'Cancelled', severity: 'secondary' },
  [TaskStatus.TIMEOUT]: { label: 'Timeout', severity: 'danger' },
  [WorkerStatus.ONLINE]: { label: 'Online', severity: 'success' },
  [WorkerStatus.BUSY]: { label: 'Busy', severity: 'warn' },
  [WorkerStatus.OFFLINE]: { label: 'Offline', severity: 'danger' },
  [WorkerStatus.DRAINING]: { label: 'Draining', severity: 'warn' },
  [WorkerStatus.STARTING]: { label: 'Starting', severity: 'info' },
  [WorkerStatus.STOPPING]: { label: 'Stopping', severity: 'warn' },
  [WorkerStatus.STOPPED]: { label: 'Stopped', severity: 'secondary' },
}

const config = computed(() => statusConfig[props.status] || { label: props.status, severity: 'secondary' })
const label = computed(() => config.value.label)
const severity = computed(() => config.value.severity as any)
</script>
