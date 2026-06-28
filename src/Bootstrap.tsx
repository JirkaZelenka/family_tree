import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useVaultActions } from '@/hooks/useVaultActions'

export function Bootstrap() {
  const vault = useVaultActions()

  useEffect(() => {
    vault.tryLoadCache().then((loaded) => {
      if (!loaded) vault.loadSampleData()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <AppShell />
}
