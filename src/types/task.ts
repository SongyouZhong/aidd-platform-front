export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BATCH = 4,
}

export const TaskPriorityLabel: Record<number, string> = {
  [TaskPriority.CRITICAL]: 'critical',
  [TaskPriority.HIGH]: 'high',
  [TaskPriority.NORMAL]: 'normal',
  [TaskPriority.LOW]: 'low',
  [TaskPriority.BATCH]: 'batch',
}

export interface ResourceRequirement {
  cpu_cores: number
  memory_gb: number
  gpu_count: number
  gpu_memory_gb: number
  estimated_time_seconds: number
}

export interface Task {
  id: string
  job_id?: string
  name?: string
  service: string
  task_type: string
  status: TaskStatus
  priority: TaskPriority
  resources?: ResourceRequirement
  input_params: Record<string, any>
  input_files: string[]
  output_files: string[]
  result?: Record<string, any>
  progress: number
  created_at: string
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  worker_id?: string
  retry_count: number
  max_retries: number
  timeout_seconds: number
  error_message?: string
  user_id?: string
}

export interface TaskListResponse {
  total: number
  items: Task[]
}

export interface QueueStatsResponse {
  total_submitted: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
  retries: number
}

export interface TaskCreate {
  service: string
  task_type?: string
  name?: string
  priority?: TaskPriority
  input_params?: Record<string, any>
  input_files?: string[]
  resource_requirement?: Partial<ResourceRequirement>
  max_retries?: number
  timeout_seconds?: number
  job_id?: string
}

export interface BatchTaskResponse {
  submitted: number
  task_ids: string[]
}

export interface TaskQueryParams {
  status?: TaskStatus
  service?: string
  limit?: number
  offset?: number
}
