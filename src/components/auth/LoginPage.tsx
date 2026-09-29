import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function LoginPage() {
  const { t } = useTranslation()
  const login = useAuthStore((s) => s.login)
  const error = useAuthStore((s) => s.error)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(username, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 heritage-canvas">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm space-y-5 rounded-lg border border-border p-8 shadow-sm heritage-chrome"
      >
        <div className="space-y-1 text-center">
          <h1 className="font-heritage text-2xl font-semibold tracking-wide">{t('app.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.subtitle')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-username">{t('auth.username')}</Label>
          <Input
            id="login-username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">{t('auth.password')}</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t('auth.submitting') : t('auth.submit')}
        </Button>
      </form>
    </div>
  )
}
