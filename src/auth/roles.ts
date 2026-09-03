export type AppRole = 'readonly' | 'editor' | 'admin'

export interface AuthUser {
  username: string
  role: AppRole
  isAdmin: boolean
  canEditSavedViews: boolean
}

export function canEditSavedViews(user: Pick<AuthUser, 'role' | 'isAdmin' | 'canEditSavedViews'> | null | undefined): boolean {
  if (!user) return false
  if (typeof user.canEditSavedViews === 'boolean') return user.canEditSavedViews
  return user.isAdmin || user.role === 'editor'
}
