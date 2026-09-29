import { useCallback } from 'react'
import { useVaultStore } from '@/stores/vault-store'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useLayoutStore, initForceViewsFromVault } from '@/stores/layout-store'
import {
  pickVaultDirectory,
  loadVaultFromDirectory,
  importZipVault,
  loadCachedVaultFiles,
  cacheVaultFiles,
  clearCachedVault,
} from '@/lib/storage'
import { mergeVaultMetaFiles } from '@/lib/storage/vault-merge'
import { readDevVaultMetaFiles } from '@/lib/storage/vault-persist'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { getYearRange, parseYear } from '@/lib/time/dates'
import { loadSampleVaultFileMap } from '@/lib/data/sample-vault-files'

async function loadSampleFiles(): Promise<Map<string, string>> {
  return loadSampleVaultFileMap()
}

function applyVault(vault: Awaited<ReturnType<typeof loadVaultFromFileMap>>, fileMap: Map<string, string>) {
  useVaultStore.getState().setVault(vault, fileMap)
  useGraphStore.getState().loadFromRecords(vault.people)
  const birthYears = vault.people.map((p) => parseYear(p.frontmatter.birth?.date))
  const deathYears = vault.people.map((p) => parseYear(p.frontmatter.death?.date))
  const { min, max } = getYearRange(birthYears, deathYears)
  useTimeStore.getState().setYearRange(min, max)
  useTimeStore.getState().setCurrentYear(max)
  useTimeStore.getState().setSphereHighlightByYear(false)
  const sphereLayout = vault.layout.views.sphere ?? { nodes: {}, lineageOffsets: {} }
  const forceView = vault.layout.views.force ?? {
    nodes: {},
    lineageOffsets: {},
    forceNodes: {},
    forceSavedView: {},
    forceSavedViews: {},
  }
  useLayoutStore.getState().setSavedLayout(sphereLayout)
  const { views, activeName, sessionNodes } = initForceViewsFromVault(forceView)
  useLayoutStore.getState().setForceSavedViews(views, activeName)
  useLayoutStore.setState({
    sessionForceNodes: sessionNodes,
    forceAutoLayout: { ...sessionNodes },
    forceLayoutRevision: useLayoutStore.getState().forceLayoutRevision + 1,
  })
}

export function useVaultActions() {
  const vault = useVaultStore((s) => s.vault)

  const openFolder = useCallback(async () => {
    const handle = await pickVaultDirectory()
    if (!handle) return
    useVaultStore.getState().setDirectoryHandle(handle)
    const { vault, files } = await loadVaultFromDirectory(handle)
    applyVault(vault, files)
  }, [])

  const importZip = useCallback(async (file: File) => {
    const { vault, files } = await importZipVault(file)
    applyVault(vault, files)
  }, [])

  const loadSampleData = useCallback(async (clearCache = true): Promise<{
    ok: boolean
    message?: string
  }> => {
    try {
      let cached: Map<string, string> | null = null
      if (clearCache) {
        await clearCachedVault()
      } else {
        cached = await loadCachedVaultFiles()
      }

      const files = await loadSampleFiles()
      const diskMeta = clearCache ? null : await readDevVaultMetaFiles()
      mergeVaultMetaFiles(files, cached, diskMeta, import.meta.env.DEV)

      if (files.size === 0) {
        return {
          ok: false,
          message: 'Soubory ukázkových dat nebyly nalezeny. Zkuste restart dev serveru.',
        }
      }
      const vault = await loadVaultFromFileMap(files)
      if (vault.people.length === 0) {
        console.error('Ukázková data se nepodařilo načíst', vault.diagnostics)
        return {
          ok: false,
          message:
            vault.diagnostics[0] ??
            `Nepodařilo se načíst žádnou osobu (${files.size} souborů v balíčku).`,
        }
      }
      await cacheVaultFiles(files)
      applyVault(vault, files)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      }
    }
  }, [])

  const tryLoadCache = useCallback(async () => {
    const cached = await loadCachedVaultFiles()
    if (cached && cached.size > 0) {
      const vault = await loadVaultFromFileMap(cached)
      if (vault.people.length > 0) {
        applyVault(vault, cached)
        return true
      }
      await clearCachedVault()
    }
    return false
  }, [])

  return {
    loaded: !!vault,
    openFolder,
    importZip,
    loadSampleData,
    tryLoadCache,
  }
}
