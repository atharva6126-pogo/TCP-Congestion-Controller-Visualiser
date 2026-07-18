import { requestJson } from './client'

export interface HealthResponse {
  status: string
}

export function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health')
}
