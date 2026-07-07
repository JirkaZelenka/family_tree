import { create } from 'zustand'
import { isAliveAtYear, isBornByYear } from '@/lib/time/dates'

interface TimeState {
  currentYear: number
  minYear: number
  maxYear: number
  animatePlaying: boolean
  showContemporariesOnly: boolean
  /** Sféra: po ručním posunu slideru zvýraznit žijící v daném roce. */
  sphereHighlightByYear: boolean
  setCurrentYear: (year: number, opts?: { fromSlider?: boolean }) => void
  setYearRange: (min: number, max: number) => void
  setAnimatePlaying: (playing: boolean) => void
  setShowContemporariesOnly: (show: boolean) => void
  setSphereHighlightByYear: (active: boolean) => void
  isPersonVisible: (
    birthYear: number | null,
    deathYear: number | null,
  ) => boolean
}

export const useTimeStore = create<TimeState>((set, get) => ({
  currentYear: 1920,
  minYear: 1800,
  maxYear: 2025,
  animatePlaying: false,
  showContemporariesOnly: false,
  sphereHighlightByYear: false,
  setCurrentYear: (year, opts) =>
    set({
      currentYear: year,
      ...(opts?.fromSlider ? { sphereHighlightByYear: true } : {}),
    }),
  setYearRange: (min, max) => set({ minYear: min, maxYear: max }),
  setAnimatePlaying: (playing) => set({ animatePlaying: playing }),
  setShowContemporariesOnly: (show) => set({ showContemporariesOnly: show }),
  setSphereHighlightByYear: (active) => set({ sphereHighlightByYear: active }),
  isPersonVisible: (birthYear, deathYear) => {
    const { currentYear, showContemporariesOnly } = get()
    if (!isBornByYear(birthYear, currentYear)) return false
    if (showContemporariesOnly) {
      return isAliveAtYear(birthYear, deathYear, currentYear)
    }
    return true
  },
}))
