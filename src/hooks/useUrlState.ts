import { useEffect } from 'react'
import { readStateFromUrl } from '@/lib/url/serialize'
import { useViewStore } from '@/stores/view-store'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import type { ViewId } from '@/views/types'

const LEGACY_VIEW_MAP: Record<string, ViewId> = {
  sphere: 'tree',
  force: 'tree',
  map: 'tree',
}

function normalizeViewId(view: string): ViewId {
  if (view === 'tree' || view === 'timeline') return view
  return LEGACY_VIEW_MAP[view] ?? 'tree'
}

export function useUrlState() {
  useEffect(() => {
    const state = readStateFromUrl()
    if (!state) return
    if (state.view) useViewStore.getState().setActiveView(normalizeViewId(state.view))
    if (state.sel) useGraphStore.getState().setSelectedId(state.sel)
    if (state.year) useTimeStore.getState().setCurrentYear(state.year)
  }, [])
}
