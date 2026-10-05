import { describe, expect, it } from 'vitest'
import { protectMarkedSpans } from '@/components/texts/InteractiveTextBody'
import type { TextMention } from '@/types/text'

describe('protectMarkedSpans', () => {
  it('keeps markdown structure and placeholders for mentions', () => {
    const body = '### Karel Zelenka\n\nText **tučně**.'
    const mentions: TextMention[] = [
      {
        kind: 'person',
        ref: '54',
        display: 'Karel Zelenka',
        start: 4,
        end: 17,
      },
    ]
    const { markdown, markers } = protectMarkedSpans(body, mentions, [])
    expect(markdown.startsWith('### ')).toBe(true)
    expect(markdown).toContain('\uE000FT0\uE001')
    expect(markdown).toContain('**tučně**')
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({ kind: 'mention', text: 'Karel Zelenka' })
  })

  it('skips overlapping later ranges after consuming earlier ones', () => {
    const body = 'Andrea Bartoňová a Jiří'
    const mentions: TextMention[] = [
      {
        kind: 'person',
        ref: '4',
        display: 'Andrea Bartoňová',
        start: 0,
        end: 16,
      },
    ]
    const { markdown, markers } = protectMarkedSpans(body, mentions, [], [
      { start: 0, end: 16 },
    ])
    expect(markers).toHaveLength(1)
    expect(markers[0].kind).toBe('mention')
    expect(markdown).toBe('\uE000FT0\uE001 a Jiří')
  })
})
