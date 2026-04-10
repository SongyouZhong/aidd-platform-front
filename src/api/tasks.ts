import client from './client'
import type {
  Task,
  TaskListResponse,
  QueueStatsResponse,
  TaskCreate,
  TaskQueryParams,
} from '@/types/task'

export function getTasks(params?: TaskQueryParams) {
  return client.get<TaskListResponse>('/tasks', { params })
}

export function getTask(taskId: string) {
  return client.get<Task>('/tasks/' + encodeURIComponent(taskId))
}

export function getTaskStats() {
  return client.get<QueueStatsResponse>('/tasks/stats')
}

export interface ServiceStats {
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

export interface StatsByServiceResponse {
  services: Record<string, ServiceStats>
}

export function getTaskStatsByService() {
  return client.get<StatsByServiceResponse>('/tasks/stats/by-service')
}

export function createTask(data: TaskCreate) {
  return client.post<Task>('/tasks', data)
}

export function cancelTask(taskId: string) {
  return client.delete('/tasks/' + encodeURIComponent(taskId))
}
