import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Task, QueueStatsResponse, TaskQueryParams } from '@/types/task'
import * as tasksApi from '@/api/tasks'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const totalTasks = ref(0)
  const stats = ref<QueueStatsResponse | null>(null)
  const loading = ref(false)

  async function fetchTasks(params?: TaskQueryParams) {
    loading.value = true
    try {
      const { data } = await tasksApi.getTasks(params)
      tasks.value = data.items
      totalTasks.value = data.total
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    const { data } = await tasksApi.getTaskStats()
    stats.value = data
  }

  return { tasks, totalTasks, stats, loading, fetchTasks, fetchStats }
})
