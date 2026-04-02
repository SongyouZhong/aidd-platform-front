export enum WorkerStatus {
  STARTING = 'starting',
  ONLINE = 'online',
  BUSY = 'busy',
  DRAINING = 'draining',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  OFFLINE = 'offline',
}

export interface ResourceUsage {
  cpu_cores: number
  cpu_percent: number
  memory_gb: number
  memory_percent: number
  gpu_count: number
  gpu_memory_gb: number
  gpu_utilization: number
}

export interface Worker {
  id: string
  node_id: string
  agent_worker_id?: string
  service: string
  deploy_mode: string
  hostname?: string
  ip_address?: string
  port: number
  status: WorkerStatus
  total_resources: ResourceUsage
  used_resources: ResourceUsage
  available_resources: ResourceUsage
  supported_services: string[]
  max_concurrent_tasks: number
  current_tasks: string[]
  labels: Record<string, string>
  utilization: number
  started_at?: string
  last_heartbeat?: string
  total_tasks_completed: number
  total_tasks_failed: number
}

export interface WorkerListResponse {
  total: number
  online: number
  items: Worker[]
}

export interface ClusterStatsResponse {
  total_workers: number
  online_workers: number
  total_cpu: number
  used_cpu: number
  available_cpu: number
  total_memory_gb: number
  used_memory_gb: number
  available_memory_gb: number
  total_gpu: number
  used_gpu: number
  available_gpu: number
}

export interface WorkerQueryParams {
  status?: WorkerStatus
  service?: string
}
