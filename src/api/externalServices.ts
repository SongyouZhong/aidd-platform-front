import client from './client'
import type {
  ExternalService,
  ExternalServiceCreate,
  ExternalServiceUpdate,
  ExternalServiceTestResult,
} from '@/types/externalService'

export function listExternalServices() {
  return client.get<ExternalService[]>('/external-services/')
}

export function getExternalService(name: string) {
  return client.get<ExternalService>('/external-services/' + encodeURIComponent(name))
}

export function createExternalService(data: ExternalServiceCreate) {
  return client.post<ExternalService>('/external-services/', data)
}

export function updateExternalService(name: string, data: ExternalServiceUpdate) {
  return client.put<ExternalService>('/external-services/' + encodeURIComponent(name), data)
}

export function deleteExternalService(name: string) {
  return client.delete('/external-services/' + encodeURIComponent(name))
}

export function testExternalService(name: string) {
  return client.post<ExternalServiceTestResult>(
    '/external-services/' + encodeURIComponent(name) + '/test',
  )
}
