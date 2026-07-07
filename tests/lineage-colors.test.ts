import { describe, it, expect } from 'vitest'
import {
  enrichLineageColors,
  lineageColor,
  SMALL_LINEAGE_COLOR,
  countAffiliatedLineageMembers,
  personBelongsToLineage,
} from '@/lib/vault/lineage-colors'

describe('enrichLineageColors', () => {
  it('assigns colors for lineages missing from config', () => {
    const colors = enrichLineageColors(['zelenka', 'spilka'], { zelenka: '#22c55e' })
    expect(colors.zelenka).toBe('#22c55e')
    expect(colors.spilka).toMatch(/^#[0-9a-f]{6}$/i)
    expect(colors.spilka).not.toBe('#94a3b8')
  })

  it('lineageColor never returns gray for known lineage', () => {
    const colors = enrichLineageColors(['barton'], {})
    expect(lineageColor('barton', colors)).not.toBe('#94a3b8')
  })

  it('assigns pastel yellow to single-member lineages', () => {
    const colors = enrichLineageColors(
      ['zelenka', 'spilka', 'spilka'],
      { zelenka: '#22c55e' },
      { zelenka: 3, spilka: 1 },
    )
    expect(colors.zelenka).toBe('#22c55e')
    expect(colors.spilka).toBe(SMALL_LINEAGE_COLOR)
  })

  it('počítá vdané ženy do obou rodů', () => {
    const persons = [
      { lineage: 'brazdovi', familyName: 'Nagyová' },
      { lineage: 'nagyovi', familyName: 'Nagy' },
      { lineage: 'brazdovi', familyName: 'Brazda' },
    ]
    const counts = countAffiliatedLineageMembers(persons, ['brazdovi', 'nagyovi'])
    expect(counts.brazdovi).toBe(2)
    expect(counts.nagyovi).toBe(2)
    expect(personBelongsToLineage(persons[0], 'nagyovi')).toBe(true)
    expect(personBelongsToLineage(persons[0], 'brazdovi')).toBe(true)
  })
})
