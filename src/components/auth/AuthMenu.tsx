import { LogOut, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

export function AuthMenu() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!user) return null

  return (
    <div className="flex items-center gap-1">
      <span className="hidden max-w-[9rem] truncate px-1 text-xs text-muted-foreground sm:inline" title={user.username}>
        {user.username}
        <span className="ml-1 opacity-80">({t(`auth.role.${user.role}`)})</span>
      </span>
      {user.isAdmin ? (
        <Button variant="ghost" size="icon" asChild title={t('auth.admin')}>
          <a href="/admin/" target="_blank" rel="noreferrer">
            <Shield className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t('auth.admin')}</span>
          </a>
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void logout()}
        title={t('auth.logout')}
        aria-label={t('auth.logout')}
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
}
