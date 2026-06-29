import { Component, useEffect, useRef, Suspense, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useGraphStore } from '@/stores/graph-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import {
  computeSphereLayout,
  getLineageFocus,
  SPHERE_OUTER_RADIUS,
  SPHERE_CORE_RADIUS,
  bandShellRadii,
  shadeLineageColor,
  type SpherePosition,
} from '@/lib/layout/sphere'
import { getYearRange } from '@/lib/time/dates'
import { buildTreeEdges, styleForTreeEdge } from '@/lib/layout/sphere-edges'
import type { ViewProps } from '../types'

class SphereErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-400">
          Chyba vykreslení sféry: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

function circleRingPoints(radius: number, segments = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0))
  }
  return pts
}

/** Pásma v rovině kamery – při otáčení zůstanou soustředné kruhy kolem středu. */
function CameraFixedBands({ shellRadii }: { shellRadii: number[] }) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const radii = shellRadii.length > 0 ? shellRadii : bandShellRadii(1, SPHERE_CORE_RADIUS, SPHERE_OUTER_RADIUS)

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[SPHERE_CORE_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color="#eab308"
          emissive="#ca8a04"
          emissiveIntensity={0.12}
          roughness={0.45}
        />
      </mesh>
      {radii.slice(1).map((r, i) => (
        <Line
          key={i}
          points={circleRingPoints(r)}
          color={i % 2 === 0 ? '#64748b' : '#475569'}
          lineWidth={0.6}
          transparent
          opacity={0.22}
        />
      ))}
    </group>
  )
}

function LineageCameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const focusedLineage = useLayoutStore((s) => s.focusedLineage)
  const lineagePlanes = useLayoutStore((s) => s.lineagePlanes)
  const positions = useLayoutStore((s) => s.positions)
  const { camera } = useThree()
  const animRef = useRef<{
    eye: THREE.Vector3
    target: THREE.Vector3
    up: THREE.Vector3
    active: boolean
  } | null>(null)

  useEffect(() => {
    if (!focusedLineage) {
      animRef.current = {
        eye: new THREE.Vector3(0, 0, 2.6),
        target: new THREE.Vector3(0, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        active: true,
      }
      return
    }
    const plane = lineagePlanes.get(focusedLineage)
    if (!plane) return
    const { eye, target, up } = getLineageFocus(positions, plane)
    animRef.current = {
      eye: new THREE.Vector3(...eye),
      target: new THREE.Vector3(...target),
      up: new THREE.Vector3(...up),
      active: true,
    }
  }, [focusedLineage, lineagePlanes, positions])

  useFrame(() => {
    const anim = animRef.current
    const controls = controlsRef.current
    if (!anim?.active || !controls) return

    camera.position.lerp(anim.eye, 0.1)
    camera.up.lerp(anim.up, 0.1)
    controls.target.lerp(anim.target, 0.1)
    controls.update()

    if (
      camera.position.distanceTo(anim.eye) < 0.015 &&
      controls.target.distanceTo(anim.target) < 0.015 &&
      camera.up.distanceTo(anim.up) < 0.015
    ) {
      anim.active = false
    }
  })

  return null
}

