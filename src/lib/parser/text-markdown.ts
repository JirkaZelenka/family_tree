import { parseFrontmatter } from '@/lib/parser/markdown'
import { rodNamesMatch } from '@/lib/vault/lineage-colors'
import { normalizeLineageKey } from '@/lib/vault/lineage-names'
import type {
  TextAttachment,
  TextAttachmentKind,
  TextDocument,
  TextMention,
  TextMentionKind,
  UnresolvedTextMention,
} from '@/types/text'

/** Odkaz MD, multi-word zmínka, single-word zmínka — v tomto pořadí. */
const TOKEN_RE =
  /\[([^\]]+)\]\(([^)\s]+)\)|\[([^\]]+)\]\{([^}]+)\}|([^\s[\]{}]+)\{([^}]+)\}/g

export function isTextMarkdownPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/')
  if (!normalized.endsWith('.md')) return false
  if (/(^|\/)people\//.test(normalized)) return false
  return /(^|\/)texts\//.test(normalized)
}

export function textDocumentIdFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const nested = normalized.match(/(?:^|\/)texts\/(.+)\.md$/i)
  if (nested?.[1]) return nested[1]
  const base = normalized.split('/').pop() ?? normalized
  return base.replace(/\.md$/i, '')
}

function titleFromFilename(filePath: string): string {
  return textDocumentIdFromPath(filePath)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(data: unknown, body: string, filePath: string): string {
  if (data && typeof data === 'object' && 'title' in data) {
    const title = (data as { title?: unknown }).title
    if (typeof title === 'string' && title.trim()) return title.trim()
  }
  const heading = body.match(/^#\s+(.+)$/m)
  if (heading?.[1]?.trim()) return heading[1].trim()
  return titleFromFilename(filePath)
}

function extractDate(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('date' in data)) return undefined
  const date = (data as { date?: unknown }).date
  if (date == null) return undefined
  const value = String(date).trim()
  return value.length > 0 ? value : undefined
}

function extractFamily(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const record = data as { family?: unknown; lineage?: unknown }
  for (const key of ['family', 'lineage'] as const) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

export function classifyAttachmentHref(href: string): TextAttachmentKind {
  const clean = href.split('?')[0].split('#')[0].toLowerCase()
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(clean)) return 'audio'
  if (/\.pdf$/i.test(clean)) return 'pdf'
  return 'link'
}

function normalizeVaultRelPath(path: string): string {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.join('/')
}

export function resolveAttachmentTarget(
  href: string,
  textFilePath: string,
): { resolvedUrl: string; vaultPath?: string } {
  const trimmed = href.trim()
  if (!trimmed) return { resolvedUrl: trimmed }
  if (/^(https?:)?\/\//i.test(trimmed) || /^(mailto|tel):/i.test(trimmed)) {
    return { resolvedUrl: trimmed.startsWith('//') ? `https:${trimmed}` : trimmed }
  }
  if (trimmed.startsWith('/vault/')) {
    const vaultPath = normalizeVaultRelPath(trimmed.slice('/vault/'.length))
    return { resolvedUrl: `/vault/${vaultPath}`, vaultPath }
  }
  if (trimmed.startsWith('/')) {
    return { resolvedUrl: trimmed }
  }
  const dir = textFilePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '')
  const vaultPath = normalizeVaultRelPath(`${dir}/${trimmed}`)
  return { resolvedUrl: `/vault/${vaultPath}`, vaultPath }
}

export function extractMentions(body: string): {
  displayBody: string
  mentions: UnresolvedTextMention[]
} {
  const { displayBody, mentions } = extractTextBodyContent(body, 'texts/unknown.md')
  return { displayBody, mentions }
}

export function extractTextBodyContent(
  body: string,
  textFilePath: string,
): {
  displayBody: string
  mentions: UnresolvedTextMention[]
  attachments: TextAttachment[]
} {
  const mentions: UnresolvedTextMention[] = []
  const attachments: TextAttachment[] = []
  let displayBody = ''
  let lastIndex = 0

  for (const match of body.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0
    displayBody += body.slice(lastIndex, index)
    const start = displayBody.length

    if (match[1] != null && match[2] != null) {
      const label = match[1].trim() || match[2].trim()
      const href = match[2].trim()
      displayBody += label
      const end = displayBody.length
      if (href) {
        const resolved = resolveAttachmentTarget(href, textFilePath)
        attachments.push({
          kind: classifyAttachmentHref(href),
          label,
          href,
          resolvedUrl: resolved.resolvedUrl,
          vaultPath: resolved.vaultPath,
          start,
          end,
        })
      }
    } else {
      const display = (match[3] ?? match[5] ?? '').trim()
      const rawRef = (match[4] ?? match[6] ?? '').trim()
      displayBody += display
      if (display.length > 0 && rawRef.length > 0) {
        mentions.push({
          display,
          rawRef,
          start,
          end: start + display.length,
        })
      }
    }

    lastIndex = index + match[0].length
  }

  displayBody += body.slice(lastIndex)
  return { displayBody, mentions, attachments }
}

function matchLineageKey(raw: string, lineages: Iterable<string>): string | null {
  const needle = raw.trim()
  if (!needle) return null
  const list = [...lineages]
  const exact = list.find((key) => key === needle)
  if (exact) return exact
  const normalized = normalizeLineageKey(needle)
  const byNorm = list.find((key) => normalizeLineageKey(key) === normalized)
  if (byNorm) return byNorm
  const fuzzy = list.find((key) => rodNamesMatch(key, needle))
  return fuzzy ?? null
}

export function resolveTextRef(
  rawRef: string,
  personIds: Iterable<string>,
  lineages: Iterable<string>,
): { kind: TextMentionKind; ref: string } | null {
  const raw = rawRef.trim()
  if (!raw) return null

  const explicit = raw.match(/^(rod|lineage)\s*:\s*(.+)$/i)
  if (explicit?.[2]) {
    const key = matchLineageKey(explicit[2], lineages)
    return { kind: 'lineage', ref: key ?? explicit[2].trim() }
  }

  const personSet = personIds instanceof Set ? personIds : new Set(personIds)
  if (personSet.has(raw)) return { kind: 'person', ref: raw }

  const lineage = matchLineageKey(raw, lineages)
  if (lineage) return { kind: 'lineage', ref: lineage }

  return null
}

export function resolveMentions(
  mentions: UnresolvedTextMention[],
  personIds: Iterable<string>,
  lineages: Iterable<string>,
): TextMention[] {
  const resolved: TextMention[] = []
  for (const mention of mentions) {
    const target = resolveTextRef(mention.rawRef, personIds, lineages)
    if (!target) continue
    resolved.push({
      kind: target.kind,
      ref: target.ref,
      display: mention.display,
      start: mention.start,
      end: mention.end,
    })
  }
  return resolved
}

export function parseTextMarkdown(
  content: string,
  filePath: string,
  personIds: Iterable<string> = [],
  lineages: Iterable<string> = [],
): TextDocument {
  const { data, body } = parseFrontmatter(content)
  const { displayBody, mentions, attachments } = extractTextBodyContent(body, filePath)
  return {
    id: textDocumentIdFromPath(filePath),
    title: extractTitle(data, body, filePath),
    date: extractDate(data),
    family: extractFamily(data),
    filePath,
    rawContent: String(content).replace(/^\uFEFF/, ''),
    displayBody,
    mentions: resolveMentions(mentions, personIds, lineages),
    attachments,
  }
}
