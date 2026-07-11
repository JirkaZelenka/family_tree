import { describe, it, expect } from 'vitest'
import {
  migrateForceSavedViews,
  mergeForcePositions,
  DEFAULT_FORCE_VIEW_PRESET,
} from '@/lib/layout/force-saved-views'
import { initForceViewsFromVault } from '@/stores/layout-store'
import type { ViewLayout } from '@/types/vault'

describe('force-saved-views', () => {
  it('migrates legacy forceSavedView into a named preset', () => {
    const forceView: ViewLayout = {
      nodes: {},
      lineageOffsets: {},
      forceNodes: {},
      forceSavedView: { '1': { x: 120, pinned: true } },
      forceSavedViews: {},
    }
    const views = migrateForceSavedViews(forceView)
    expect(views).toEqual({
      [DEFAULT_FORCE_VIEW_PRESET]: { '1': { x: 120, pinned: true } },
    })
  })

  it('merges auto layout with session overrides', () => {
    expect(
      mergeForcePositions(
        { a: { x: 10 }, b: { x: 20 } },
        { b: { x: 99, pinned: true } },
      ),
    ).toEqual({
      a: { x: 10 },
      b: { x: 99, pinned: true },
    })
  })

  it('init does not auto-load first preset without activeForceViewName', () => {
    const result = initForceViewsFromVault({
      nodes: {},
      lineageOffsets: {},
      forceNodes: { '1': { x: 100 } },
      forceSavedView: {},
      forceSavedViews: {
        Můj: { '1': { x: 200 } },
        Druhý: { '2': { x: 300 } },
      },
    })
    expect(result.activeName).toBeNull()
    expect(result.sessionNodes).toEqual({})
  })

  it('init restores active preset when stored in layout', () => {
    const result = initForceViewsFromVault({
      nodes: {},
      lineageOffsets: {},
      forceNodes: {},
      forceSavedView: {},
      forceSavedViews: { Můj: { '1': { x: 200 } } },
      activeForceViewName: 'Můj',
    })
    expect(result.activeName).toBe('Můj')
    expect(result.sessionNodes).toEqual({ '1': { x: 200 } })
  })
})
