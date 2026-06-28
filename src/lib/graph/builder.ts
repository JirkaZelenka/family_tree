import Graph from 'graphology'
import type { Attributes } from 'graphology-types'
import type { PersonNode, PersonRecord, GraphEdgeAttributes } from '@/types/person'
import { buildFullName } from '@/lib/parser/markdown'
import { parseYear } from '@/lib/time/dates'

export interface GraphDiagnostic {
  level: 'error' | 'warning'
  message: string
  personId?: string
}

export interface BuildGraphResult {
  graph: Graph<PersonNode, GraphEdgeAttributes>
  diagnostics: GraphDiagnostic[]
  persons: Map<string, PersonNode>
}

function recordToNode(record: PersonRecord): PersonNode {
  const fm = record.frontmatter
  return {
    ...fm,
    fullName: buildFullName(fm),
    birthYear: parseYear(fm.birth?.date),
    deathYear: parseYear(fm.death?.date),
    body: record.body,
    filePath: record.filePath,
  }
}

export function buildGraphFromRecords(
  records: PersonRecord[],
): BuildGraphResult {
  const graph = new Graph<PersonNode, GraphEdgeAttributes>({
    multi: false,
    type: 'undirected',
  })
  const diagnostics: GraphDiagnostic[] = []
  const persons = new Map<string, PersonNode>()
  const idsSeen = new Set<string>()

  for (const record of records) {
    const node = recordToNode(record)
    if (idsSeen.has(node.id)) {
      diagnostics.push({
        level: 'error',
        message: `Duplicitní ID: ${node.id}`,
        personId: node.id,
      })
      continue
    }
    idsSeen.add(node.id)
    persons.set(node.id, node)
    graph.addNode(node.id, node)
  }

  const addEdge = (
    source: string,
    target: string,
    attrs: GraphEdgeAttributes,
  ) => {
    if (source === target) return
    if (!graph.hasNode(source) || !graph.hasNode(target)) return
    const key = [source, target].sort().join('--')
    if (graph.hasEdge(key)) return
    graph.addEdgeWithKey(key, source, target, attrs)
  }

  for (const node of persons.values()) {
    for (const parentId of node.parents) {
      if (!persons.has(parentId)) {
        diagnostics.push({
          level: 'warning',
          message: `Neznámý rodič ${parentId} u ${node.fullName}`,
          personId: node.id,
        })
        continue
      }
      addEdge(parentId, node.id, { type: 'parent-child' })
    }
    for (const spouseId of node.spouses) {
      if (!persons.has(spouseId)) {
        diagnostics.push({
          level: 'warning',
          message: `Neznámý partner ${spouseId} u ${node.fullName}`,
          personId: node.id,
        })
        continue
      }
      addEdge(node.id, spouseId, { type: 'spouse' })
    }
  }

  // Derived siblings
  for (const node of persons.values()) {
    const siblings = new Set<string>()
    for (const parentId of node.parents) {
      graph.forEachNeighbor(parentId, (neighbor) => {
        if (neighbor !== node.id) {
          const edge = graph.edge(parentId, neighbor)
          if (edge && graph.getEdgeAttributes(edge).type === 'parent-child') {
            siblings.add(neighbor)
          }
        }
      })
    }
    for (const sib of siblings) {
      addEdge(node.id, sib, { type: 'sibling' })
    }
  }

  // Same-lineage edges for layout clustering
  const byLineage = new Map<string, string[]>()
  for (const node of persons.values()) {
    const list = byLineage.get(node.lineage) ?? []
    list.push(node.id)
    byLineage.set(node.lineage, list)
  }
  for (const ids of byLineage.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addEdge(ids[i], ids[j], { type: 'same-lineage' })
      }
    }
  }

  return { graph, diagnostics, persons }
}

export function getPersonOrThrow(
  graph: Graph<PersonNode, Attributes>,
  id: string,
): PersonNode {
  if (!graph.hasNode(id)) throw new Error(`Person ${id} not found`)
  return graph.getNodeAttributes(id) as PersonNode
}
