import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { LayoutFileSchema } from '@/types/vault'
import { templateDataPath } from './template-paths'
import { initForceViewsFromVault, useLayoutStore } from '@/stores/layout-store'
import { migrateForceSavedViews } from '@/lib/layout/force-saved-views'

describe('loadForceViewPreset', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      sessionForceNodes: {},
      forceAutoLayout: {},
      forceSavedViews: {},
      activeForceViewName: null,
      forceLayoutRevision: 0,
    })
  })

  it('parses user layout.json with saved views', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), templateDataPath('.family-tree/layout.json')),
      'utf8',
    )
    const parsed = LayoutFileSchema.safeParse(JSON.parse(raw))
    expect(parsed.success).toBe(true)
    const forceView = parsed.data!.views.force!
    expect(Object.keys(forceView.forceSavedViews ?? {})).toContain('V4')
    expect(Object.keys(forceView.forceSavedViews ?? {})).toContain('V6')
  })

  it('loadForceViewPreset applies different x positions', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), templateDataPath('.family-tree/layout.json')),
      'utf8',
    )
    const layout = LayoutFileSchema.parse(JSON.parse(raw))
    const forceView = layout.views.force!
    const views = migrateForceSavedViews(forceView)
    const { activeName, sessionNodes } = initForceViewsFromVault({
      ...forceView,
      forceSavedViews: views,
    })

    useLayoutStore.setState({
      forceSavedViews: views,
      activeForceViewName: activeName,
      sessionForceNodes: sessionNodes,
      forceAutoLayout: { ...sessionNodes },
    })

    expect(activeName).toBe('V6')
    const v6x = useLayoutStore.getState().sessionForceNodes['37']?.x

    const loaded = useLayoutStore.getState().loadForceViewPreset('V4')
    expect(loaded).toBe(true)
    expect(useLayoutStore.getState().activeForceViewName).toBe('V4')

    const v4x = useLayoutStore.getState().sessionForceNodes['37']?.x
    expect(v4x).toBeDefined()
    expect(v4x).not.toBe(v6x)
    expect(v4x).toBe(views.V4['37'].x)
    expect(useLayoutStore.getState().pendingForceFit).toBe(true)
  })
})
