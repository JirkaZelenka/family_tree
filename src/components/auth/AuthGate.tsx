import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LoginPage } from '@/components/auth/LoginPage'
import { useAuthStore } from '@/stores/auth-store'

export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const status = useAuthStore((s) => s.status)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 heritage-canvas">
        <h1 className="font-heritage text-3xl font-semibold tracking-wide">{t('app.title')}</h1>
        <p className="text-muted-foreground">{t('app.loading')}</p>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <LoginPage />
  }

  return children
}
