import { useEffect, useRef } from 'react'
import { useVaultStore } from '@/stores/vault-store'
import { writeTextFile } from '@/lib/storage'

export function useAutoSave() {
  const isDirty = useVaultStore((s) => s.isDirty)
  const fileMap = useVaultStore((s) => s.fileMap)
  const directoryHandle = useVaultStore((s) => s.directoryHandle)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isDirty || !directoryHandle) return

    if (timerRef.current) clearTimeout(timerRef.current)
    useVaultStore.getState().setSaveStatus('saving')

    timerRef.current = window.setTimeout(async () => {
      try {
        for (const [path, content] of fileMap) {
          await writeTextFile(directoryHandle, path, content)
        }
        useVaultStore.getState().setSaveStatus('saved')
        useVaultStore.getState().setDirty(false)
      } catch {
        useVaultStore.getState().setSaveStatus('error')
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDirty, fileMap, directoryHandle])
}
