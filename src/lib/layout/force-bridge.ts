import type Graph from 'graphology'
import type { PersonNode } from '@/types/person'

/** Osoby propojující dva různé rody (manželství, rodičovství, potomci). */
export function findLineageBridgePeople(graph: Graph<PersonNode>): Set<string> {
  const bridges = new Set<string>()
  graph.forEachNode((id, attrs) => {
    const crossSpouse = attrs.spouses.some((sid) => {
      if (!sid || !graph.hasNode(sid)) return false
      return graph.getNodeAttributes(sid).lineage !== attrs.lineage
    })
    const crossParent = attrs.parents.some((pid) => {
      if (!pid || !graph.hasNode(pid)) return false
      return graph.getNodeAttributes(pid).lineage !== attrs.lineage
    })
    const crossChild = attrs.children.some((cid) => {
      if (!cid || !graph.hasNode(cid)) return false
      return graph.getNodeAttributes(cid).lineage !== attrs.lineage
    })
    if (crossSpouse || crossParent || crossChild) bridges.add(id)
  })
  return bridges
}

export function getFamilyNeighbours(graph: Graph<PersonNode>, id: string): string[] {
  const attrs = graph.getNodeAttributes(id)
  const neighbours = new Set<string>()
  for (const pid of attrs.parents) {
    if (pid && graph.hasNode(pid)) neighbours.add(pid)
  }
  for (const cid of attrs.children) {
    if (cid && graph.hasNode(cid)) neighbours.add(cid)
  }
  for (const sid of attrs.spouses) {
    if (sid && graph.hasNode(sid)) neighbours.add(sid)
  }
  return [...neighbours]
}
