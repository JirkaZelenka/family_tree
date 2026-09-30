import type { TextDocument } from '@/types/text'
import type { StoriesSort } from '@/stores/stories-store'

export function dominantFamily(document: TextDocument): string | null {
  const explicit = document.family?.trim()
  return explicit || null
}

/** První rok z rozmezí (`1930-1948`, `1800-X`) nebo z data. */
export function firstYearFromDateRange(value: string | undefined): number | null {
  if (!value) return null
  const trimmed = value.trim()
  const range = trimmed.match(/^(\d{4})\s*[-–—]\s*(?:\d{4}|[Xx?])/)
  if (range) return Number(range[1])
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Number(iso[1])
  const cz = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (cz) return Number(cz[3])
  const year = trimmed.match(/(\d{4})/)
  if (year) return Number(year[1])
  return null
}

function parseSortDate(value: string | undefined): number {
  const year = firstYearFromDateRange(value)
  if (year == null) return Number.POSITIVE_INFINITY
  return Date.UTC(year, 0, 1)
}

export function formatStoryMetaLine(
  document: TextDocument,
  fallbacks: { noFamily?: string; noDate: string },
): string {
  const family = document.family?.trim() || fallbacks.noFamily || '—'
  const date = document.date?.trim() || fallbacks.noDate
  return `${family} - ${date}`
}

export function sortTextDocuments(
  documents: TextDocument[],
  sort: StoriesSort,
): TextDocument[] {
  const copy = [...documents]
  copy.sort((a, b) => {
    if (sort === 'title') {
      return a.title.localeCompare(b.title, 'cs')
    }
    if (sort === 'family') {
      const fa = dominantFamily(a) ?? '\uffff'
      const fb = dominantFamily(b) ?? '\uffff'
      const byFamily = fa.localeCompare(fb, 'cs')
      if (byFamily !== 0) return byFamily
      return a.title.localeCompare(b.title, 'cs')
    }
    const da = parseSortDate(a.date)
    const db = parseSortDate(b.date)
    if (da !== db) return da - db
    return a.title.localeCompare(b.title, 'cs')
  })
  return copy
}

export function previewBody(body: string, maxLen = 220): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat.length <= maxLen) return flat
  return `${flat.slice(0, maxLen).trimEnd()}…`
}
