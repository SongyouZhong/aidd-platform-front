// =============================================================================
// Node (计算节点) 类型定义
// =============================================================================

export enum NodeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export type NodeType = 'compute' | 'external_service'

export enum NodeWorkerStatus {
  STARTING = 'starting',
  ONLINE = 'online',
  BUSY = 'busy',
  DRAINING = 'draining',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  OFFLINE = 'offline',
}

export enum CommandStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

export interface NodeWorker {
  id?: string
  node_id: string
  agent_worker_id?: string
  service: string
  deploy_mode: string
  image_tag?: string
  status: NodeWorkerStatus
  hostname?: string
  ip_address?: string
  port?: number
  started_at?: string
  stopped_at?: string
  stop_reason?: string
  last_heartbeat?: string
}

export interface NodeCommand {
  id?: string
  request_id: string
  node_id: string
  command: string
  payload: Record<string, any>
  status: CommandStatus
  result?: Record<string, any>
  issued_by: string
  issued_at?: string
  completed_at?: string
}

export interface NodeResponse {
  id?: string
  node_id: string
  hostname: string
  ip_address?: string
  capabilities: string[]
  os_info?: string
  schrodinger_path?: string
  node_type: NodeType
  status: NodeStatus
  worker_count: number
  last_heartbeat?: string
  registered_at?: string
  health_detail?: Record<string, any> | null
}

export interface NodeDetailResponse extends NodeResponse {
  workers: NodeWorker[]
  recent_commands: NodeCommand[]
}

export interface NodeListResponse {
  total: number
  online: number
  items: NodeResponse[]
}

export interface StartWorkerRequest {
  service: string
  deploy_mode?: string
  config?: Record<string, any>
}

export interface StartWorkerResponse {
  request_id: string
  node_id: string
  command: string
  status: CommandStatus
}

export interface StopWorkerRequest {
  graceful?: boolean
  timeout?: number
}
