import { DEFAULT_LINEAGE_COLORS } from '@/types/vault'

/** Jednočlenné rody (typicky manžel/ka bez vlastní větve). */
export const SMALL_LINEAGE_COLOR = '#fde68a'

export const LINEAGE_COLOR_PALETTE = [
  '#4ade80',
  '#38bdf8',
  '#e879f9',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
  '#facc15',
  '#f472b6',
  '#818cf8',
  '#a3e635',
  '#60a5fa',
  '#34d399',
  '#fde68a',
  '#94a3b8',
  '#f8fafc',
  '#1e293b',
] as const

const PALETTE = LINEAGE_COLOR_PALETTE

function hashLineage(lineage: string): number {
  let h = 0
  for (let i = 0; i < lineage.length; i++) {
    h = (h * 31 + lineage.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function autoColor(lineage: string): string {
  if (lineage === 'unknown') return '#94a3b8'
  return PALETTE[hashLineage(lineage) % PALETTE.length]
}

/** Počet osob v každém rodu (jen pole `lineage`). */
export function countLineageMembers(lineages: Iterable<string>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const lineage of lineages) {
    counts[lineage] = (counts[lineage] ?? 0) + 1
  }
  return counts
}

export function normalizeRodName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ovi$/, '')
    .replace(/ova$/, '')
    .replace(/ové$/, '')
}

/** Porovná příjmení a rod (např. Hynek ↔ hynkovi, Zelenka ↔ zelenkovi). */
export function rodNamesMatch(a: string, b: string): boolean {
  const left = normalizeRodName(a)
  const right = normalizeRodName(b)
  if (!left || !right) return !left && !right
  if (left === right) return true
  if (left.includes(right) || right.includes(left)) return true

  const shorter = left.length <= right.length ? left : right
  const longer = left.length > right.length ? left : right
  let prefix = 0
  while (prefix < shorter.length && shorter[prefix] === longer[prefix]) prefix++

  const minPrefix = 3
  return prefix >= minPrefix && shorter.length >= minPrefix
}

function lineageKeyMatchScore(
  familyName: string,
  key: string,
  preferredLineages?: Set<string>,
): number {
  const familyNorm = normalizeRodName(familyName)
  const keyNorm = normalizeRodName(key)
  let score = 0
  if (preferredLineages?.has(key)) score += 1000
  if (/ovi$/i.test(key.normalize('NFD').replace(/\p{M}/gu, ''))) score += 100
  if (familyNorm === keyNorm) score += 50
  score += key.length
  return score
}

/** Vybere nejlepší klíč barvy — preferuje rody ze stromu (spilkovi) před aliasy (spilka). */
export function pickBestLineageKeyForName(
  familyName: string | undefined,
  colorKeys: Iterable<string>,
  preferredLineages?: Iterable<string>,
): string | null {
  if (!familyName?.trim()) return null
  const preferred =
    preferredLineages != null ? new Set(preferredLineages) : undefined
  const matches = [...colorKeys].filter((key) => rodNamesMatch(familyName, key))
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]
  return matches.sort(
    (a, b) =>
      lineageKeyMatchScore(familyName, b, preferred) -
      lineageKeyMatchScore(familyName, a, preferred),
  )[0]
}

/** Příjmení patří k rodu (např. vdaná žena v přehledu druhého rodu). */
export function familyNameAffiliatedWithLineage(
  familyName: string | undefined,
  lineage: string,
): boolean {
  if (!familyName) return false
  return rodNamesMatch(familyName, lineage)
}

/** Příjmení odpovídá aktuálnímu příjmení v rodokmenu — jednolitá barva ve stromě. */
export function familyNameMatchesLineage(person: {
  lineage: string
  familyName?: string
}): boolean {
  if (!person.familyName) return true
  return rodNamesMatch(person.familyName, person.lineage)
}

/** Najde klíč rodu v paletě podle příjmení (např. Zelenková → zelenkovi). */
export function lineageKeyForFamilyName(
  familyName: string | undefined,
  colorKeys: Iterable<string>,
  fallback: string,
  preferredLineages?: Iterable<string>,
): string {
  if (!familyName) return fallback
  return (
    pickBestLineageKeyForName(familyName, colorKeys, preferredLineages) ??
    fallback
  )
}

export function personBelongsToLineage(
  person: { lineage: string; familyName?: string },
  lineage: string,
): boolean {
  if (person.lineage === lineage) return true
  return familyNameAffiliatedWithLineage(person.familyName, lineage)
}

/** Rody, do kterých osoba patří (pole lineage + příjmení, max. 2). */
export function getPersonAffiliatedLineages(
  person: { lineage: string; familyName?: string },
  lineages: Iterable<string>,
): string[] {
  return [...lineages].filter((l) => personBelongsToLineage(person, l))
}

/** Počty včetně osob s příslušným příjmením (vdané ženy v obou rodech). */
export function countAffiliatedLineageMembers(
  persons: Iterable<{ lineage: string; familyName?: string }>,
  lineages: Iterable<string>,
): Record<string, number> {
  const lineageList = [...lineages]
  const counts = Object.fromEntries(lineageList.map((l) => [l, 0])) as Record<string, number>
  for (const person of persons) {
    for (const lineage of lineageList) {
      if (personBelongsToLineage(person, lineage)) counts[lineage]++
    }
  }
  return counts
}

/** Doplní barvy rodů z configu + výchozí paletu pro chybějící klíče. */
export function enrichLineageColors(
  lineages: Iterable<string>,
  fromConfig: Record<string, string>,
  memberCounts?: Record<string, number>,
): Record<string, string> {
  const merged: Record<string, string> = {
    ...DEFAULT_LINEAGE_COLORS,
    ...fromConfig,
  }
  for (const lineage of lineages) {
    if (!merged[lineage]) {
      merged[lineage] = autoColor(lineage)
    }
  }
  if (memberCounts) {
    for (const lineage of lineages) {
      if (memberCounts[lineage] === 1 && !fromConfig[lineage]) {
        merged[lineage] = SMALL_LINEAGE_COLOR
      }
    }
  }
  return merged
}

export function lineageColor(
  lineage: string,
  colors: Record<string, string>,
): string {
  return colors[lineage] ?? autoColor(lineage)
}

/** Ztlumená pastelová varianta pro sbalené rody. */
export function pastelizeColor(hex: string, mix = 0.62): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const blend = (channel: number) =>
    Math.round(channel + (255 - channel) * mix)
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`
}
