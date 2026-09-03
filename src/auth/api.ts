import type { AuthUser } from '@/auth/roles'

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = csrfToken()
  if (token && !headers.has('X-CSRFToken')) {
    headers.set('X-CSRFToken', token)
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })
  let data = {} as T
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      data = {} as T
    }
  }
  return { ok: response.ok, status: response.status, data }
}

export async function fetchCsrf(): Promise<void> {
  await request('/api/auth/csrf')
}

export async function fetchMe(): Promise<AuthUser | null> {
  await fetchCsrf()
  const { ok, data } = await request<AuthUser>('/api/auth/me')
  return ok ? data : null
}

export async function loginRequest(username: string, password: string): Promise<
  { ok: true; user: AuthUser } | { ok: false; error: string }
> {
  await fetchCsrf()
  const { ok, data } = await request<AuthUser & { error?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (!ok) {
    return { ok: false, error: data.error || 'Přihlášení se nezdařilo.' }
  }
  return { ok: true, user: data }
}

export async function logoutRequest(): Promise<void> {
  await fetchCsrf()
  await request('/api/auth/logout', { method: 'POST' })
}
