import { useGraphStore } from '@/stores/graph-store'
import type { PersonNode } from '@/types/person'

/** Připnutá osoba (klik) vs. dočasný náhled (hover). */
export function useDetailPerson(): {
  person: PersonNode | null
  pinnedPerson: PersonNode | null
  detailId: string | null
  selectedId: string | null
  hoveredId: string | null
  isPreview: boolean
} {
  const selectedId = useGraphStore((s) => s.selectedId)
  const hoveredId = useGraphStore((s) => s.hoveredId)
  const persons = useGraphStore((s) => s.persons)

  const pinnedPerson = selectedId ? persons.get(selectedId) ?? null : null
  const hoveredPerson = hoveredId ? persons.get(hoveredId) ?? null : null
  const isPreview = hoveredId !== null && hoveredId !== selectedId
  const person = (isPreview ? hoveredPerson : pinnedPerson) ?? hoveredPerson
  const detailId = person?.id ?? null

  return {
    person,
    pinnedPerson,
    detailId,
    selectedId,
    hoveredId,
    isPreview,
  }
}
