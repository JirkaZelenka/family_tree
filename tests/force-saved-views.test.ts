import { describe, it, expect } from 'vitest'
import {
  migrateForceSavedViews,
  mergeForcePositions,
  DEFAULT_FORCE_VIEW_PRESET,
} from '@/lib/layout/force-saved-views'
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
})
