export const VAULT_META_PATHS = [
  '.family-tree/config.yaml',
  '.family-tree/layout.json',
] as const

export type VaultMetaPath = (typeof VAULT_META_PATHS)[number]

/** Sloučí čerstvá data s uloženým configem a layoutem. V dev preferuje disk před cache. */
export function mergeVaultMetaFiles(
  files: Map<string, string>,
  cached: Map<string, string> | null | undefined,
  disk: Map<string, string> | null | undefined,
  preferDisk = false,
): void {
  for (const metaPath of VAULT_META_PATHS) {
    const fromCache = cached?.get(metaPath)
    const fromDisk = disk?.get(metaPath)
    const merged = preferDisk
      ? (fromDisk ?? fromCache ?? files.get(metaPath))
      : (fromCache ?? fromDisk ?? files.get(metaPath))
    if (merged !== undefined) {
      files.set(metaPath, merged)
    }
  }
}
