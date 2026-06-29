import { describe, it, expect } from 'vitest'
import Graph from 'graphology'
import { computeSphereLayout } from '@/lib/layout/sphere'
import type { PersonNode } from '@/types/person'

function dot(a: [number, number, number], b: [number, number, number]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

describe('lineage planes', () => {
  it('gives each lineage a distinct plane normal', () => {
    const graph = new Graph<PersonNode>()
    const lineages = ['barton', 'spilka', 'zelenka']
    lineages.forEach((lineage, i) => {
      graph.addNode(String(i), {
        id: String(i),
        slug: lineage,
        givenName: lineage,
        gender: 'unknown',
        lineage,
        parents: [],
        spouses: [],
        children: [],
        tags: [],
        media: [],
        sources: [],
        fullName: lineage,
        birthYear: 1950 + i * 30,
        deathYear: null,
        body: '',
        filePath: '',
      })
    })

    const { lineagePlanes } = computeSphereLayout(graph, undefined, 1950, 2010)
    const normals = [...lineagePlanes.values()].map((p) => p.normal)

    expect(normals).toHaveLength(3)
    for (let i = 0; i < normals.length; i++) {
      for (let j = i + 1; j < normals.length; j++) {
        expect(Math.abs(dot(normals[i], normals[j]))).toBeLessThan(0.85)
      }
    }
  })
})
