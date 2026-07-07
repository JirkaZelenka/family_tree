import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { getLineages } from '@/lib/graph/queries'
import { getPersonAffiliatedLineages } from '@/lib/vault/lineage-colors'

export interface ForceVisibilityOptions {
  expandedLineages: Set<string>
  timeVisible: (id: string) => boolean
}

export interface ForceVisibilityResult {
  visibleIds: Set<string>
  boundaryIds: Set<string>
}

/** Osoba „přišla z jiného rodu“ – příjmení neodpovídá poli lineage. */
export function isCrossLineagePerson(
  attrs: PersonNode,
  allLineages?: Iterable<string>,
): boolean {
  const lineages = allLineages ?? [attrs.lineage]
  return getPersonAffiliatedLineages(attrs, lineages).length > 1
}

export function computeForceVisibility(
  graph: Graph<PersonNode>,
  options: ForceVisibilityOptions,
): ForceVisibilityResult {
  const { expandedLineages, timeVisible } = options
  const visibleIds = new Set<string>()
  const boundaryIds = new Set<string>()
  const allLineages = getLineages(graph)

  graph.forEachNode((id, attrs) => {
    if (!timeVisible(id)) return

    const affiliations = getPersonAffiliatedLineages(attrs, allLineages)
    const hasExpandedAffiliation = affiliations.some((l) => expandedLineages.has(l))
    if (!hasExpandedAffiliation) return

    visibleIds.add(id)

    if (!expandedLineages.has(attrs.lineage)) {
      boundaryIds.add(id)
    }
  })

  return { visibleIds, boundaryIds }
}
