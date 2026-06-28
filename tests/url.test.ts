import { describe, it, expect } from 'vitest'
import { serializeAppState, deserializeAppState } from '@/lib/url/serialize'

describe('url serialize', () => {
  it('roundtrips state', () => {
    const state = { view: 'sphere', sel: 'abc', year: 1920 }
    const encoded = serializeAppState(state)
    const decoded = deserializeAppState(encoded)
    expect(decoded).toEqual(state)
  })
})
