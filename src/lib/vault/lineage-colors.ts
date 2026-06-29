import { DEFAULT_LINEAGE_COLORS } from '@/types/vault'

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

/** Doplní barvy rodů z configu + výchozí paletu pro chybějící klíče. */
export function enrichLineageColors(
  lineages: Iterable<string>,
  fromConfig: Record<string, string>,
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
  return merged
}

export function lineageColor(
  lineage: string,
  colors: Record<string, string>,
): string {
  return colors[lineage] ?? autoColor(lineage)
}
