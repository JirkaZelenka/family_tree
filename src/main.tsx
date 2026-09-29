import { createRoot } from 'react-dom/client'
import '@/i18n'
import { initTheme } from '@/lib/theme'
import '@/index.css'
import { AuthGate } from '@/components/auth/AuthGate'
import { Bootstrap } from '@/Bootstrap'

initTheme()

createRoot(document.getElementById('root')!).render(
  <AuthGate>
    <Bootstrap />
  </AuthGate>,
)
