import { useEffect } from 'react'
import { readStateFromUrl } from '@/lib/url/serialize'
import { useViewStore } from '@/stores/view-store'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import type { ViewId } from '@/views/types'

export function useUrlState() {
  useEffect(() => {
    const state = readStateFromUrl()
    if (!state) return
    if (state.view) useViewStore.getState().setActiveView(state.view as ViewId)
    if (state.sel) useGraphStore.getState().setSelectedId(state.sel)
    if (state.year) useTimeStore.getState().setCurrentYear(state.year)
  }, [])
}
