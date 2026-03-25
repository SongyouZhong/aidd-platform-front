import client from './client'
import type {
  NodeListResponse,
  NodeDetailResponse,
  StartWorkerRequest,
  StartWorkerResponse,
} from '@/types/node'

export function getNodes(params?: { status?: string }) {
  return client.get<NodeListResponse>('/nodes', { params })
}

export function getNode(nodeId: string) {
  return client.get<NodeDetailResponse>('/nodes/' + encodeURIComponent(nodeId))
}

export function startWorker(nodeId: string, data: StartWorkerRequest) {
  return client.post<StartWorkerResponse>(
    '/nodes/' + encodeURIComponent(nodeId) + '/workers',
    data,
  )
}

export function stopWorker(nodeId: string, agentWorkerId: string, data?: { graceful?: boolean; timeout?: number }) {
  return client.delete(
    '/nodes/' + encodeURIComponent(nodeId) + '/workers/' + encodeURIComponent(agentWorkerId),
    { data },
  )
}

export function getCommandResult(nodeId: string, requestId: string) {
  return client.get(
    '/nodes/' + encodeURIComponent(nodeId) + '/commands/' + encodeURIComponent(requestId),
  )
}
