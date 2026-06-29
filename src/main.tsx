import { createRoot } from 'react-dom/client'
import '@/i18n'
import '@/index.css'
import { Bootstrap } from '@/Bootstrap'

createRoot(document.getElementById('root')!).render(<Bootstrap />)
