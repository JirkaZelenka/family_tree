import Graph from 'graphology'
import type { PersonNode, GraphEdgeAttributes } from '@/types/person'
import type { ViewLayout } from '@/types/vault'
import {
  getBirthBandIndex,
  radiusForBirthYear,
  yearBandShellRadii,
} from '@/lib/layout/sphere-bands'
import {
  layoutLineagePedigree,
  resolvePlacementLineage,
  type TreeUV,
} from '@/lib/layout/sphere-tree'

export const SPHERE_OUTER_RADIUS = 1
export const SPHERE_CORE_RADIUS = 0.14

export interface SpherePosition {
  x: number
  y: number
  z: number
  theta: number
  phi: number
  radius: number
  /** Poloměr řádku generace – stejný pro sourozence / manžele (ortogonální hrábě). */
  treeRadius: number
  layoutU: number
  layoutV: number
  /** Rovina, na které je osoba vykreslena (může být jiný rod než lineage). */
  displayPlane: string
  bandIndex: number
  lineage: string
  isMergePoint: boolean
}

export interface LineagePlane {
  lineage: string
  /** Jednotkový vektor – směr pohledu na 2D strom rodu */
  normal: [number, number, number]
  tangentU: [number, number, number]
  tangentV: [number, number, number]
  anchorTheta: number
  anchorPhi: number
}

