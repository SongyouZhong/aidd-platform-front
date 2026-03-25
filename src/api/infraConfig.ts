import client from './client'
import type { InfraConfig, InfraConfigUpdate, InfraConfigCreate } from '@/types/infraConfig'

export function listInfraConfigs() {
  return client.get<InfraConfig[]>('/infra-config/')
}

export function getInfraConfig(configName: string = 'default') {
  return client.get<InfraConfig>('/infra-config/' + encodeURIComponent(configName))
}

export function createInfraConfig(data: InfraConfigCreate) {
  return client.post<InfraConfig>('/infra-config/', data)
}

export function updateInfraConfig(configName: string, data: InfraConfigUpdate) {
  return client.put<InfraConfig>('/infra-config/' + encodeURIComponent(configName), data)
}

export function deleteInfraConfig(configName: string) {
  return client.delete('/infra-config/' + encodeURIComponent(configName))
}

export function pushConfigToNodes(configName: string = 'default') {
  return client.post<{ pushed_count: number; online_count: number }>(
    '/infra-config/' + encodeURIComponent(configName) + '/push',
  )
}

export function testInfraConfig(configName: string) {
  return client.post<import('@/types/infraConfig').InfraConfigTestResult>(
    '/infra-config/' + encodeURIComponent(configName) + '/test',
  )
}
