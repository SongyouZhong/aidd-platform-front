<template>
  <div class="layout">
    <Menubar :model="menuItems" class="layout-topbar">
      <template #start>
        <span class="layout-logo" @click="router.push('/')">
          <i class="pi pi-th-large" style="margin-right: 0.5rem"></i>
          AIDD Platform
        </span>
      </template>
    </Menubar>

    <div class="layout-content">
      <slot />
    </div>

    <div class="layout-footer">
      &copy; 2025 AIDD Platform v0.1.0
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Menubar from 'primevue/menubar'

const router = useRouter()

const menuItems = [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    command: () => router.push('/'),
  },
  {
    label: 'Tasks',
    icon: 'pi pi-list',
    command: () => router.push('/tasks'),
  },
  {
    label: 'Workers',
    icon: 'pi pi-server',
    command: () => router.push('/workers'),
  },
  {
    label: 'Nodes',
    icon: 'pi pi-sitemap',
    command: () => router.push('/nodes'),
  },
  {
    label: 'Infra Config',
    icon: 'pi pi-cog',
    command: () => router.push('/infra-config'),
  },
  {
    label: 'External Services',
    icon: 'pi pi-bolt',
    command: () => router.push('/external-services'),
  },
]
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout-topbar {
  border-radius: 0;
}

.layout-logo {
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  margin-right: 2rem;
  color: var(--p-primary-color);
  display: flex;
  align-items: center;
}

.layout-content {
  flex: 1;
  padding: 1.5rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.layout-footer {
  text-align: center;
  padding: 1rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  border-top: 1px solid var(--p-content-border-color);
}
</style>
