import { create } from 'zustand'
import type {
  SpherePosition,
  LineagePlane,
  SphereLayoutResult,
} from '@/lib/layout/sphere'
import type { ForceNodeLayout, ForceSavedViews, ViewLayout } from '@/types/vault'
import { useVaultStore } from '@/stores/vault-store'
import { useAuthStore } from '@/stores/auth-store'
import { serializeLayout } from '@/lib/storage/vault-loader'
import { persistVaultMetaPaths } from '@/lib/storage/vault-persist'
import type { LayoutFile } from '@/types/vault'
import {
  activeForceViewNodes,
  mergeForcePositions,
  migrateForceSavedViews,
} from '@/lib/layout/force-saved-views'
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
  forceSavedViews: ForceSavedViews
  activeForceViewName: string | null
  simulationRunning: boolean
  draggingLineage: string | null
  mergePointIds: Set<string>
  lineagePlanes: Map<string, LineagePlane>
  bandCount: number
  shellRadii: number[]
  focusedLineage: string | null
  expandedLineages: Set<string>
  forceLayoutRevision: number
  pendingForceFit: boolean
  setSphereLayout: (result: SphereLayoutResult) => void
  updateNodePosition: (id: string, pos: SpherePosition, pinned?: boolean) => void
  setSavedLayout: (layout: ViewLayout) => void
  setForceSavedViews: (views: ForceSavedViews, activeName?: string | null) => void
  setForceAutoLayout: (nodes: Record<string, ForceNodeLayout>) => void
  ensureForceAutoBaseline: (nodes: Record<string, ForceNodeLayout>) => void
  updateForceNodeX: (id: string, x: number) => void
  updateForceNodesX: (updates: Record<string, number>) => void
  resetForceLayout: () => void
  saveForceViewPreset: (name: string) => boolean
  loadForceViewPreset: (name: string) => boolean
  renameForceViewPreset: (oldName: string, newName: string) => boolean
  deleteForceViewPreset: (name: string) => void
  listForceViewPresetNames: () => string[]
  setSimulationRunning: (running: boolean) => void
  setDraggingLineage: (lineage: string | null) => void
  setFocusedLineage: (lineage: string | null) => void
  initForceLineages: (lineages: string[]) => void
  toggleLineageExpanded: (lineage: string) => void
}

