import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NodeResponse, NodeDetailResponse } from '@/types/node'
import * as nodesApi from '@/api/nodes'

export const useNodesStore = defineStore('nodes', () => {
  const nodes = ref<NodeResponse[]>([])
  const totalNodes = ref(0)
  const onlineNodes = ref(0)
  const loading = ref(false)

  async function fetchNodes(params?: { status?: string }) {
    loading.value = true
    try {
      const { data } = await nodesApi.getNodes(params)
      nodes.value = data.items
      totalNodes.value = data.total
      onlineNodes.value = data.online
    } finally {
      loading.value = false
    }
  }

  return { nodes, totalNodes, onlineNodes, loading, fetchNodes }
})
