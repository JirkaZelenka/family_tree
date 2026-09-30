import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { lifeSpanOverlap } from '@/lib/time/dates'
import { NO_ACCESS_LINEAGE, isNoAccessLineage } from '@/auth/lineage-visibility'

export function getContemporaries(
  graph: Graph<PersonNode>,
  personId: string,
): string[] {
  if (!graph.hasNode(personId)) return []
  const person = graph.getNodeAttributes(personId)
  const result: string[] = []
  graph.forEachNode((id, attrs) => {
    if (id === personId) return
    if (
      lifeSpanOverlap(
        person.birthYear,
        person.deathYear,
        attrs.birthYear,
        attrs.deathYear,
        person.death?.date,
        attrs.death?.date,
      )
    ) {
      result.push(id)
    }
  })
  return result
}

export function getAncestors(
  graph: Graph<PersonNode>,
  personId: string,
  maxDepth = 20,
): Set<string> {
  const ancestors = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = [{ id: personId, depth: 0 }]
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depth >= maxDepth) continue
    const node = graph.getNodeAttributes(id)
    for (const parentId of node.parents) {
      if (!graph.hasNode(parentId) || ancestors.has(parentId)) continue
      ancestors.add(parentId)
      queue.push({ id: parentId, depth: depth + 1 })
    }
  }
  return ancestors
}

export function getDescendants(
  graph: Graph<PersonNode>,
  personId: string,
  maxDepth = 20,
): Set<string> {
  const descendants = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = [{ id: personId, depth: 0 }]
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depth >= maxDepth) continue
    const node = graph.getNodeAttributes(id)
    for (const childId of node.children) {
      if (!graph.hasNode(childId) || descendants.has(childId)) continue
      descendants.add(childId)
      queue.push({ id: childId, depth: depth + 1 })
    }
  }
  return descendants
}

/** Viditelné rody + na konci syntetická skupina anonymizovaných (pokud existuje). */
export function getLineages(graph: Graph<PersonNode>): string[] {
  const lineages = new Set<string>()
  let hasNoAccess = false
  graph.forEachNode((_, attrs) => {
    if (attrs.redacted || isNoAccessLineage(attrs.lineage)) {
      hasNoAccess = true
      return
    }
    if (attrs.lineage) lineages.add(attrs.lineage)
  })
  const list = [...lineages].sort((a, b) => a.localeCompare(b, 'cs'))
  if (hasNoAccess) list.push(NO_ACCESS_LINEAGE)
  return list
}

/** Nejmladší (nejvyšší birthYear) člen rodu; při shodě preferuje novější id stabilně podle jména. */
export function youngestPersonIdInLineage(
  persons: Map<string, PersonNode>,
  lineage: string,
): string | null {
  const needle = lineage.trim()
  if (!needle) return null
  let bestId: string | null = null
  let bestYear = Number.NEGATIVE_INFINITY
  let bestName = ''
  for (const [id, person] of persons) {
    if (person.redacted || isNoAccessLineage(person.lineage)) continue
    if (person.lineage !== needle) continue
    const year = person.birthYear ?? Number.NEGATIVE_INFINITY
    const name = person.fullName ?? id
    if (
      year > bestYear ||
      (year === bestYear && (bestId == null || name.localeCompare(bestName, 'cs') < 0))
    ) {
      bestYear = year
      bestId = id
      bestName = name
    }
  }
  return bestId
}
