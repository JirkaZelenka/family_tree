import { create } from 'zustand'
import { isAliveAtYear } from '@/lib/time/dates'

interface TimeState {
  currentYear: number
  minYear: number
  maxYear: number
  animatePlaying: boolean
  showContemporariesOnly: boolean
  setCurrentYear: (year: number) => void
  setYearRange: (min: number, max: number) => void
  setAnimatePlaying: (playing: boolean) => void
  setShowContemporariesOnly: (show: boolean) => void
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
  setCurrentYear: (year) => set({ currentYear: year }),
  setYearRange: (min, max) => set({ minYear: min, maxYear: max }),
  setAnimatePlaying: (playing) => set({ animatePlaying: playing }),
  setShowContemporariesOnly: (show) => set({ showContemporariesOnly: show }),
  isPersonVisible: (birthYear, deathYear) =>
    isAliveAtYear(birthYear, deathYear, get().currentYear),
}))
