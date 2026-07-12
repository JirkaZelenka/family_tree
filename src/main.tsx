import { createRoot } from 'react-dom/client'
import '@/i18n'
import { initTheme } from '@/lib/theme'
import '@/index.css'
import { Bootstrap } from '@/Bootstrap'

initTheme()

createRoot(document.getElementById('root')!).render(<Bootstrap />)
