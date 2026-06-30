import { create } from 'zustand'
import type { ViewId } from '@/views/types'

interface ViewState {
  activeView: ViewId
  detailPanelCollapsed: boolean
  eventsPanelOpen: boolean
  setActiveView: (view: ViewId) => void
  setDetailPanelCollapsed: (collapsed: boolean) => void
  setEventsPanelOpen: (open: boolean) => void
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: 'sphere',
  detailPanelCollapsed: false,
  eventsPanelOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setDetailPanelCollapsed: (collapsed) => set({ detailPanelCollapsed: collapsed }),
  setEventsPanelOpen: (open) => set({ eventsPanelOpen: open }),
}))
