<template>
  <div class="resource-bar">
    <div class="resource-bar-header">
      <span class="resource-bar-label">{{ label }}</span>
      <span class="resource-bar-value">{{ used }}/{{ total }} {{ unit }}</span>
    </div>
    <ProgressBar :value="percentage" :showValue="true" :style="{ height: '1.2rem' }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'

const props = defineProps<{
  label: string
  used: number
  total: number
  unit: string
}>()

const percentage = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.used / props.total) * 100)
})
</script>

<style scoped>
.resource-bar {
  margin-bottom: 0.75rem;
}

.resource-bar-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.resource-bar-label {
  font-weight: 600;
}

.resource-bar-value {
  color: var(--p-text-muted-color);
}
</style>
