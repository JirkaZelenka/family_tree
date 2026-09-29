import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { useLayoutStore } from '@/stores/layout-store'

describe('saved view role guards', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      forceSavedViews: { Puvodni: { '1': { x: 120, pinned: true } } },
      sessionForceNodes: { '1': { x: 120, pinned: true } },
      forceAutoLayout: { '1': { x: 120, pinned: true } },
      activeForceViewName: 'Puvodni',
    })
  })

  it('blocks save and delete for read-only users', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        username: 'reader',
        role: 'readonly',
        isAdmin: false,
        canEditSavedViews: false,
      },
    })

    expect(useLayoutStore.getState().saveForceViewPreset('Novy')).toBe(false)
    useLayoutStore.getState().deleteForceViewPreset('Puvodni')
    expect(useLayoutStore.getState().forceSavedViews).toHaveProperty('Puvodni')
    expect(useLayoutStore.getState().forceSavedViews).not.toHaveProperty('Novy')
  })

  it('allows save and delete for editors', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        username: 'editor',
        role: 'editor',
        isAdmin: false,
        canEditSavedViews: true,
      },
    })

    expect(useLayoutStore.getState().saveForceViewPreset('Novy')).toBe(true)
    expect(useLayoutStore.getState().forceSavedViews).toHaveProperty('Novy')
    useLayoutStore.getState().deleteForceViewPreset('Novy')
    expect(useLayoutStore.getState().forceSavedViews).not.toHaveProperty('Novy')
  })
})
