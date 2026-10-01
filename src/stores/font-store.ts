import { create } from 'zustand'
import {
  applyFontPreset,
  getStoredFontPreset,
  persistFontPreset,
  type FontPresetId,
} from '@/lib/font'

interface FontState {
  fontPreset: FontPresetId
  setFontPreset: (preset: FontPresetId) => void
}

export const useFontStore = create<FontState>((set) => ({
  fontPreset: getStoredFontPreset(),
  setFontPreset: (fontPreset) => {
    applyFontPreset(fontPreset)
    persistFontPreset(fontPreset)
    set({ fontPreset })
  },
}))