function PersonNodeMesh({
  id,
  position,
  color,
  selected,
  emphasized,
  isBridgeWoman,
  onSelect,
  onHover,
}: {
  id: string
  position: SpherePosition
  color: string
  selected: boolean
  emphasized: boolean
  isBridgeWoman: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <group position={[position.x, position.y, position.z]}>
      {isBridgeWoman && (
        <mesh>
          <ringGeometry args={[0.044, 0.062, 24]} />
          <meshBasicMaterial color="#ea580c" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(id)
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.034, 14, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.55 : emphasized ? 0.28 : 0.12}
          transparent
          opacity={emphasized ? 1 : 0.6}
        />
      </mesh>
    </group>
  )
}

function GraphScene() {
  const graph = useGraphStore((s) => s.graph)
  const persons = useGraphStore((s) => s.persons)
  const selectedId = useGraphStore((s) => s.selectedId)
  const highlightedIds = useGraphStore((s) => s.highlightedIds)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setHoveredId = useGraphStore((s) => s.setHoveredId)

  const positions = useLayoutStore((s) => s.positions)
  const lineagePlanes = useLayoutStore((s) => s.lineagePlanes)
  const setSphereLayout = useLayoutStore((s) => s.setSphereLayout)
  const savedLayout = useLayoutStore((s) => s.savedLayout)
  const mergePointIds = useLayoutStore((s) => s.mergePointIds)
  const shellRadii = useLayoutStore((s) => s.shellRadii)

  const vault = useVaultStore((s) => s.vault)
  const isAliveAtYear = useTimeStore((s) => s.isPersonVisible)
  const sphereHighlightByYear = useTimeStore((s) => s.sphereHighlightByYear)
  const setSphereHighlightByYear = useTimeStore((s) => s.setSphereHighlightByYear)

  const controlsRef = useRef<OrbitControlsImpl>(null)
  const lineageColors = vault?.config.lineageColors ?? {}

  useEffect(() => {
    if (!graph) return
    try {
      const birthYears = [...persons.values()].map((p) => p.birthYear)
      const deathYears = [...persons.values()].map((p) => p.deathYear)
      const { min, max } = getYearRange(birthYears, deathYears)
      const layout = computeSphereLayout(graph, savedLayout, min, max)
      setSphereLayout(layout)
    } catch (e) {
      console.error('Chyba výpočtu layoutu sféry', e)
    }
  }, [graph, persons, savedLayout, setSphereLayout])

  if (!graph) return null

  const segments = buildTreeEdges(graph, positions, lineagePlanes)

  const edges: Array<{
    points: THREE.Vector3[]
    crossLineage: boolean
    active: boolean
    treeKind?: 'spouse' | 'descent' | 'branch'
  }> = segments.map((seg) => ({
    points: seg.points,
    crossLineage: false,
    active: true,
    treeKind: seg.kind,
  }))

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[8, 6, 8]} intensity={1.1} />
      <pointLight position={[-6, -4, -5]} intensity={0.35} />

      <group
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          setSphereHighlightByYear(false)
        }}
      >
        <CameraFixedBands shellRadii={shellRadii} />
      </group>

      {edges.map(({ points, crossLineage, active, treeKind }, i) => {
        const styled = treeKind
          ? styleForTreeEdge(treeKind, active)
          : crossLineage
            ? { color: '#a8a29e', lineWidth: active ? 1.2 : 0.7, opacity: active ? 0.5 : 0.22 }
            : { color: '#64748b', lineWidth: active ? 1.1 : 0.5, opacity: active ? 0.55 : 0.12 }
        return (
          <Line
            key={i}
            points={points}
            color={styled.color}
            lineWidth={styled.lineWidth}
            transparent
            opacity={styled.opacity}
          />
        )
      })}

      {[...persons.entries()].map(([id, person]) => {
        const pos = positions.get(id)
        if (!pos) return null

        const aliveAtYear = isAliveAtYear(person.birthYear, person.deathYear)
        const emphasized = !sphereHighlightByYear || aliveAtYear
        const baseColor = lineageColors[person.lineage] ?? '#94a3b8'
        const color = shadeLineageColor(baseColor, pos.bandIndex)
        const isBridgeWoman = mergePointIds.has(id)
        const selected = id === selectedId || highlightedIds.has(id)

        return (
          <PersonNodeMesh
            key={id}
            id={id}
            position={pos}
            color={color}
            selected={selected}
            emphasized={emphasized}
            isBridgeWoman={isBridgeWoman}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        )
      })}

      <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate />
      <LineageCameraController controlsRef={controlsRef} />
    </>
  )
}

export function SphereView({ className }: ViewProps) {
  return (
    <div className={className ?? 'h-full w-full bg-slate-950'}>
      <SphereErrorBoundary>
        <Canvas camera={{ position: [0, 0, 2.6], fov: 50 }}>
          <Suspense fallback={null}>
            <GraphScene />
          </Suspense>
        </Canvas>
      </SphereErrorBoundary>
    </div>
  )
}
