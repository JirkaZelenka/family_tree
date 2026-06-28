import { create } from 'zustand'
import { searchPersons } from '@/lib/search/index'
import type { SearchDocument } from '@/lib/search/index'
import { useGraphStore } from './graph-store'

interface SearchState {
  query: string
  results: SearchDocument[]
  commandOpen: boolean
  setQuery: (query: string) => void
  runSearch: (query: string) => void
  setCommandOpen: (open: boolean) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  commandOpen: false,
  setQuery: (query) => set({ query }),
  runSearch: (query) => {
    const { searchIndex, searchDocs } = useGraphStore.getState()
    if (!searchIndex) {
      set({ query, results: [] })
      return
    }
    const results = searchPersons(searchIndex, searchDocs, query)
    set({ query, results })
  },
  setCommandOpen: (open) => set({ commandOpen: open }),
}))
