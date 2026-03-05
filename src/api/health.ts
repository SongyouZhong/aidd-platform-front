import client from './client'
import type { HealthResponse, DetailedHealthResponse } from '@/types/health'

export function getHealth() {
  return client.get<HealthResponse>('/health')
}

export function getDetailedHealth() {
  return client.get<DetailedHealthResponse>('/health/detailed')
}
