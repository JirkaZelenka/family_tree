import { describe, it, expect } from 'vitest'
import { lineageToMaidenName } from '@/lib/vault/lineage-names'

describe('lineageToMaidenName', () => {
  it('odvodí příjmení z rodu se suffixem -ovi', () => {
    expect(lineageToMaidenName('exampleovi', 'male')).toBe('Example')
    expect(lineageToMaidenName('exampleovi', 'female')).toBe('Exampleová')
    expect(lineageToMaidenName('sampleovi', 'male')).toBe('Sample')
    expect(lineageToMaidenName('sampleovi', 'female')).toBe('Sampleová')
  })

  it('zvládne rod bez -ovi a s diakritikou v klíči', () => {
    expect(lineageToMaidenName('novakova', 'female')).toBe('Novaková')
    expect(lineageToMaidenName('dvorakova', 'female')).toBe('Dvoraková')
    expect(lineageToMaidenName('testova', 'female')).toBe('Testová')
  })
})
