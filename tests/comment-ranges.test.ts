import { describe, expect, it } from 'vitest'
import {
  createRangeFromTextOffsets,
  findTextRange,
  resolveCommentDomRange,
} from '@/lib/texts/comment-ranges'

describe('comment-ranges', () => {
  it('creates a range from text offsets', () => {
    const root = document.createElement('div')
    root.textContent = 'Ahoj světe, komentář zde.'
    const range = createRangeFromTextOffsets(root, 5, 10)
    expect(range?.toString()).toBe('světe')
  })

  it('finds quote text when offsets drift', () => {
    const root = document.createElement('div')
    root.textContent = 'Předkové Karel Zelenka žili v Praze.'
    const range = resolveCommentDomRange(root, {
      start: 0,
      end: 3,
      quote: 'Karel Zelenka',
    })
    expect(range?.toString()).toBe('Karel Zelenka')
  })

  it('findTextRange returns null for missing needle', () => {
    const root = document.createElement('div')
    root.textContent = 'Jen krátký text.'
    expect(findTextRange(root, 'neexistuje')).toBeNull()
  })
})
