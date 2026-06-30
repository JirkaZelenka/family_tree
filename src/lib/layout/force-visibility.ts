import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { getFamilyNeighbours } from '@/lib/layout/force-bridge'

export interface ForceVisibilityOptions {
  expandedLineages: Set<string>
  timeVisible: (id: string) => boolean
}

export interface ForceVisibilityResult {
  visibleIds: Set<string>
  boundaryIds: Set<string>
}

function normalizeRod(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ovi$/, '')
    .replace(/ova$/, '')
    .replace(/ové$/, '')
}

/** Osoba „přišla z jiného rodu“ – jiné příjmení než rod v datech, nebo rodné příjmení. */
export function isCrossLineagePerson(attrs: PersonNode): boolean {
  if (attrs.maidenName) return true
  if (!attrs.familyName) return false
  const lineage = normalizeRod(attrs.lineage)
  const family = normalizeRod(attrs.familyName)
  if (!lineage || !family) return false
  return !lineage.includes(family) && !family.includes(lineage)
}

export function computeForceVisibility(
  graph: Graph<PersonNode>,
  options: ForceVisibilityOptions,
): ForceVisibilityResult {
  const { expandedLineages, timeVisible } = options
  const visibleIds = new Set<string>()
  const boundaryIds = new Set<string>()

  graph.forEachNode((id, attrs) => {
    if (!timeVisible(id)) return
    if (expandedLineages.has(attrs.lineage)) visibleIds.add(id)
  })

  let changed = true
  while (changed) {
    changed = false
    graph.forEachNode((id, attrs) => {
      if (!timeVisible(id)) return
      if (visibleIds.has(id)) return
      if (!isCrossLineagePerson(attrs)) return

      const lineage = attrs.lineage
      if (expandedLineages.has(lineage)) return

      const anchorsExpanded = getFamilyNeighbours(graph, id).some((nid) => {
        if (!timeVisible(nid)) return false
        const neighbour = graph.getNodeAttributes(nid)
        if (!expandedLineages.has(neighbour.lineage)) return false
        if (neighbour.lineage === lineage) return false
        return visibleIds.has(nid)
      })

      if (anchorsExpanded) {
        visibleIds.add(id)
        boundaryIds.add(id)
        changed = true
      }
    })
  }

  return { visibleIds, boundaryIds }
}
