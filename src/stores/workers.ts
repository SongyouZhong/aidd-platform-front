import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Worker, ClusterStatsResponse, WorkerQueryParams } from '@/types/worker'
import * as workersApi from '@/api/workers'

export const useWorkersStore = defineStore('workers', () => {
  const workers = ref<Worker[]>([])
  const totalWorkers = ref(0)
  const onlineWorkers = ref(0)
  const clusterStats = ref<ClusterStatsResponse | null>(null)
  const loading = ref(false)

  async function fetchWorkers(params?: WorkerQueryParams) {
    loading.value = true
    try {
      const { data } = await workersApi.getWorkers(params)
      workers.value = data.items
      totalWorkers.value = data.total
      onlineWorkers.value = data.online
    } finally {
      loading.value = false
    }
  }

  async function fetchClusterStats() {
    const { data } = await workersApi.getWorkerStats()
    clusterStats.value = data
  }

  return { workers, totalWorkers, onlineWorkers, clusterStats, loading, fetchWorkers, fetchClusterStats }
})
