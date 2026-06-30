import { describe, it, expect } from 'vitest'
import { enrichLineageColors, lineageColor, SMALL_LINEAGE_COLOR } from '@/lib/vault/lineage-colors'

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
})
