// =============================================================================
// 基础设施配置 (InfraConfig) 类型定义
// =============================================================================

export interface InfraConfig {
  config_name: string

  redis_host: string
  redis_port: number
  redis_password: string
  redis_db: number

  registry_host: string
  registry_insecure: boolean

  postgres_host: string
  postgres_port: number
  postgres_user: string
  postgres_password: string
  postgres_db: string

  minio_endpoint?: string
  minio_access_key?: string
  minio_secret_key: string
  minio_use_ssl: boolean

  platform_url?: string
  heartbeat_interval: number
  agent_image: string

  updated_at?: string
}

export interface InfraConfigUpdate {
  redis_host?: string
  redis_port?: number
  redis_password?: string
  redis_db?: number

  registry_host?: string
  registry_insecure?: boolean

  postgres_host?: string
  postgres_port?: number
  postgres_user?: string
  postgres_password?: string
  postgres_db?: string

  minio_endpoint?: string
  minio_access_key?: string
  minio_secret_key?: string
  minio_use_ssl?: boolean

  platform_url?: string
  heartbeat_interval?: number
  agent_image?: string
}

export interface InfraConfigCreate {
  config_name: string
  redis_host: string
  redis_port?: number
  redis_password?: string
  redis_db?: number
  registry_host: string
  registry_insecure?: boolean
  postgres_host?: string
  postgres_port?: number
  postgres_user?: string
  postgres_password?: string
  postgres_db?: string
  minio_endpoint?: string
  minio_access_key?: string
  minio_secret_key?: string
  minio_use_ssl?: boolean
  platform_url?: string
  heartbeat_interval?: number
  agent_image?: string
}

// =============================================================================
// 连通性测试结果
// =============================================================================

export interface ServiceTestResult {
  ok: boolean | null   // null = 跳过（未配置）
  latency_ms: number | null
  error: string | null
}

export interface InfraConfigTestResult {
  redis: ServiceTestResult
  postgres: ServiceTestResult
  minio: ServiceTestResult
  registry: ServiceTestResult
  platform: ServiceTestResult
}
