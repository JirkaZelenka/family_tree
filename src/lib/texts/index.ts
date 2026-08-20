import type { TextDocument, TextExcerpt, TextMention, TextOccurrence } from '@/types/text'
import { normalizeLineageKey } from '@/lib/vault/lineage-names'

const EXCERPT_RADIUS = 110

export function excerptAround(
  body: string,
  start: number,
  end: number,
  radius = EXCERPT_RADIUS,
): TextExcerpt {
  const from = Math.max(0, start - radius)
  const to = Math.min(body.length, end + radius)
  const beforeRaw = body.slice(from, start).replace(/\s+/g, ' ')
  const hit = body.slice(start, end).replace(/\s+/g, ' ')
  const afterRaw = body.slice(end, to).replace(/\s+/g, ' ')
  return {
    before: `${from > 0 ? '…' : ''}${beforeRaw.trimStart()}`,
    hit,
    after: `${afterRaw.trimEnd()}${to < body.length ? '…' : ''}`,
  }
}

function mentionsFor(
  document: TextDocument,
  kind: TextMention['kind'],
  ref: string,
): TextMention[] {
  if (kind === 'lineage') {
    const needle = normalizeLineageKey(ref)
    return document.mentions.filter(
      (mention) =>
        mention.kind === 'lineage' &&
        normalizeLineageKey(mention.ref) === needle,
    )
  }
  return document.mentions.filter(
    (mention) => mention.kind === 'person' && mention.ref === ref,
  )
}

function occurrenceFrom(document: TextDocument, mentions: TextMention[]): TextOccurrence {
  const first = mentions[0]
  return {
    document,
    mentions,
    excerpt: excerptAround(document.displayBody, first.start, first.end),
  }
}

export function findPersonTexts(
  documents: TextDocument[],
  personId: string,
): TextOccurrence[] {
  const result: TextOccurrence[] = []
  for (const document of documents) {
    const mentions = mentionsFor(document, 'person', personId)
    if (mentions.length === 0) continue
    result.push(occurrenceFrom(document, mentions))
  }
  return result
}

export function findLineageTexts(
  documents: TextDocument[],
  lineage: string,
): TextOccurrence[] {
  const result: TextOccurrence[] = []
  for (const document of documents) {
    const mentions = mentionsFor(document, 'lineage', lineage)
    if (mentions.length === 0) continue
    result.push(occurrenceFrom(document, mentions))
  }
  return result
}

export function highlightRanges(
  mentions: TextMention[],
): Array<{ start: number; end: number }> {
  return mentions
    .map((mention) => ({ start: mention.start, end: mention.end }))
    .sort((a, b) => a.start - b.start)
}
