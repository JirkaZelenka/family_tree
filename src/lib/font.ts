export type FontPresetId = 'source' | 'literata' | 'crimson' | 'cormorant'

export interface FontPreset {
  id: FontPresetId
  /** i18n key under toolbar.font.* */
  labelKey: string
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'source', labelKey: 'toolbar.font.source' },
  { id: 'literata', labelKey: 'toolbar.font.literata' },
  { id: 'crimson', labelKey: 'toolbar.font.crimson' },
  { id: 'cormorant', labelKey: 'toolbar.font.cormorant' },
]

const STORAGE_KEY = 'family-tree-font'
const DEFAULT_PRESET: FontPresetId = 'source'

export function getStoredFontPreset(): FontPresetId {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (
    stored === 'source' ||
    stored === 'literata' ||
    stored === 'crimson' ||
    stored === 'cormorant'
  ) {
    return stored
  }
  return DEFAULT_PRESET
}

export function applyFontPreset(preset: FontPresetId) {
  document.documentElement.dataset.font = preset
}

export function persistFontPreset(preset: FontPresetId) {
  localStorage.setItem(STORAGE_KEY, preset)
}

export function initFont() {
  applyFontPreset(getStoredFontPreset())
}
