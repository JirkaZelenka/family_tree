import { create } from 'zustand'

export type StoriesSort = 'date' | 'family' | 'title'

const SORT_STORAGE_KEY = 'family-tree.stories.sort'

function readStoredSort(): StoriesSort {
  try {
    const value = localStorage.getItem(SORT_STORAGE_KEY)
    if (value === 'date' || value === 'family' || value === 'title') return value
  } catch {
    /* ignore */
  }
  return 'date'
}

interface StoriesNavReturn {
  textId: string
  scrollTop: number
  mentionStart: number | null
}

interface StoriesState {
  sort: StoriesSort
  openTextId: string | null
  /** Návrat ze Stromu na stejné místo v textu. */
  returnTarget: StoriesNavReturn | null
  pendingScrollTop: number | null
  pendingMentionStart: number | null
  setSort: (sort: StoriesSort) => void
  setOpenTextId: (id: string | null) => void
  leaveForTree: (payload: StoriesNavReturn) => void
  consumeReturn: () => StoriesNavReturn | null
  clearReturn: () => void
  setPendingScroll: (scrollTop: number | null, mentionStart?: number | null) => void
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  sort: readStoredSort(),
  openTextId: null,
  returnTarget: null,
  pendingScrollTop: null,
  pendingMentionStart: null,
  setSort: (sort) => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sort)
    } catch {
      /* ignore */
    }
    set({ sort })
  },
  setOpenTextId: (id) => set({ openTextId: id }),
  leaveForTree: (payload) =>
    set({
      returnTarget: payload,
      openTextId: payload.textId,
    }),
  consumeReturn: () => {
    const target = get().returnTarget
    if (!target) return null
    set({
      returnTarget: null,
      openTextId: target.textId,
      pendingScrollTop: target.scrollTop,
      pendingMentionStart: target.mentionStart,
    })
    return target
  },
  clearReturn: () => set({ returnTarget: null }),
  setPendingScroll: (scrollTop, mentionStart = null) =>
    set({ pendingScrollTop: scrollTop, pendingMentionStart: mentionStart }),
}))
