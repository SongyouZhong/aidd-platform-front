<template>
  <div class="stats-card" :class="severityClass">
    <div class="stats-card-icon">
      <i :class="icon"></i>
    </div>
    <div class="stats-card-content">
      <div class="stats-card-value">{{ value }}</div>
      <div class="stats-card-title">{{ title }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: string | number
  icon: string
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'secondary'
}>()

const severityClass = computed(() => props.severity ? `stats-card--${props.severity}` : '')
</script>

<style scoped>
.stats-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
}

.stats-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.5rem;
  background: var(--p-primary-50);
  color: var(--p-primary-500);
}

.stats-card--success .stats-card-icon {
  background: var(--p-green-50);
  color: var(--p-green-500);
}
.stats-card--info .stats-card-icon {
  background: var(--p-blue-50);
  color: var(--p-blue-500);
}
.stats-card--warn .stats-card-icon {
  background: var(--p-yellow-50);
  color: var(--p-yellow-600);
}
.stats-card--danger .stats-card-icon {
  background: var(--p-red-50);
  color: var(--p-red-500);
}

.stats-card-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}

.stats-card-title {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin-top: 0.25rem;
}
</style>
