import { create } from 'zustand'
import type { ViewId } from '@/views/types'

interface ViewState {
  activeView: ViewId
  detailPanelOpen: boolean
  eventsPanelOpen: boolean
  setActiveView: (view: ViewId) => void
  setDetailPanelOpen: (open: boolean) => void
  setEventsPanelOpen: (open: boolean) => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'sphere',
  detailPanelOpen: true,
  eventsPanelOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
  setEventsPanelOpen: (open) => set({ eventsPanelOpen: open }),
}))
