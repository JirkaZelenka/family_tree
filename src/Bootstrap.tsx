import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useVaultActions } from '@/hooks/useVaultActions'
import { useGraphStore } from '@/stores/graph-store'
import { useVaultStore } from '@/stores/vault-store'

export function Bootstrap() {
  const vault = useVaultActions()

  useEffect(() => {
    void (async () => {
      useVaultStore.getState().setBootstrapping(true)
      try {
        if (import.meta.env.DEV) {
          await vault.loadSampleData()
        } else {
          const fromCache = await vault.tryLoadCache()
          if (!fromCache || useGraphStore.getState().persons.size === 0) {
            await vault.loadSampleData()
          }
        }
      } finally {
        useVaultStore.getState().setBootstrapping(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <AppShell />
}
