// =============================================================================
// 外部服务 (External Service) 类型定义
// =============================================================================

export interface ExternalService {
  name: string
  url: string
  health_endpoint: string
  check_interval: number
  timeout: number
  enabled: boolean
  capabilities: string[]
  node_status?: string | null
  last_heartbeat?: string | null
  health_detail?: Record<string, any> | null
  created_at?: string
  updated_at?: string
}

export interface ExternalServiceCreate {
  name: string
  url: string
  health_endpoint?: string
  check_interval?: number
  timeout?: number
  enabled?: boolean
  capabilities?: string[]
}

export interface ExternalServiceUpdate {
  url?: string
  health_endpoint?: string
  check_interval?: number
  timeout?: number
  enabled?: boolean
  capabilities?: string[]
}

export interface ExternalServiceTestResult {
  ok: boolean
  status_code?: number
  detail?: any
  error?: string
}
