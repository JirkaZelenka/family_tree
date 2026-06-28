import { Index } from 'flexsearch'
import type { PersonNode } from '@/types/person'

export interface SearchDocument {
  id: string
  fullName: string
  givenName: string
  familyName: string
  tags: string
  birthPlace: string
  deathPlace: string
  birthYear: string
  deathYear: string
  lineage: string
}

export function buildSearchIndex(persons: Map<string, PersonNode>) {
  const index = new Index({
    tokenize: 'forward',
    resolution: 9,
    cache: true,
  })

  const docs = new Map<string, SearchDocument>()

  for (const [id, p] of persons) {
    const doc: SearchDocument = {
      id,
      fullName: p.fullName,
      givenName: p.givenName,
      familyName: p.familyName ?? '',
      tags: p.tags.join(' '),
      birthPlace: p.birth?.place ?? '',
      deathPlace: p.death?.place ?? '',
      birthYear: p.birthYear?.toString() ?? '',
      deathYear: p.deathYear?.toString() ?? '',
      lineage: p.lineage,
    }
    docs.set(id, doc)
    index.add(
      id,
      [
        doc.fullName,
        doc.givenName,
        doc.familyName,
        doc.tags,
        doc.birthPlace,
        doc.deathPlace,
        doc.birthYear,
        doc.deathYear,
        doc.lineage,
      ].join(' '),
    )
  }

  return { index, docs }
}

export function searchPersons(
  index: Index,
  docs: Map<string, SearchDocument>,
  query: string,
  limit = 20,
): SearchDocument[] {
  if (!query.trim()) return []
  const ids = index.search(query, { limit }) as string[]
  return ids
    .map((id) => docs.get(id))
    .filter((d): d is SearchDocument => d !== undefined)
}
