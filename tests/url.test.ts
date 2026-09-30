import { describe, it, expect } from 'vitest'
import {
  deserializeAppState,
  pathToState,
  serializeAppState,
  stateToPath,
} from '@/lib/url/serialize'

describe('url serialize', () => {
  it('legacy lz-string roundtrips state', () => {
    const state = { view: 'sphere', sel: 'abc', year: 1920 }
    const encoded = serializeAppState(state)
    const decoded = deserializeAppState(encoded)
    expect(decoded).toEqual(state)
  })

  it('builds readable paths', () => {
    expect(stateToPath({ view: 'tree' })).toBe('/tree')
    expect(stateToPath({ view: 'tree', sel: '1', year: 1950 })).toBe('/tree?sel=1&year=1950')
    expect(stateToPath({ view: 'stories' })).toBe('/texts')
    expect(stateToPath({ view: 'stories', text: 'pokus' })).toBe('/texts/pokus')
    expect(stateToPath({ view: 'stories', text: 'rod/pokus' })).toBe('/texts/rod/pokus')
    expect(stateToPath({ view: 'timeline' })).toBe('/timeline')
  })

  it('parses readable paths', () => {
    expect(pathToState('/tree')).toEqual({ view: 'tree' })
    expect(pathToState('/tree', '?sel=1&year=1950')).toEqual({
      view: 'tree',
      sel: '1',
      year: 1950,
    })
    expect(pathToState('/texts')).toEqual({ view: 'stories' })
    expect(pathToState('/texts/pokus')).toEqual({ view: 'stories', text: 'pokus' })
    expect(pathToState('/texts/rod/pokus')).toEqual({ view: 'stories', text: 'rod/pokus' })
    expect(pathToState('/force')).toEqual({ view: 'tree' })
  })

  it('roundtrips path state', () => {
    const state = { view: 'stories', text: 'svatba-jana', sel: '13', year: 2022 }
    expect(pathToState(...(() => {
      const full = stateToPath(state)
      const [path, query] = full.split('?')
      return [path, query ? `?${query}` : ''] as const
    })())).toEqual(state)
  })
})
