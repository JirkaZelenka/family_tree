import { create } from 'zustand'
import Graph from 'graphology'
import type { PersonNode, GraphEdgeAttributes, PersonRecord } from '@/types/person'
import type { GraphDiagnostic } from '@/lib/graph/builder'
import { buildGraphFromRecords } from '@/lib/graph/builder'
import { buildSearchIndex, type SearchDocument } from '@/lib/search/index'
import type { Index } from 'flexsearch'
import { useAuthStore } from '@/stores/auth-store'
import { applyPersonVisibility, lineageAccessFromUser } from '@/auth/lineage-visibility'

interface GraphState {
  graph: Graph<PersonNode, GraphEdgeAttributes> | null
  persons: Map<string, PersonNode>
  diagnostics: GraphDiagnostic[]
  selectedId: string | null
  selectedIds: Set<string>
  hoveredId: string | null
  highlightedIds: Set<string>
  searchIndex: Index | null
  searchDocs: Map<string, SearchDocument>
  loadFromRecords: (records: PersonRecord[]) => void
  setSelectedId: (id: string | null) => void
  setSelectedIds: (ids: Iterable<string>) => void
  setHoveredId: (id: string | null) => void
  setHighlightedIds: (ids: Set<string>) => void
  getPerson: (id: string) => PersonNode | undefined
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: null,
  persons: new Map(),
  diagnostics: [],
  selectedId: null,
  selectedIds: new Set(),
  hoveredId: null,
  highlightedIds: new Set(),
  searchIndex: null,
  searchDocs: new Map(),
  loadFromRecords: (records) => {
    try {
      const access = lineageAccessFromUser(useAuthStore.getState().user)
      const visibleRecords = applyPersonVisibility(records, access)
      const { graph, diagnostics, persons } = buildGraphFromRecords(visibleRecords)
      const { index, docs } = buildSearchIndex(persons)
      set({
        graph,
        persons,
        diagnostics,
        searchIndex: index,
        searchDocs: docs,
      })
    } catch (e) {
      console.error('Chyba sestavení grafu', e)
      set({
        graph: null,
        persons: new Map(),
        diagnostics: [
          {
            level: 'error',
            message: e instanceof Error ? e.message : String(e),
          },
        ],
        searchIndex: null,
        searchDocs: new Map(),
      })
    }
  },
  setSelectedId: (id) => {
    set({ selectedId: id, selectedIds: id ? new Set([id]) : new Set() })
  },
  setSelectedIds: (ids) => {
    const selectedIds = new Set(ids)
    const selectedId = selectedIds.size > 0 ? [...selectedIds][0] : null
    set({ selectedIds, selectedId })
  },
  setHoveredId: (id) => {
    set({ hoveredId: id })
  },
  setHighlightedIds: (ids) => set({ highlightedIds: ids }),
  getPerson: (id) => get().persons.get(id),
}))
