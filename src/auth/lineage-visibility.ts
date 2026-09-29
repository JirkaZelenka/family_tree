import { normalizeLineageKey } from '@/lib/vault/lineage-names'
import {
  parseYear,
  uncertaintyPrefixLength,
} from '@/lib/time/dates'
import { tokenMatchesPersonName } from '@/lib/extract/czech-morphology'
import type { PersonRecord } from '@/types/person'
import type { TextDocument, TextMention } from '@/types/text'
import type { AuthUser } from '@/auth/roles'

export const REDACTED_LABEL = 'X'

/** Interní klíč syntetického rodu pro anonymizované osoby z nepovolených rodů. */
export const NO_ACCESS_LINEAGE = '__no_access__'

export function isNoAccessLineage(lineage: string): boolean {
  return lineage === NO_ACCESS_LINEAGE
}

export interface LineageAccess {
  seeAll: boolean
  allowed: Set<string>
}

export function lineageAccessFromUser(user: AuthUser | null | undefined): LineageAccess {
  if (!user) return { seeAll: false, allowed: new Set() }
  if (user.isAdmin || user.allowedLineages == null) {
    return { seeAll: true, allowed: new Set() }
  }
  return {
    seeAll: false,
    allowed: new Set(user.allowedLineages.map((key) => normalizeLineageKey(key))),
  }
}

export function canSeeLineage(access: LineageAccess, lineage: string): boolean {
  if (access.seeAll) return true
  if (isNoAccessLineage(lineage)) return false
  return access.allowed.has(normalizeLineageKey(lineage))
}

/** Den/měsíc pryč, rok (včetně ? / ??) zůstane; místo se nezveřejní. */
export function yearOnlyDate(date: string | undefined | null): string {
  if (date == null) return ''
  const trimmed = date.trim()
  if (!trimmed) return ''
  const year = parseYear(trimmed)
  if (year === null) {
    const prefixes = uncertaintyPrefixLength(trimmed)
    return prefixes > 0 && trimmed.replace(/^\?+/, '') === '' ? trimmed : ''
  }
  const prefixes = uncertaintyPrefixLength(trimmed)
  if (prefixes >= 2) return `??${year}`
  if (prefixes === 1) return `?${year}`
  return String(year)
}

function yearOnlyLifeEvent(event: { date: string; place: string }) {
  return { date: yearOnlyDate(event.date), place: '' }
}

function redactFrontmatter(record: PersonRecord, keepIds: Set<string>): PersonRecord {
  const fm = record.frontmatter
  return {
    ...record,
    body: '',
    redacted: true,
    frontmatter: {
      ...fm,
      givenName: REDACTED_LABEL,
      familyName: '',
      maidenName: null,
      note: '',
      internal_note: '',
      links: [],
      moving: [],
      lineage: NO_ACCESS_LINEAGE,
      birth: yearOnlyLifeEvent(fm.birth),
      death: yearOnlyLifeEvent(fm.death),
      parents: fm.parents.filter((id) => keepIds.has(id)),
      spouses: fm.spouses
        .filter((spouse) => keepIds.has(spouse.id))
        .map((spouse) => ({
          id: spouse.id,
          marriageDate: yearOnlyDate(spouse.marriageDate),
        })),
    },
  }
}

function pruneMissingRefs(record: PersonRecord, keepIds: Set<string>): PersonRecord {
  return {
    ...record,
    frontmatter: {
      ...record.frontmatter,
      parents: record.frontmatter.parents.filter((id) => keepIds.has(id)),
      spouses: record.frontmatter.spouses.filter((spouse) => keepIds.has(spouse.id)),
    },
  }
}

function childrenIndex(records: PersonRecord[]): Map<string, string[]> {
  const childrenOf = new Map<string, string[]>()
  for (const record of records) {
    for (const parentId of record.frontmatter.parents) {
      if (!parentId) continue
      const list = childrenOf.get(parentId)
      if (list) list.push(record.frontmatter.id)
      else childrenOf.set(parentId, [record.frontmatter.id])
    }
  }
  return childrenOf
}

/**
 * Viditelné osoby + jejich partneři, pak uzavření přes rodiče/děti.
 * Každý ponechaný X si tak zachová celý řetězec nahoru i dolů.
 * Nepřipojené osoby z jiných rodů vypadnou.
 */
function collectKeepIds(
  records: PersonRecord[],
  byId: Map<string, PersonRecord>,
  visibleIds: Set<string>,
): Set<string> {
  const keepIds = new Set(visibleIds)
  const childrenOf = childrenIndex(records)

  for (const id of visibleIds) {
    const record = byId.get(id)
    if (!record) continue
    for (const spouse of record.frontmatter.spouses) {
      if (byId.has(spouse.id)) keepIds.add(spouse.id)
    }
  }

  let changed = true
  while (changed) {
    changed = false
    for (const id of [...keepIds]) {
      const record = byId.get(id)
      if (!record) continue
      for (const parentId of record.frontmatter.parents) {
        if (!parentId || !byId.has(parentId) || keepIds.has(parentId)) continue
        keepIds.add(parentId)
        changed = true
      }
      for (const childId of childrenOf.get(id) ?? []) {
        if (!byId.has(childId) || keepIds.has(childId)) continue
        keepIds.add(childId)
        changed = true
      }
    }
  }

  return keepIds
}

