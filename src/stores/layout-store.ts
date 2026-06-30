import { create } from 'zustand'
import type {
  SpherePosition,
  LineagePlane,
  SphereLayoutResult,
} from '@/lib/layout/sphere'
import type { ForceNodeLayout, ViewLayout } from '@/types/vault'
import { useVaultStore } from '@/stores/vault-store'
import { serializeLayout } from '@/lib/storage/vault-loader'
import { cacheVaultFiles } from '@/lib/storage'
import type { LayoutFile } from '@/types/vault'
import {
  FORCE_PADDING,
  FORCE_TIMELINE_WIDTH,
} from '@/lib/layout/force-layout'

const MIN_FORCE_X = FORCE_TIMELINE_WIDTH + FORCE_PADDING
const MAX_FORCE_X = 12_000

function clampForceX(x: number): number {
  if (!Number.isFinite(x)) return MIN_FORCE_X
  return Math.min(MAX_FORCE_X, Math.max(MIN_FORCE_X, x))
}

interface LayoutState {
  positions: Map<string, SpherePosition>
  savedLayout: ViewLayout
  sessionForceNodes: Record<string, ForceNodeLayout>
  forceAutoLayout: Record<string, ForceNodeLayout>
  forceSavedView: Record<string, ForceNodeLayout>
  simulationRunning: boolean
  draggingLineage: string | null
  mergePointIds: Set<string>
  lineagePlanes: Map<string, LineagePlane>
  bandCount: number
  shellRadii: number[]
  focusedLineage: string | null
  expandedLineages: Set<string>
  forceLayoutRevision: number
  setSphereLayout: (result: SphereLayoutResult) => void
  updateNodePosition: (id: string, pos: SpherePosition, pinned?: boolean) => void
  setSavedLayout: (layout: ViewLayout) => void
  setForceSavedView: (nodes: Record<string, ForceNodeLayout>) => void
  setForceAutoLayout: (nodes: Record<string, ForceNodeLayout>) => void
  ensureForceAutoBaseline: (nodes: Record<string, ForceNodeLayout>) => void
  updateForceNodeX: (id: string, x: number) => void
  updateForceNodesX: (updates: Record<string, number>) => void
  resetForceLayout: () => void
  saveForceView: () => boolean
  loadForceSavedView: () => void
  hasForceSavedView: () => boolean
  setSimulationRunning: (running: boolean) => void
  setDraggingLineage: (lineage: string | null) => void
  setFocusedLineage: (lineage: string | null) => void
  initForceLineages: (lineages: string[]) => void
  toggleLineageExpanded: (lineage: string) => void
}

function persistForceViews(
  forceSavedView: Record<string, ForceNodeLayout>,
  sessionForceNodes: Record<string, ForceNodeLayout>,
) {
  const vault = useVaultStore.getState().vault
  if (!vault) return

  const existingForce = vault.layout.views.force ?? {
    nodes: {},
    lineageOffsets: {},
    forceNodes: {},
    forceSavedView: {},
  }

  const forceView: ViewLayout = {
    ...existingForce,
    forceNodes: sessionForceNodes,
    forceSavedView,
  }

  const layout: LayoutFile = {
    version: 1,
    views: { ...vault.layout.views, force: forceView },
  }
  const content = serializeLayout(layout)
  useVaultStore.getState().updateLayout(content)
  useVaultStore.setState({ vault: { ...vault, layout } })
  void cacheVaultFiles(useVaultStore.getState().fileMap)
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  positions: new Map(),
  savedLayout: { nodes: {}, lineageOffsets: {}, forceNodes: {}, forceSavedView: {} },
  sessionForceNodes: {},
  forceAutoLayout: {},
  forceSavedView: {},
  simulationRunning: false,
  draggingLineage: null,
  mergePointIds: new Set(),
  lineagePlanes: new Map(),
  bandCount: 1,
  shellRadii: [],
  focusedLineage: null,
  expandedLineages: new Set(),
  forceLayoutRevision: 0,
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
  setSavedLayout: (layout) =>
    set({
      savedLayout: {
        nodes: layout.nodes ?? {},
        lineageOffsets: layout.lineageOffsets ?? {},
        forceNodes: layout.forceNodes ?? {},
        forceSavedView: layout.forceSavedView ?? {},
      },
    }),
  setForceSavedView: (nodes) => set({ forceSavedView: nodes }),
  setForceAutoLayout: (nodes) => set({ forceAutoLayout: nodes }),
  ensureForceAutoBaseline: (nodes) => {
    if (Object.keys(get().sessionForceNodes).length > 0) return
    if (Object.keys(get().forceAutoLayout).length > 0) return
    set({ forceAutoLayout: nodes })
  },
  updateForceNodeX: (id, x) => {
    get().updateForceNodesX({ [id]: x })
  },
  updateForceNodesX: (updates) => {
    if (Object.keys(updates).length === 0) return
    const sessionForceNodes = { ...get().sessionForceNodes }
    for (const [id, x] of Object.entries(updates)) {
      sessionForceNodes[id] = { x: clampForceX(x), pinned: true }
    }
    set({ sessionForceNodes })
    persistForceViews(get().forceSavedView, sessionForceNodes)
  },
  resetForceLayout: () => {
    set({
      sessionForceNodes: {},
      forceAutoLayout: {},
      forceLayoutRevision: get().forceLayoutRevision + 1,
    })
    persistForceViews(get().forceSavedView, {})
  },
  saveForceView: () => {
    const merged = { ...get().forceAutoLayout, ...get().sessionForceNodes }
    if (Object.keys(merged).length === 0) return false
    set({
      forceSavedView: { ...merged },
      sessionForceNodes: { ...merged },
      forceAutoLayout: { ...merged },
    })
    persistForceViews({ ...merged }, { ...merged })
    return true
  },
  loadForceSavedView: () => {
    const saved = get().forceSavedView
    set({
      sessionForceNodes: { ...saved },
      forceAutoLayout: { ...saved },
      forceLayoutRevision: get().forceLayoutRevision + 1,
    })
    persistForceViews(saved, { ...saved })
  },
  hasForceSavedView: () => Object.keys(get().forceSavedView).length > 0,
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  setDraggingLineage: (lineage) => set({ draggingLineage: lineage }),
  setFocusedLineage: (lineage) => set({ focusedLineage: lineage }),
  initForceLineages: (lineages) =>
    set({
      expandedLineages: new Set(lineages),
    }),
  toggleLineageExpanded: (lineage) => {
    const expandedLineages = new Set(get().expandedLineages)
    if (expandedLineages.has(lineage)) expandedLineages.delete(lineage)
    else expandedLineages.add(lineage)
    set({ expandedLineages })
  },
}))
