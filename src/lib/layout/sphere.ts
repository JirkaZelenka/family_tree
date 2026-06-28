import Graph from 'graphology'
import type { PersonNode, GraphEdgeAttributes } from '@/types/person'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
} from 'd3-force'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { radiusFromBirthYear } from '@/lib/time/dates'
import type { ViewLayout } from '@/types/vault'

export interface SpherePosition {
  x: number
  y: number
  z: number
  theta: number
  phi: number
  radius: number
}

function sphericalToCartesian(
  theta: number,
  phi: number,
  radius: number,
): { x: number; y: number; z: number } {
  const sinPhi = Math.sin(phi)
  return {
    x: radius * sinPhi * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * sinPhi * Math.sin(theta),
  }
}

function cartesianToSpherical(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y + z * z) || 1
  const phi = Math.acos(Math.max(-1, Math.min(1, y / r)))
  const theta = Math.atan2(z, x)
  return { theta, phi, radius: r }
}

function fibonacciSphere(index: number, total: number): { theta: number; phi: number } {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const phi = Math.acos(1 - (2 * (index + 0.5)) / total)
  const theta = golden * index
  return { theta, phi }
}

export function computeSphereLayout(
  graph: Graph<PersonNode, GraphEdgeAttributes>,
  savedLayout: ViewLayout | undefined,
  minYear: number,
  maxYear: number,
  iterations = 80,
): Map<string, SpherePosition> {
  const nodes = graph.nodes()
  const positions = new Map<string, SpherePosition>()
  const lineageOffsets = savedLayout?.lineageOffsets ?? {}

  // Initial positions on sphere
  const simNodes = nodes.map((id, i) => {
    const attrs = graph.getNodeAttributes(id)
    const saved = savedLayout?.nodes[id]
    const radius = saved?.radius ?? radiusFromBirthYear(attrs.birthYear, minYear, maxYear)
    const offset = lineageOffsets[attrs.lineage] ?? { theta: 0, phi: 0 }
    let theta: number
    let phi: number
    if (saved) {
      theta = saved.theta + offset.theta
      phi = saved.phi + offset.phi
    } else {
      const fib = fibonacciSphere(i, nodes.length)
      theta = fib.theta + offset.theta
      phi = fib.phi + offset.phi
    }
    const { x, y, z } = sphericalToCartesian(theta, phi, 1)
    return { id, x, y, z, radius, pinned: saved?.pinned ?? false, lineage: attrs.lineage }
  })

  const nodeById = new Map(simNodes.map((n) => [n.id, n]))

  const links = graph
    .edges()
    .map((edgeKey) => {
      const [s, t] = graph.extremities(edgeKey)
      const type = graph.getEdgeAttributes(edgeKey).type
      const strength =
        type === 'parent-child' ? 0.8 : type === 'spouse' ? 0.6 : type === 'same-lineage' ? 0.15 : 0.1
      return { source: s, target: t, strength }
    })
    .filter((l) => nodeById.has(l.source as string) && nodeById.has(l.target as string))

  const simulation = forceSimulation(simNodes as unknown as { x: number; y: number }[])
    .force(
      'link',
      forceLink(links)
        .id((d) => (d as { id: string }).id)
        .strength((l) => (l as { strength: number }).strength)
        .distance(0.25),
    )
    .force('charge', forceManyBody().strength(-0.35))
    .force('collide', forceCollide(0.08))
    .stop()

  for (let i = 0; i < iterations; i++) {
    simulation.tick()
    for (const n of simNodes) {
      if (n.pinned) continue
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1
      n.x /= len
      n.y /= len
      n.z /= len
    }
  }

  // ForceAtlas2 refinement on graphology copy for clustering
  try {
    const g2 = graph.copy() as Graph<PersonNode & { x?: number; y?: number }>
    simNodes.forEach((n) => {
      if (g2.hasNode(n.id)) {
        g2.mergeNodeAttributes(n.id, { x: n.x, y: n.y })
      }
    })
    forceAtlas2.assign(g2, {
      iterations: 30,
      settings: { gravity: 0.5, scalingRatio: 8, strongGravityMode: true },
    })
    g2.forEachNode((id, attrs) => {
      const n = nodeById.get(id)
      if (!n || n.pinned) return
      const ax = attrs.x ?? n.x
      const ay = attrs.y ?? n.y
      const az = n.z
      const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1
      n.x = ax / len
      n.y = ay / len
      n.z = az / len
    })
  } catch {
    // ForceAtlas2 optional
  }

  for (const n of simNodes) {
    const { theta, phi } = cartesianToSpherical(n.x, n.y, n.z)
  const { x, y, z } = sphericalToCartesian(theta, phi, n.radius)
    positions.set(n.id, { x, y, z, theta, phi, radius: n.radius })
  }

  return positions
}

export function applyLineageOffset(
  positions: Map<string, SpherePosition>,
  graph: Graph<PersonNode>,
  lineage: string,
  deltaTheta: number,
  deltaPhi: number,
): Map<string, SpherePosition> {
  const next = new Map(positions)
  graph.forEachNode((id, attrs) => {
    if (attrs.lineage !== lineage) return
    const pos = next.get(id)
    if (!pos) return
    const theta = pos.theta + deltaTheta
    const phi = Math.max(0.05, Math.min(Math.PI - 0.05, pos.phi + deltaPhi))
    const { x, y, z } = sphericalToCartesian(theta, phi, pos.radius)
    next.set(id, { x, y, z, theta, phi, radius: pos.radius })
  })
  return next
}

export function computeHeatmapBins(
  positions: Map<string, SpherePosition>,
  binsTheta = 36,
  binsPhi = 18,
): number[][] {
  const grid = Array.from({ length: binsPhi }, () =>
    Array.from({ length: binsTheta }, () => 0),
  )
  for (const pos of positions.values()) {
    const ti = Math.floor(((pos.theta + Math.PI) / (2 * Math.PI)) * binsTheta) % binsTheta
    const pi = Math.floor((pos.phi / Math.PI) * binsPhi)
    const row = Math.max(0, Math.min(binsPhi - 1, pi))
    grid[row][ti]++
  }
  return grid
}

export { cartesianToSpherical, sphericalToCartesian }
