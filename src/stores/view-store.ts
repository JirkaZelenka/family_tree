import { create } from 'zustand'
import type { ViewId } from '@/views/types'

export type LineageSort = 'name' | 'members'

interface ViewState {
  activeView: ViewId
  eventsPanelOpen: boolean
  profilePersonId: string | null
  lineageSort: LineageSort
  setActiveView: (view: ViewId) => void
  setEventsPanelOpen: (open: boolean) => void
  setProfilePersonId: (id: string | null) => void
  setLineageSort: (sort: LineageSort) => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'tree',
  eventsPanelOpen: true,
  profilePersonId: null,
  lineageSort: 'name',
  setActiveView: (view) => set({ activeView: view }),
  setEventsPanelOpen: (open) => set({ eventsPanelOpen: open }),
  setProfilePersonId: (id) => set({ profilePersonId: id }),
  setLineageSort: (sort) => set({ lineageSort: sort }),
}))
