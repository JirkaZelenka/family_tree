import { describe, it, expect } from 'vitest'
import { canEditSavedViews, type AuthUser } from '@/auth/roles'

const reader: AuthUser = {
  username: 'reader',
  role: 'readonly',
  isAdmin: false,
  canEditSavedViews: false,
}

const editor: AuthUser = {
  username: 'editor',
  role: 'editor',
  isAdmin: false,
  canEditSavedViews: true,
}

const admin: AuthUser = {
  username: 'admin',
  role: 'admin',
  isAdmin: true,
  canEditSavedViews: true,
}

describe('auth roles', () => {
  it('denies saved-view edits without a user', () => {
    expect(canEditSavedViews(null)).toBe(false)
  })

  it('denies saved-view edits for read-only users', () => {
    expect(canEditSavedViews(reader)).toBe(false)
  })

  it('allows saved-view edits for editors and admins', () => {
    expect(canEditSavedViews(editor)).toBe(true)
    expect(canEditSavedViews(admin)).toBe(true)
  })
})
