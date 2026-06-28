import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'
import { lifeSpanOverlap } from '@/lib/time/dates'

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

export function getLineages(graph: Graph<PersonNode>): string[] {
  const lineages = new Set<string>()
  graph.forEachNode((_, attrs) => lineages.add(attrs.lineage))
  return [...lineages].sort()
}
