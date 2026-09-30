import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

export interface UrlAppState {
  view?: string
  /** Otevřený text na stránce Povídání (`TextDocument.id`). */
  text?: string
  sel?: string
  year?: number
  showContemporaries?: boolean
}

const VIEW_SEGMENTS = new Set(['tree', 'timeline', 'calendar', 'map', 'texts', 'stories'])

/** Cesta + query, např. `/texts/pokus?sel=1` nebo `/tree?year=1950`. */
export function stateToPath(state: UrlAppState): string {
  const view = state.view ?? 'tree'
  const segment = view === 'stories' ? 'texts' : view === 'sphere' || view === 'force' ? 'tree' : view
  let pathname = `/${segment}`
  if ((view === 'stories' || segment === 'texts') && state.text) {
    pathname += `/${state.text
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/')}`
  }

  const params = new URLSearchParams()
  if (state.sel) params.set('sel', state.sel)
  if (state.year != null && Number.isFinite(state.year)) params.set('year', String(state.year))
  if (state.showContemporaries) params.set('c', '1')
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function pathToState(pathname: string, search = ''): UrlAppState | null {
  const clean = pathname.replace(/\/+$/, '') || '/'
  const parts = clean.split('/').filter(Boolean)
  if (parts.length === 0) return { view: 'tree' }

  const head = parts[0]
  if (!VIEW_SEGMENTS.has(head) && head !== 'force' && head !== 'sphere') {
    return null
  }

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const sel = params.get('sel') || undefined
  const yearRaw = params.get('year')
  const year = yearRaw && /^\d+$/.test(yearRaw) ? Number(yearRaw) : undefined
  const showContemporaries = params.get('c') === '1' ? true : undefined

  const extras: Pick<UrlAppState, 'sel' | 'year' | 'showContemporaries'> = {}
  if (sel) extras.sel = sel
  if (year != null) extras.year = year
  if (showContemporaries) extras.showContemporaries = true

  if (head === 'texts' || head === 'stories') {
    const text =
      parts.length > 1
        ? parts
            .slice(1)
            .map((part) => decodeURIComponent(part))
            .join('/')
        : undefined
    return { view: 'stories', text, ...extras }
  }

  if (head === 'force' || head === 'sphere') {
    return { view: 'tree', ...extras }
  }

  return { view: head, ...extras }
}

/** Legacy lz-string hash (zpětná kompatibilita). */
export function serializeAppState(state: UrlAppState): string {
  const json = JSON.stringify(state)
  return compressToEncodedURIComponent(json)
}

export function deserializeAppState(hash: string): UrlAppState | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (!raw) return null
    // Čitelná cesta omylem v hashi (např. #/tree)
    if (raw.startsWith('/')) {
      const [pathPart, queryPart] = raw.split('?')
      return pathToState(pathPart, queryPart ? `?${queryPart}` : '')
    }
    const json = decompressFromEncodedURIComponent(raw)
    if (!json) return null
    return JSON.parse(json) as UrlAppState
  } catch {
    return null
  }
}

function currentHrefPath(url: URL): string {
  return `${url.pathname}${url.search}`
}

export function writeAppStateToUrl(
  state: UrlAppState,
  mode: 'push' | 'replace' = 'replace',
): void {
  const nextPath = stateToPath(state)
  const url = new URL(window.location.href)
  const [pathname, query = ''] = nextPath.split('?')
  url.pathname = pathname
  url.search = query ? `?${query}` : ''
  url.hash = ''
  const next = currentHrefPath(url)
  if (currentHrefPath(new URL(window.location.href)) === next && !window.location.hash) return
  if (mode === 'push') {
    window.history.pushState(null, '', next)
  } else {
    window.history.replaceState(null, '', next)
  }
}

/** @deprecated prefer writeAppStateToUrl */
export function applyStateToUrl(state: UrlAppState): void {
  writeAppStateToUrl(state, 'replace')
}

export function readStateFromUrl(): UrlAppState | null {
  // Preferuj čitelnou cestu; starý lz-hash jen když path nic neříká.
  const fromPath = pathToState(window.location.pathname, window.location.search)
  if (fromPath) return fromPath
  if (window.location.hash) return deserializeAppState(window.location.hash)
  return null
}

/** Klíč navigace (view + text) — změna = nový history entry pro Back. */
export function urlNavKey(state: UrlAppState): string {
  const view = state.view ?? ''
  const text = view === 'stories' ? (state.text ?? '') : ''
  return `${view}|${text}`
}
