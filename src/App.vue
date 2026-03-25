<template>
  <Toast />
  <ConfirmDialog />
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppLayout from '@/components/AppLayout.vue'
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  background: var(--p-surface-ground);
  color: var(--p-text-color);
}
</style>
