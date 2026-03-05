import client from './client'
import type {
  Worker,
  WorkerListResponse,
  ClusterStatsResponse,
  WorkerQueryParams,
} from '@/types/worker'

export function getWorkers(params?: WorkerQueryParams) {
  return client.get<WorkerListResponse>('/workers', { params })
}

export function getWorker(workerId: string) {
  return client.get<Worker>('/workers/' + encodeURIComponent(workerId))
}

export function getWorkerStats() {
  return client.get<ClusterStatsResponse>('/workers/stats')
}

export function deleteWorker(workerId: string) {
  return client.delete('/workers/' + encodeURIComponent(workerId))
}
