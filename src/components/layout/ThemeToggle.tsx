import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={isDark ? t('toolbar.lightMode') : t('toolbar.darkMode')}
      aria-label={isDark ? t('toolbar.lightMode') : t('toolbar.darkMode')}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  )
}
