export interface HealthResponse {
  status: string
  timestamp: string
  version: string
}

export interface DetailedHealthResponse extends HealthResponse {
  scheduler_running: boolean
  running_tasks: number
  pending_tasks: number
  online_workers: number
}
