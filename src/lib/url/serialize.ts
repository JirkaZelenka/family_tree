import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

export interface UrlAppState {
  view?: string
  sel?: string
  year?: number
  showContemporaries?: boolean
  heatmap?: boolean
}

export function serializeAppState(state: UrlAppState): string {
  const json = JSON.stringify(state)
  return compressToEncodedURIComponent(json)
}

export function deserializeAppState(hash: string): UrlAppState | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    const json = decompressFromEncodedURIComponent(raw)
    if (!json) return null
    return JSON.parse(json) as UrlAppState
  } catch {
    return null
  }
}

export function applyStateToUrl(state: UrlAppState): void {
  const encoded = serializeAppState(state)
  const url = new URL(window.location.href)
  url.hash = encoded
  window.history.replaceState(null, '', url.toString())
}

export function readStateFromUrl(): UrlAppState | null {
  if (!window.location.hash) return null
  return deserializeAppState(window.location.hash)
}
