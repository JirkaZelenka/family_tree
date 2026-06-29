import { create } from 'zustand'
import type {
  SpherePosition,
  LineagePlane,
  SphereLayoutResult,
} from '@/lib/layout/sphere'
import type { ViewLayout } from '@/types/vault'

interface LayoutState {
  positions: Map<string, SpherePosition>
  savedLayout: ViewLayout
  simulationRunning: boolean
  draggingLineage: string | null
  mergePointIds: Set<string>
  lineagePlanes: Map<string, LineagePlane>
  bandCount: number
  shellRadii: number[]
  focusedLineage: string | null
  setSphereLayout: (result: SphereLayoutResult) => void
  updateNodePosition: (id: string, pos: SpherePosition, pinned?: boolean) => void
  setSavedLayout: (layout: ViewLayout) => void
  setSimulationRunning: (running: boolean) => void
  setDraggingLineage: (lineage: string | null) => void
  setFocusedLineage: (lineage: string | null) => void
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  positions: new Map(),
  savedLayout: { nodes: {}, lineageOffsets: {} },
  simulationRunning: false,
  draggingLineage: null,
  mergePointIds: new Set(),
  lineagePlanes: new Map(),
  bandCount: 1,
  shellRadii: [],
  focusedLineage: null,
  setSphereLayout: (result) =>
    set({
      positions: result.positions,
      mergePointIds: result.mergePointIds,
      lineagePlanes: result.lineagePlanes,
      bandCount: result.bandCount,
      shellRadii: result.shellRadii,
    }),
  updateNodePosition: (id, pos, pinned = true) => {
    const positions = new Map(get().positions)
    positions.set(id, pos)
    const savedLayout = { ...get().savedLayout }
    savedLayout.nodes = {
      ...savedLayout.nodes,
      [id]: { theta: pos.theta, phi: pos.phi, radius: pos.radius, pinned },
    }
    set({ positions, savedLayout })
  },
  setSavedLayout: (layout) => set({ savedLayout: layout }),
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  setDraggingLineage: (lineage) => set({ draggingLineage: lineage }),
  setFocusedLineage: (lineage) => set({ focusedLineage: lineage }),
}))
