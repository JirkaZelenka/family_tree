import { create } from 'zustand'
import { isAliveAtYear } from '@/lib/time/dates'

interface TimeState {
  currentYear: number
  minYear: number
  maxYear: number
  animatePlaying: boolean
  /** Ignoruje časový filtr — ukáže všechny osoby. */
  showAllPeople: boolean
  /** Sféra: po ručním posunu slideru zvýraznit žijící v daném roce. */
  sphereHighlightByYear: boolean
  setCurrentYear: (year: number, opts?: { fromSlider?: boolean }) => void
  setYearRange: (min: number, max: number) => void
  setAnimatePlaying: (playing: boolean) => void
  setShowAllPeople: (show: boolean) => void
  setSphereHighlightByYear: (active: boolean) => void
  isPersonVisible: (
    birthYear: number | null,
    deathYear: number | null,
    deathDate?: string | null,
  ) => boolean
  /** Manželská spojnice viditelná v aktuálním roce (nebo při Zobrazit vše). */
  isMarriageVisible: (marriageYear: number | null) => boolean
}

export const useTimeStore = create<TimeState>((set, get) => ({
  currentYear: 1920,
  minYear: 1800,
  maxYear: 2025,
  animatePlaying: false,
  showAllPeople: false,
  sphereHighlightByYear: false,
  setCurrentYear: (year, opts) =>
    set({
      currentYear: year,
      ...(opts?.fromSlider
        ? { sphereHighlightByYear: true, showAllPeople: false }
        : {}),
    }),
  setYearRange: (min, max) => set({ minYear: min, maxYear: max }),
  setAnimatePlaying: (playing) =>
    set({
      animatePlaying: playing,
      ...(playing ? { showAllPeople: false } : {}),
    }),
  setShowAllPeople: (show) =>
    set({
      showAllPeople: show,
      ...(show ? { animatePlaying: false, sphereHighlightByYear: false } : {}),
    }),
  setSphereHighlightByYear: (active) => set({ sphereHighlightByYear: active }),
  isPersonVisible: (birthYear, deathYear, deathDate) => {
    const { currentYear, showAllPeople } = get()
    if (showAllPeople) return true
    return isAliveAtYear(birthYear, deathYear, currentYear, deathDate)
  },
  isMarriageVisible: (marriageYear) => {
    const { currentYear, showAllPeople } = get()
    if (showAllPeople) return true
    if (marriageYear === null) return true
    return marriageYear <= currentYear
  },
}))
