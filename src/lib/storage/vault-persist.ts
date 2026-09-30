import { cacheVaultFiles, writeTextFile } from '@/lib/storage'
import { VAULT_META_PATHS, type VaultMetaPath } from '@/lib/storage/vault-merge'
import { useVaultStore } from '@/stores/vault-store'

async function persistMetaToDevDisk(path: VaultMetaPath, content: string): Promise<void> {
  if (!import.meta.env.DEV) return
  try {
    await fetch('/__vault/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
  } catch {
    // Dev server nemusí běžet s pluginem — IndexedDB cache zůstává záloha.
  }
}

async function persistPathToDevDisk(path: string, content: string): Promise<void> {
  if (!import.meta.env.DEV) return
  try {
    await fetch('/__vault/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
  } catch {
    // ignore
  }
}

export async function readDevVaultMetaFiles(): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  if (!import.meta.env.DEV) return files

  for (const metaPath of VAULT_META_PATHS) {
    try {
      const res = await fetch(`/__vault/read?path=${encodeURIComponent(metaPath)}`)
      if (res.ok) {
        files.set(metaPath, await res.text())
      }
    } catch {
      // ignore
    }
  }
  return files
}

export async function persistVaultFileMap(fileMap: Map<string, string>): Promise<void> {
  await cacheVaultFiles(fileMap)

  for (const metaPath of VAULT_META_PATHS) {
    const content = fileMap.get(metaPath)
    if (content) {
      await persistMetaToDevDisk(metaPath, content)
    }
  }

  const handle = useVaultStore.getState().directoryHandle
  if (handle) {
    for (const metaPath of VAULT_META_PATHS) {
      const content = fileMap.get(metaPath)
      if (content) {
        await writeTextFile(handle, metaPath, content)
      }
    }
    useVaultStore.getState().setDirty(false)
    useVaultStore.getState().setSaveStatus('saved')
  }
}

export async function persistVaultMetaPaths(
  fileMap: Map<string, string>,
  paths: readonly VaultMetaPath[],
): Promise<void> {
  await cacheVaultFiles(fileMap)
  for (const metaPath of paths) {
    const content = fileMap.get(metaPath)
    if (content) {
      await persistMetaToDevDisk(metaPath, content)
    }
  }
  const handle = useVaultStore.getState().directoryHandle
  if (handle) {
    for (const metaPath of paths) {
      const content = fileMap.get(metaPath)
      if (content) {
        await writeTextFile(handle, metaPath, content)
      }
    }
  }
}

/** Uloží markdown textu (dev disk + případně File System Access). */
export async function persistVaultTextPath(path: string, content: string): Promise<void> {
  const fileMap = new Map(useVaultStore.getState().fileMap)
  fileMap.set(path, content)
  await cacheVaultFiles(fileMap)
  await persistPathToDevDisk(path, content)
  const handle = useVaultStore.getState().directoryHandle
  if (handle) {
    await writeTextFile(handle, path, content)
  }
}
