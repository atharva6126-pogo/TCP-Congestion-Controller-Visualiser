/**
 * HTTP client for the simulation service.
 *
 * All endpoint modules in this folder go through requestJson so error
 * handling, base-path resolution, and JSON parsing live in one place.
 * The Vite dev server proxies /api to the FastAPI backend.
 */

const API_BASE_PATH = '/api'

export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Simulation service unreachable', null)
  }

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status} ${response.statusText}`, response.status)
  }

  return (await response.json()) as T
}
