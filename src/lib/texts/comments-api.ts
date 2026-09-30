export interface TextCommentDto {
  id: number
  textId: string
  start: number
  end: number
  quote: string
  body: string
  authorUsername: string
  createdAt: string
  canDelete: boolean
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T }> {
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

function encodeTextIdPath(textId: string): string {
  return textId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export async function fetchTextComments(textId: string): Promise<TextCommentDto[]> {
  const { ok, data } = await request<{ comments?: TextCommentDto[] }>(
    `/api/texts/${encodeTextIdPath(textId)}/comments`,
  )
  if (!ok) return []
  return data.comments ?? []
}

export async function createTextComment(
  textId: string,
  payload: { start: number; end: number; quote: string; body: string },
): Promise<{ ok: true; comment: TextCommentDto } | { ok: false; error: string }> {
  const { ok, data } = await request<TextCommentDto & { error?: string }>(
    `/api/texts/${encodeTextIdPath(textId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  if (!ok) {
    return { ok: false, error: data.error || 'Komentář se nepodařilo uložit.' }
  }
  return { ok: true, comment: data }
}

export async function deleteTextComment(
  commentId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { ok, data } = await request<{ error?: string }>(`/api/texts/comments/${commentId}`, {
    method: 'DELETE',
  })
  if (!ok) {
    return { ok: false, error: data.error || 'Komentář se nepodařilo smazat.' }
  }
  return { ok: true }
}
