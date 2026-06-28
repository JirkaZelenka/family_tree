import { create } from 'zustand'
import type { SpherePosition } from '@/lib/layout/sphere'
import type { ViewLayout } from '@/types/vault'

interface LayoutState {
  positions: Map<string, SpherePosition>
  savedLayout: ViewLayout
  simulationRunning: boolean
  showHeatmap: boolean
  draggingLineage: string | null
  setPositions: (positions: Map<string, SpherePosition>) => void
  updateNodePosition: (id: string, pos: SpherePosition, pinned?: boolean) => void
  setSavedLayout: (layout: ViewLayout) => void
  setSimulationRunning: (running: boolean) => void
  setShowHeatmap: (show: boolean) => void
  setDraggingLineage: (lineage: string | null) => void
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  positions: new Map(),
  savedLayout: { nodes: {}, lineageOffsets: {} },
  simulationRunning: false,
  showHeatmap: false,
  draggingLineage: null,
  setPositions: (positions) => set({ positions }),
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
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  setDraggingLineage: (lineage) => set({ draggingLineage: lineage }),
}))
