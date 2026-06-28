import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGraphStore } from '@/stores/graph-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import { computeSphereLayout, computeHeatmapBins } from '@/lib/layout/sphere'
import { getYearRange } from '@/lib/time/dates'
import type { ViewProps } from '../types'
import type { SpherePosition } from '@/lib/layout/sphere'

function HeatmapSphere({ bins }: { bins: number[][] }) {
  const max = Math.max(1, ...bins.flat())
  return (
    <mesh>
      <sphereGeometry args={[1.02, 64, 32]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.06} wireframe />
      {bins.map((row, pi) =>
        row.map((count, ti) => {
          if (count === 0) return null
          const theta = ((ti / row.length) * 2 - 1) * Math.PI
          const phi = (pi / bins.length) * Math.PI
          const r = 1.03
          const x = r * Math.sin(phi) * Math.cos(theta)
          const y = r * Math.cos(phi)
          const z = r * Math.sin(phi) * Math.sin(theta)
          const opacity = (count / max) * 0.5
          return (
            <mesh key={`${pi}-${ti}`} position={[x, y, z]}>
              <sphereGeometry args={[0.03 + count * 0.005, 8, 8]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={opacity} />
            </mesh>
          )
        }),
      )}
    </mesh>
  )
}

function PersonNodeMesh({
  id,
  position,
  color,
  label,
  selected,
  visible,
  onSelect,
  onHover,
}: {
  id: string
  position: SpherePosition
  color: string
  label: string
  selected: boolean
  visible: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [dragging, setDragging] = useState(false)
  const { camera, gl } = useThree()
  const updateNodePosition = useLayoutStore((s) => s.updateNodePosition)

  useFrame(() => {
    if (!meshRef.current || !visible) return
    const scale = selected ? 1.4 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setDragging(true)
  }

  const handlePointerUp = () => setDragging(false)

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !meshRef.current) return
    const ev = e.nativeEvent
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndc, camera)
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), position.radius)
    const target = new THREE.Vector3()
    if (!raycaster.ray.intersectSphere(sphere, target)) return
    const len = target.length()
    const phi = Math.acos(target.y / len)
    const theta = Math.atan2(target.z, target.x)
    const pos = { ...position, x: target.x, y: target.y, z: target.z, theta, phi }
    updateNodePosition(id, pos, true)
    meshRef.current.position.set(target.x, target.y, target.z)
  }

  if (!visible) return null

  return (
    <group position={[position.x, position.y, position.z]}>
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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? color : '#000000'}
          emissiveIntensity={selected ? 0.6 : 0}
        />
      </mesh>
      {(selected || dragging) && (
        <Html distanceFactor={8} center>
          <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap">
            {label}
          </span>
        </Html>
      )}
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
  const setPositions = useLayoutStore((s) => s.setPositions)
  const savedLayout = useLayoutStore((s) => s.savedLayout)
  const showHeatmap = useLayoutStore((s) => s.showHeatmap)
  const vault = useVaultStore((s) => s.vault)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)

  const lineageColors = vault?.config.lineageColors ?? {}

  useEffect(() => {
    if (!graph) return
    const birthYears = [...persons.values()].map((p) => p.birthYear)
    const deathYears = [...persons.values()].map((p) => p.deathYear)
    const { min, max } = getYearRange(birthYears, deathYears)
    const layout = computeSphereLayout(graph, savedLayout, min, max)
    setPositions(layout)
  }, [graph, persons, savedLayout, setPositions])

  const heatmapBins = useMemo(
    () => (showHeatmap ? computeHeatmapBins(positions) : []),
    [showHeatmap, positions],
  )

  if (!graph) return null

  const edges: Array<[THREE.Vector3, THREE.Vector3, string]> = []
  graph.forEachEdge((_, attrs, source, target) => {
    if (attrs.type !== 'parent-child' && attrs.type !== 'spouse') return
    const sp = positions.get(source)
    const tp = positions.get(target)
    if (!sp || !tp) return
    const sn = persons.get(source)
    const tn = persons.get(target)
    if (!sn || !tn) return
    if (!isPersonVisible(sn.birthYear, sn.deathYear)) return
    if (!isPersonVisible(tn.birthYear, tn.deathYear)) return
    edges.push([
      new THREE.Vector3(sp.x, sp.y, sp.z),
      new THREE.Vector3(tp.x, tp.y, tp.z),
      attrs.type,
    ])
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#1e293b" emissive="#0f172a" emissiveIntensity={0.3} />
      </mesh>
      {showHeatmap && heatmapBins.length > 0 && <HeatmapSphere bins={heatmapBins} />}
      {edges.map(([a, b, type], i) => (
        <Line
          key={i}
          points={[a, b]}
          color={type === 'spouse' ? '#f472b6' : '#64748b'}
          lineWidth={1}
          transparent
          opacity={0.5}
        />
      ))}
      {[...persons.entries()].map(([id, person]) => {
        const pos = positions.get(id)
        if (!pos) return null
        const visible = isPersonVisible(person.birthYear, person.deathYear)
        const color = lineageColors[person.lineage] ?? '#94a3b8'
        const selected = id === selectedId || highlightedIds.has(id)
        return (
          <PersonNodeMesh
            key={id}
            id={id}
            position={pos}
            color={color}
            label={`${person.fullName} (${person.birthYear ?? '?'})`}
            selected={selected}
            visible={visible}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        )
      })}
      <OrbitControls enablePan enableZoom enableRotate />
    </>
  )
}

export function SphereView({ className }: ViewProps) {
  return (
    <div className={className ?? 'h-full w-full bg-black'}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
        <Suspense fallback={null}>
          <GraphScene />
        </Suspense>
      </Canvas>
    </div>
  )
}
