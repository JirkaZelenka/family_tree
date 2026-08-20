import { create } from 'zustand'
import type { ViewId } from '@/views/types'

export type LineageSort = 'name' | 'members'

interface ViewState {
  activeView: ViewId
  eventsPanelOpen: boolean
  profilePersonId: string | null
  lineageSort: LineageSort
  selectedLineage: string | null
  lineageSidebarOpen: boolean
  personSidebarOpen: boolean
  setActiveView: (view: ViewId) => void
  setEventsPanelOpen: (open: boolean) => void
  setProfilePersonId: (id: string | null) => void
  setSelectedLineage: (lineage: string | null) => void
  setLineageSort: (sort: LineageSort) => void
  setLineageSidebarOpen: (open: boolean) => void
  setPersonSidebarOpen: (open: boolean) => void
  toggleTreeFullscreen: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'tree',
  eventsPanelOpen: true,
  profilePersonId: null,
  selectedLineage: null,
  lineageSort: 'name',
  lineageSidebarOpen: true,
  personSidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setEventsPanelOpen: (open) => set({ eventsPanelOpen: open }),
  setProfilePersonId: (id) => set({ profilePersonId: id }),
  setSelectedLineage: (lineage) => set({ selectedLineage: lineage }),
  setLineageSort: (sort) => set({ lineageSort: sort }),
  setLineageSidebarOpen: (open) => set({ lineageSidebarOpen: open }),
  setPersonSidebarOpen: (open) => set({ personSidebarOpen: open }),
  toggleTreeFullscreen: () =>
    set((s) => {
      if (s.personSidebarOpen || s.lineageSidebarOpen) {
        return { personSidebarOpen: false, lineageSidebarOpen: false }
      }
      return { personSidebarOpen: true, lineageSidebarOpen: true }
    }),
}))
