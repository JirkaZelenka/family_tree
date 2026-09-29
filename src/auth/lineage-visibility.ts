import { normalizeLineageKey } from '@/lib/vault/lineage-names'
import type { PersonRecord } from '@/types/person'
import type { TextDocument, TextMention } from '@/types/text'
import type { AuthUser } from '@/auth/roles'

export const REDACTED_LABEL = 'X'

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
  return access.allowed.has(normalizeLineageKey(lineage))
}

function emptyLifeEvent() {
  return { date: '', place: '' }
}

function visibleLineageForStub(
  record: PersonRecord,
  byId: Map<string, PersonRecord>,
  visibleIds: Set<string>,
): string {
  for (const parentId of record.frontmatter.parents) {
    if (visibleIds.has(parentId)) return byId.get(parentId)?.frontmatter.lineage ?? ''
  }
  for (const spouse of record.frontmatter.spouses) {
    if (visibleIds.has(spouse.id)) return byId.get(spouse.id)?.frontmatter.lineage ?? ''
  }
  for (const other of byId.values()) {
    if (!visibleIds.has(other.frontmatter.id)) continue
    if (other.frontmatter.parents.includes(record.frontmatter.id)) {
      return other.frontmatter.lineage
    }
    if (other.frontmatter.spouses.some((spouse) => spouse.id === record.frontmatter.id)) {
      return other.frontmatter.lineage
    }
    if (other.frontmatter.parents.some((parentId) => record.frontmatter.parents.includes(parentId))) {
      return other.frontmatter.lineage
    }
  }
  return ''
}

function redactFrontmatter(
  record: PersonRecord,
  keepIds: Set<string>,
  displayLineage: string,
): PersonRecord {
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
      lineage: displayLineage,
      birth: emptyLifeEvent(),
      death: emptyLifeEvent(),
      parents: fm.parents.filter((id) => keepIds.has(id)),
      spouses: fm.spouses
        .filter((spouse) => keepIds.has(spouse.id))
        .map((spouse) => ({ id: spouse.id, marriageDate: spouse.marriageDate })),
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

/** Osoby z nepovolených rodů pryč; příbuzní viditelných osob zůstanou jako X. */
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

  const referencedHidden = new Set<string>()
  const addIfHidden = (id: string | undefined) => {
    if (!id || visibleIds.has(id) || !byId.has(id)) return
    referencedHidden.add(id)
  }

  for (const id of visibleIds) {
    const record = byId.get(id)
    if (!record) continue
    for (const parentId of record.frontmatter.parents) addIfHidden(parentId)
    for (const spouse of record.frontmatter.spouses) addIfHidden(spouse.id)
  }

  for (const record of records) {
    const id = record.frontmatter.id
    if (visibleIds.has(id)) continue
    if (record.frontmatter.parents.some((parentId) => visibleIds.has(parentId))) {
      referencedHidden.add(id)
    }
    for (const parentId of record.frontmatter.parents) {
      if (!parentId) continue
      const parent = byId.get(parentId)
      if (!parent) continue
      const siblingsVisible = records.some(
        (other) =>
          visibleIds.has(other.frontmatter.id) &&
          other.frontmatter.parents.includes(parentId),
      )
      if (siblingsVisible) referencedHidden.add(id)
    }
  }

  const keepIds = new Set([...visibleIds, ...referencedHidden])
  return records
    .filter((record) => keepIds.has(record.frontmatter.id))
    .map((record) =>
      visibleIds.has(record.frontmatter.id)
        ? pruneMissingRefs(record, keepIds)
        : redactFrontmatter(
            record,
            keepIds,
            visibleLineageForStub(record, byId, visibleIds),
          ),
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
  const hiddenStarts = new Set(hidden.map((mention) => `${mention.start}:${mention.end}:${mention.ref}`))

  const targets = mentions
    .filter((mention) => hiddenStarts.has(`${mention.start}:${mention.end}:${mention.ref}`))
    .sort((a, b) => b.start - a.start)

  for (const target of targets) {
    const oldLen = target.end - target.start
    displayBody = `${displayBody.slice(0, target.start)}${REDACTED_LABEL}${displayBody.slice(target.end)}`
    const delta = REDACTED_LABEL.length - oldLen
    for (const mention of mentions) {
      if (mention.start === target.start && mention.end === target.end && mention.ref === target.ref) {
        mention.display = REDACTED_LABEL
        mention.end = mention.start + REDACTED_LABEL.length
        continue
      }
      if (mention.start >= target.end) {
        mention.start += delta
        mention.end += delta
      }
    }
  }

  return { ...document, displayBody, mentions }
}