export interface SphereLayoutResult {
  positions: Map<string, SpherePosition>
  mergePointIds: Set<string>
  lineagePlanes: Map<string, LineagePlane>
  bandCount: number
  shellRadii: number[]
  yearMin: number
  yearMax: number
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

function normalize3(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

function cross(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

/** Rovnoměrně rozmístěné kotvy na sféře – každý rod má jinou rovinu. */
function lineageAnchorOnSphere(
  index: number,
  total: number,
): { theta: number; phi: number } {
  if (total <= 1) {
    return { theta: 0, phi: Math.PI / 2 - 0.15 }
  }
  const golden = Math.PI * (3 - Math.sqrt(5))
  const theta = golden * index
  const y = 1 - (2 * (index + 0.5)) / total
  const phi = Math.acos(Math.max(-1, Math.min(1, y)))
  return { theta, phi }
}

function buildLineagePlane(lineage: string, index: number, total: number): LineagePlane {
  const { theta: anchorTheta, phi: anchorPhi } = lineageAnchorOnSphere(index, total)
  const anchor = sphericalToCartesian(anchorTheta, anchorPhi, 1)
  const normal = normalize3([anchor.x, anchor.y, anchor.z])
  const worldUp: [number, number, number] = [0, 1, 0]
  let tangentU = cross(worldUp, normal)
  if (Math.hypot(tangentU[0], tangentU[1], tangentU[2]) < 0.01) {
    tangentU = cross([1, 0, 0], normal)
  }
  tangentU = normalize3(tangentU)
  // +v = mladší generace dolů; při pohledu shora −tangentV = nejstarší nahoře
  const tangentV = normalize3(cross(normal, tangentU))
  return {
    lineage,
    normal,
    tangentU,
    tangentV,
    anchorTheta,
    anchorPhi,
  }
}

function findLineageBridgeWomen(
  graph: Graph<PersonNode, GraphEdgeAttributes>,
): Set<string> {
  const bridges = new Set<string>()
  graph.forEachNode((id, attrs) => {
    if (attrs.gender !== 'female') return

    const crossSpouse = attrs.spouses.some((sid) => {
      if (!sid || !graph.hasNode(sid)) return false
      return graph.getNodeAttributes(sid).lineage !== attrs.lineage
    })

    const crossBirth = attrs.parents.some((pid) => {
      if (!pid || !graph.hasNode(pid)) return false
      return graph.getNodeAttributes(pid).lineage !== attrs.lineage
    })

    if (crossSpouse || crossBirth) bridges.add(id)
  })
  return bridges
}

function uOnSphere(
  u: number,
  radius: number,
  plane: LineagePlane,
): { x: number; y: number; z: number } {
  const anchor = sphericalToCartesian(plane.anchorTheta, plane.anchorPhi, 1)
  let x = anchor.x + plane.tangentU[0] * u
  let y = anchor.y + plane.tangentU[1] * u
  let z = anchor.z + plane.tangentU[2] * u
  const len = Math.sqrt(x * x + y * y + z * z) || 1
  const scale = radius / len
  return { x: x * scale, y: y * scale, z: z * scale }
}

/** Bod stromu v rovině rodu (u = vodorovně, radius = rok narození / vzdálenost od středu). */
export function layoutPointTo3D(
  u: number,
  radius: number,
  plane: LineagePlane,
): { x: number; y: number; z: number } {
  return uOnSphere(u, radius, plane)
}

function computeTreeRowRadii(
  tree2d: Map<string, TreeUV>,
  graph: Graph<PersonNode>,
  yearMin: number,
  yearMax: number,
): Map<string, number> {
  const sums = new Map<number, { total: number; count: number }>()
  for (const [id, { v }] of tree2d) {
    const y = graph.getNodeAttributes(id).birthYear
    const r = radiusForBirthYear(
      y,
      yearMin,
      yearMax,
      SPHERE_CORE_RADIUS,
      SPHERE_OUTER_RADIUS,
    )
    const slot = sums.get(v) ?? { total: 0, count: 0 }
    slot.total += r
    slot.count += 1
    sums.set(v, slot)
  }
  const avgByV = new Map<number, number>()
  for (const [v, { total, count }] of sums) {
    avgByV.set(v, total / count)
  }
  const result = new Map<string, number>()
  for (const [id, { v }] of tree2d) {
    const rowR = avgByV.get(v)
    if (rowR != null) result.set(id, rowR)
  }
  return result
}

export function computeSphereLayout(
  graph: Graph<PersonNode, GraphEdgeAttributes>,
  savedLayout: ViewLayout | undefined,
  minYear: number,
  maxYear: number,
): SphereLayoutResult {
  const positions = new Map<string, SpherePosition>()
  const mergePointIds = findLineageBridgeWomen(graph)

  const birthYears = graph
    .nodes()
    .map((id) => graph.getNodeAttributes(id).birthYear)
    .filter((y): y is number => y !== null)
  const dataMin = birthYears.length ? Math.min(...birthYears) : minYear
  const dataMax = birthYears.length ? Math.max(...birthYears) : maxYear
  const yearMin = Math.min(minYear, dataMin)
  const yearMax = Math.max(maxYear, dataMax)
  const shellRadii = yearBandShellRadii(
    yearMin,
    yearMax,
    SPHERE_CORE_RADIUS,
    SPHERE_OUTER_RADIUS,
  )
  const bandCount = shellRadii.length

  const lineages = [...new Set(graph.nodes().map((id) => graph.getNodeAttributes(id).lineage))].sort()
  const lineagePlanes = new Map<string, LineagePlane>()
  lineages.forEach((lineage, i) => {
    lineagePlanes.set(lineage, buildLineagePlane(lineage, i, lineages.length))
  })

  const treesByLineage = new Map<string, Map<string, TreeUV>>()
  const rowRadiiByLineage = new Map<string, Map<string, number>>()
  for (const lineage of lineages) {
    const tree2d = layoutLineagePedigree(graph, lineage)
    treesByLineage.set(lineage, tree2d)
    rowRadiiByLineage.set(
      lineage,
      computeTreeRowRadii(tree2d, graph, yearMin, yearMax),
    )
  }

  for (const id of graph.nodes()) {
    const attrs = graph.getNodeAttributes(id)
    const saved = savedLayout?.nodes[id]
    const placementLineage = resolvePlacementLineage(graph, id)
    const plane = lineagePlanes.get(placementLineage)
    const tree2d = treesByLineage.get(placementLineage)
    const uv = tree2d?.get(id)
    const rowRadii = rowRadiiByLineage.get(placementLineage)

    const birthRadius = radiusForBirthYear(
      attrs.birthYear,
      yearMin,
      yearMax,
      SPHERE_CORE_RADIUS,
      SPHERE_OUTER_RADIUS,
    )
    const treeRadius =
      (uv && rowRadii?.get(id)) ??
      birthRadius

    let x: number
    let y: number
    let z: number
    let theta: number
    let phi: number
    const layoutU = uv?.u ?? 0
    const layoutV = uv?.v ?? 0

    if (saved?.pinned && saved.theta != null && saved.phi != null) {
      const radius = saved.radius ?? treeRadius
      theta = saved.theta
      phi = saved.phi
      const c = sphericalToCartesian(theta, phi, radius)
      x = c.x
      y = c.y
      z = c.z
    } else if (plane && uv) {
      const c = uOnSphere(uv.u, treeRadius, plane)
      x = c.x
      y = c.y
      z = c.z
      const s = cartesianToSpherical(x, y, z)
      theta = s.theta
      phi = s.phi
    } else {
      const c = sphericalToCartesian(0, Math.PI / 2, birthRadius)
      x = c.x
      y = c.y
      z = c.z
      theta = 0
      phi = Math.PI / 2
    }

    positions.set(id, {
      x,
      y,
      z,
      theta,
      phi,
      radius: birthRadius,
      treeRadius,
      layoutU,
      layoutV,
      displayPlane: placementLineage,
      bandIndex: getBirthBandIndex(attrs.birthYear),
      lineage: attrs.lineage,
      isMergePoint: mergePointIds.has(id),
    })
  }

  return {
    positions,
    mergePointIds,
    lineagePlanes,
    bandCount,
    shellRadii,
    yearMin,
    yearMax,
  }
}

export function getLineageFocus(
  positions: Map<string, SpherePosition>,
  plane: LineagePlane,
): {
  eye: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
} {
  const pts = [...positions.values()].filter((p) => p.displayPlane === plane.lineage)
  if (pts.length === 0) {
    return { eye: [0, 0, 2.6], target: [0, 0, 0], up: [0, 1, 0] }
  }

  let youngest = pts[0]
  let oldest = pts[0]
  for (const p of pts) {
    if (p.treeRadius < youngest.treeRadius) youngest = p
    if (p.treeRadius > oldest.treeRadius) oldest = p
  }

  const dist = 2.4
  const [nx, ny, nz] = plane.normal

  // Kolmo na rovinu rodu, pohled do středu sféry (jádro dole)
  const eye: [number, number, number] = [nx * dist, ny * dist, nz * dist]
  const target: [number, number, number] = [0, 0, 0]

  // Nahoru = směr od nejmladší k nejstarší v rovině (ortogonalizováno vůči pohledu)
  const vdx = -nx
  const vdy = -ny
  const vdz = -nz
  let ux = oldest.x - youngest.x
  let uy = oldest.y - youngest.y
  let uz = oldest.z - youngest.z
  const parallel = ux * vdx + uy * vdy + uz * vdz
  ux -= parallel * vdx
  uy -= parallel * vdy
  uz -= parallel * vdz
  const ulen = Math.hypot(ux, uy, uz)

  const up: [number, number, number] =
    ulen > 1e-5
      ? [ux / ulen, uy / ulen, uz / ulen]
      : [-plane.tangentV[0], -plane.tangentV[1], -plane.tangentV[2]]

  return { eye, target, up }
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
    next.set(id, { ...pos, x, y, z, theta, phi })
  })
  return next
}

export { bandShellRadii, getBirthBandLabel, shadeLineageColor, yearBandShellRadii, radiusForBirthYear } from '@/lib/layout/sphere-bands'
export { sphericalToCartesian }
