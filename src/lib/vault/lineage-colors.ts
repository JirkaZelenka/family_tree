import { DEFAULT_LINEAGE_COLORS } from '@/types/vault'

/** Jednočlenné rody (typicky manžel/ka bez vlastní větve). */
export const SMALL_LINEAGE_COLOR = '#fde68a'

const PALETTE = [
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
]

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

/** Počet osob v každém rodu. */
export function countLineageMembers(lineages: Iterable<string>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const lineage of lineages) {
    counts[lineage] = (counts[lineage] ?? 0) + 1
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
      if (memberCounts[lineage] === 1) {
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
