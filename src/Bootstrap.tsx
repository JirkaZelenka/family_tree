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
          // V dev vždy načti aktuální soubory z data/ (cache jen pro layout).
          await vault.loadSampleData(false)
        } else {
          const fromCache = await vault.tryLoadCache()
          if (!fromCache || useGraphStore.getState().persons.size === 0) {
            await vault.loadSampleData(false)
          }
        }
      } finally {
        useVaultStore.getState().setBootstrapping(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <AppShell />
}
