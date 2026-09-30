import { useEffect, useRef } from 'react'
import {
  readStateFromUrl,
  urlNavKey,
  writeAppStateToUrl,
  type UrlAppState,
} from '@/lib/url/serialize'
import { useViewStore } from '@/stores/view-store'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useStoriesStore } from '@/stores/stories-store'
import type { ViewId } from '@/views/types'

const LEGACY_VIEW_MAP: Record<string, ViewId> = {
  sphere: 'tree',
  force: 'tree',
}

function normalizeViewId(view: string): ViewId {
  if (
    view === 'tree' ||
    view === 'stories' ||
    view === 'timeline' ||
    view === 'calendar' ||
    view === 'map'
  ) {
    return view
  }
  return LEGACY_VIEW_MAP[view] ?? 'tree'
}

function snapshotFromStores(): UrlAppState {
  const view = useViewStore.getState().activeView
  const openTextId = useStoriesStore.getState().openTextId
  const sel = useGraphStore.getState().selectedId
  const year = useTimeStore.getState().currentYear
  const state: UrlAppState = { view }
  if (view === 'stories' && openTextId) state.text = openTextId
  if (sel) state.sel = sel
  if (Number.isFinite(year)) state.year = year
  return state
}

function applyUrlToStores(state: UrlAppState | null) {
  if (!state) return
  if (state.view) {
    useViewStore.getState().setActiveView(normalizeViewId(state.view))
  }
  const view = state.view ? normalizeViewId(state.view) : useViewStore.getState().activeView
  if (view === 'stories') {
    useStoriesStore.getState().setOpenTextId(state.text ?? null)
  }
  if (state.sel) useGraphStore.getState().setSelectedId(state.sel)
  if (state.year) useTimeStore.getState().setCurrentYear(state.year)
}

export function useUrlState() {
  const applyingFromUrl = useRef(false)
  const lastNavKey = useRef<string | null>(null)
  const ready = useRef(false)
  const syncScheduled = useRef(false)

  useEffect(() => {
    applyingFromUrl.current = true
    const initial = readStateFromUrl()
    applyUrlToStores(initial)
    lastNavKey.current = urlNavKey(initial ?? snapshotFromStores())
    queueMicrotask(() => {
      applyingFromUrl.current = false
      ready.current = true
      writeAppStateToUrl(snapshotFromStores(), 'replace')
      lastNavKey.current = urlNavKey(snapshotFromStores())
    })

    const onPopState = () => {
      applyingFromUrl.current = true
      const state = readStateFromUrl()
      applyUrlToStores(state)
      lastNavKey.current = urlNavKey(state ?? snapshotFromStores())
      queueMicrotask(() => {
        applyingFromUrl.current = false
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const flushSync = () => {
      syncScheduled.current = false
      if (!ready.current || applyingFromUrl.current) return
      const state = snapshotFromStores()
      const navKey = urlNavKey(state)
      const mode =
        lastNavKey.current != null && navKey !== lastNavKey.current ? 'push' : 'replace'
      lastNavKey.current = navKey
      writeAppStateToUrl(state, mode)
    }

    const scheduleSync = () => {
      if (syncScheduled.current) return
      syncScheduled.current = true
      queueMicrotask(flushSync)
    }

    const unsubs = [
      useViewStore.subscribe((s, prev) => {
        if (s.activeView !== prev.activeView) scheduleSync()
      }),
      useStoriesStore.subscribe((s, prev) => {
        if (s.openTextId !== prev.openTextId) scheduleSync()
      }),
      useGraphStore.subscribe((s, prev) => {
        if (s.selectedId !== prev.selectedId) scheduleSync()
      }),
      useTimeStore.subscribe((s, prev) => {
        if (s.currentYear !== prev.currentYear) scheduleSync()
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])
}