function persistForceViews(
  forceSavedViews: ForceSavedViews,
  activeForceViewName: string | null,
  sessionForceNodes: Record<string, ForceNodeLayout>,
) {
  const vault = useVaultStore.getState().vault
  if (!vault) return

  const existingForce = vault.layout.views.force ?? {
    nodes: {},
    lineageOffsets: {},
    forceNodes: {},
    forceSavedView: {},
    forceSavedViews: {},
  }

  const activeNodes = activeForceViewNodes(forceSavedViews, activeForceViewName)

  const forceView: ViewLayout = {
    ...existingForce,
    forceNodes: sessionForceNodes,
    forceSavedView: activeNodes,
    forceSavedViews,
    activeForceViewName,
  }

  const layout: LayoutFile = {
    version: 1,
    views: { ...vault.layout.views, force: forceView },
  }
  const content = serializeLayout(layout)
  useVaultStore.getState().updateLayout(content)
  useVaultStore.setState({ vault: { ...vault, layout } })
  void persistVaultMetaPaths(useVaultStore.getState().fileMap, ['.family-tree/layout.json'])
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  positions: new Map(),
  savedLayout: {
    nodes: {},
    lineageOffsets: {},
    forceNodes: {},
    forceSavedView: {},
    forceSavedViews: {},
  },
  sessionForceNodes: {},
  forceAutoLayout: {},
  forceSavedViews: {},
  activeForceViewName: null,
  simulationRunning: false,
  draggingLineage: null,
  mergePointIds: new Set(),
  lineagePlanes: new Map(),
  bandCount: 1,
  shellRadii: [],
  focusedLineage: null,
  expandedLineages: new Set(),
  forceLayoutRevision: 0,
  pendingForceFit: false,
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
        forceSavedViews: layout.forceSavedViews ?? {},
      },
    }),
  setForceSavedViews: (views, activeName) => {
    const resolvedActive =
      activeName !== undefined
        ? activeName
        : get().activeForceViewName && views[get().activeForceViewName!]
          ? get().activeForceViewName
          : null
    set({
      forceSavedViews: views,
      activeForceViewName: resolvedActive,
    })
  },
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
    persistForceViews(
      get().forceSavedViews,
      get().activeForceViewName,
      sessionForceNodes,
    )
  },
  resetForceLayout: () => {
    set({
      sessionForceNodes: {},
      forceAutoLayout: {},
      activeForceViewName: null,
      forceLayoutRevision: get().forceLayoutRevision + 1,
    })
    persistForceViews(get().forceSavedViews, null, {})
  },
  saveForceViewPreset: (name) => {
    if (!useAuthStore.getState().user?.canEditSavedViews) return false
    const trimmed = name.trim()
    if (!trimmed) return false
    const merged = mergeForcePositions(get().forceAutoLayout, get().sessionForceNodes)
    if (Object.keys(merged).length === 0) return false
    const forceSavedViews = {
      ...get().forceSavedViews,
      [trimmed]: { ...merged },
    }
    set({
      forceSavedViews,
      activeForceViewName: trimmed,
      sessionForceNodes: { ...merged },
      forceAutoLayout: { ...merged },
    })
    persistForceViews(forceSavedViews, trimmed, { ...merged })
    return true
  },
  loadForceViewPreset: (name) => {
    const nodes = get().forceSavedViews[name]
    if (!nodes || Object.keys(nodes).length === 0) return false
    const sessionForceNodes = { ...nodes }
    const forceAutoLayout = { ...nodes }
    set({
      activeForceViewName: name,
      sessionForceNodes,
      forceAutoLayout,
      forceLayoutRevision: get().forceLayoutRevision + 1,
      pendingForceFit: true,
    })
    persistForceViews(get().forceSavedViews, name, sessionForceNodes)
    return true
  },
  renameForceViewPreset: (oldName, newName) => {
    if (!useAuthStore.getState().user?.canEditSavedViews) return false
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed) return false
    const views = get().forceSavedViews
    if (!views[oldName] || views[trimmed]) return false
    const next = { ...views }
    next[trimmed] = next[oldName]
    delete next[oldName]
    const activeForceViewName =
      get().activeForceViewName === oldName ? trimmed : get().activeForceViewName
    set({ forceSavedViews: next, activeForceViewName })
    persistForceViews(next, activeForceViewName, get().sessionForceNodes)
    return true
  },
  deleteForceViewPreset: (name) => {
    if (!useAuthStore.getState().user?.canEditSavedViews) return
    const views = { ...get().forceSavedViews }
    if (!views[name]) return
    delete views[name]
    const wasActive = get().activeForceViewName === name
    const activeForceViewName = wasActive ? Object.keys(views)[0] ?? null : get().activeForceViewName
    const sessionForceNodes = wasActive
      ? activeForceViewNodes(views, activeForceViewName)
      : get().sessionForceNodes
    set({
      forceSavedViews: views,
      activeForceViewName,
      ...(wasActive
        ? {
            sessionForceNodes,
            forceAutoLayout: { ...sessionForceNodes },
            forceLayoutRevision: get().forceLayoutRevision + 1,
          }
        : {}),
    })
    persistForceViews(views, activeForceViewName, sessionForceNodes)
  },
  listForceViewPresetNames: () =>
    Object.keys(get().forceSavedViews).sort((a, b) => a.localeCompare(b, 'cs')),
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

export function initForceViewsFromVault(forceView: ViewLayout): {
  views: ForceSavedViews
  activeName: string | null
  sessionNodes: Record<string, ForceNodeLayout>
} {
  const views = migrateForceSavedViews(forceView)
  const storedActive = forceView.activeForceViewName ?? null
  const activeName =
    storedActive && views[storedActive] ? storedActive : null
  const sessionNodes =
    activeName !== null ? { ...views[activeName] } : {}
  return { views, activeName, sessionNodes }
}