/** Osoby z nepovolených rodů pryč; příbuzní (nahoru/dolů) zůstanou jako X s roky. */
export function applyPersonVisibility(
  records: PersonRecord[],
  access: LineageAccess,
): PersonRecord[] {
  if (access.seeAll) return records

  const byId = new Map(records.map((record) => [record.frontmatter.id, record]))
  const visibleIds = new Set(
    records
      .filter((record) => canSeeLineage(access, record.frontmatter.lineage))
      .map((record) => record.frontmatter.id),
  )

  const keepIds = collectKeepIds(records, byId, visibleIds)
  return records
    .filter((record) => keepIds.has(record.frontmatter.id))
    .map((record) =>
      visibleIds.has(record.frontmatter.id)
        ? pruneMissingRefs(record, keepIds)
        : redactFrontmatter(record, keepIds),
    )
}

function personLineage(
  people: Iterable<{ id?: string; frontmatter?: { id: string; lineage: string }; lineage?: string }>,
  personId: string,
): string | undefined {
  for (const person of people) {
    const id = person.frontmatter?.id ?? person.id
    if (id !== personId) continue
    return person.frontmatter?.lineage ?? person.lineage
  }
  return undefined
}

function personRecord(
  people: PersonRecord[],
  personId: string,
): PersonRecord | undefined {
  return people.find((person) => person.frontmatter.id === personId)
}

function mentionHidden(
  mention: TextMention,
  access: LineageAccess,
  people: PersonRecord[],
): boolean {
  if (mention.kind === 'lineage') return !canSeeLineage(access, mention.ref)
  const lineage = personLineage(people, mention.ref)
  if (!lineage) return true
  return !canSeeLineage(access, lineage)
}

const NAME_TOKEN_RE = /\p{L}+/u

/**
 * Bare zmínka `Zuzanou Spilkovou{13}` zachytí jen poslední token; při redakci
 * rozšíří span o sousední křestní/příjmení patřící k dané osobě.
 */
export function expandHiddenMentionSpan(
  body: string,
  start: number,
  end: number,
  person: PersonRecord | undefined,
  blockedRanges: Array<{ start: number; end: number }> = [],
): { start: number; end: number } {
  if (!person) return { start, end }
  const names = {
    givenName: person.frontmatter.givenName,
    familyName: person.frontmatter.familyName,
    maidenName: person.frontmatter.maidenName,
    gender: person.frontmatter.gender as 'male' | 'female' | 'unknown' | undefined,
  }

  const overlapsBlocked = (from: number, to: number) =>
    blockedRanges.some((range) => from < range.end && to > range.start && !(from === start && to === end))

  let nextStart = start
  let nextEnd = end

  const left = body.slice(0, nextStart).match(/(\p{L}+)(\s*)$/u)
  if (left) {
    const token = left[1]
    const ws = left[2] ?? ''
    const tokenStart = nextStart - token.length - ws.length
    if (
      NAME_TOKEN_RE.test(token) &&
      tokenMatchesPersonName(token, names) &&
      !overlapsBlocked(tokenStart, nextStart)
    ) {
      nextStart = tokenStart
    }
  }

  const right = body.slice(nextEnd).match(/^(\s*)(\p{L}+)/u)
  if (right) {
    const ws = right[1] ?? ''
    const token = right[2]
    const tokenEnd = nextEnd + ws.length + token.length
    if (
      NAME_TOKEN_RE.test(token) &&
      tokenMatchesPersonName(token, names) &&
      !overlapsBlocked(nextEnd, tokenEnd)
    ) {
      nextEnd = tokenEnd
    }
  }

  return { start: nextStart, end: nextEnd }
}

export function redactTextDocuments(
  documents: TextDocument[],
  access: LineageAccess,
  people: PersonRecord[],
): TextDocument[] {
  if (access.seeAll) return documents
  return documents.map((document) => redactTextDocument(document, access, people))
}

export function redactTextDocument(
  document: TextDocument,
  access: LineageAccess,
  people: PersonRecord[],
): TextDocument {
  const hidden = document.mentions.filter((mention) => mentionHidden(mention, access, people))
  if (hidden.length === 0) return document

  let displayBody = document.displayBody
  const mentions: TextMention[] = document.mentions.map((mention) => ({ ...mention }))
  const hiddenKeys = new Set(hidden.map((mention) => `${mention.start}:${mention.end}:${mention.ref}`))

  const targets = mentions
    .filter((mention) => hiddenKeys.has(`${mention.start}:${mention.end}:${mention.ref}`))
    .sort((a, b) => b.start - a.start)

  for (const target of targets) {
    const otherRanges = mentions
      .filter(
        (mention) =>
          !(mention.start === target.start && mention.end === target.end && mention.ref === target.ref),
      )
      .map((mention) => ({ start: mention.start, end: mention.end }))

    const person = target.kind === 'person' ? personRecord(people, target.ref) : undefined
    const span = expandHiddenMentionSpan(
      displayBody,
      target.start,
      target.end,
      person,
      otherRanges,
    )

    const oldLen = span.end - span.start
    displayBody = `${displayBody.slice(0, span.start)}${REDACTED_LABEL}${displayBody.slice(span.end)}`
    const delta = REDACTED_LABEL.length - oldLen
    for (const mention of mentions) {
      if (mention.start === target.start && mention.end === target.end && mention.ref === target.ref) {
        mention.start = span.start
        mention.display = REDACTED_LABEL
        mention.end = span.start + REDACTED_LABEL.length
        continue
      }
      if (mention.start >= span.end) {
        mention.start += delta
        mention.end += delta
      }
    }
  }

  return { ...document, displayBody, mentions }
}
