import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { vaultPersistPlugin } from './vite-plugin-vault-persist'

export default defineConfig({
  plugins: [react(), tailwindcss(), vaultPersistPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/.family-tree/**', '**/data/.family-tree/**'],
    },
  },
})
