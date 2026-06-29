import { useCallback } from 'react'
import { useVaultStore } from '@/stores/vault-store'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useLayoutStore } from '@/stores/layout-store'
import {
  pickVaultDirectory,
  loadVaultFromDirectory,
  importZipVault,
  exportZipVault,
  loadCachedVaultFiles,
  cacheVaultFiles,
  clearCachedVault,
} from '@/lib/storage'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { getYearRange } from '@/lib/time/dates'
import { applyStateToUrl } from '@/lib/url/serialize'
import { useViewStore } from '@/stores/view-store'
import { importGedcomToRecords, exportRecordsToGedcom } from '@/lib/gedcom'
import { serializeLayout } from '@/lib/storage/vault-loader'
import { serializePersonMarkdown } from '@/lib/parser/markdown'
import { writeTextFile } from '@/lib/storage'
import { loadSampleVaultFileMap } from '@/lib/data/sample-vault-files'

async function loadSampleFiles(): Promise<Map<string, string>> {
  return loadSampleVaultFileMap()
}

function applyVault(vault: Awaited<ReturnType<typeof loadVaultFromFileMap>>, fileMap: Map<string, string>) {
  useVaultStore.getState().setVault(vault, fileMap)
  useGraphStore.getState().loadFromRecords(vault.people)
  const birthYears = vault.people.map((p) => {
    const y = p.frontmatter.birth?.date?.slice(0, 4)
    return y ? parseInt(y, 10) : null
  })
  const deathYears = vault.people.map((p) => {
    const y = p.frontmatter.death?.date?.slice(0, 4)
    return y ? parseInt(y, 10) : null
  })
  const { min, max } = getYearRange(birthYears, deathYears)
  useTimeStore.getState().setYearRange(min, max)
  useTimeStore.getState().setCurrentYear(max)
  useTimeStore.getState().setSphereHighlightByYear(false)
  const sphereLayout = vault.layout.views.sphere ?? { nodes: {}, lineageOffsets: {} }
  useLayoutStore.getState().setSavedLayout(sphereLayout)
}

export function useVaultActions() {
  const vault = useVaultStore((s) => s.vault)
  const savedLayout = useLayoutStore((s) => s.savedLayout)

  const openFolder = useCallback(async () => {
    const handle = await pickVaultDirectory()
    if (!handle) return
    useVaultStore.getState().setDirectoryHandle(handle)
    const data = await loadVaultFromDirectory(handle)
    const files = useVaultStore.getState().fileMap
    applyVault(data, files)
  }, [])

  const importZip = useCallback(async (file: File) => {
    const data = await importZipVault(file)
    applyVault(data, useVaultStore.getState().fileMap)
  }, [])

  const exportZip = useCallback(async () => {
    const v = useVaultStore.getState().vault
    if (!v) return
    const layout = {
      ...v.layout,
      views: { ...v.layout.views, sphere: savedLayout },
    }
    const blob = await exportZipVault({ ...v, layout })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'family-tree-vault.zip'
    a.click()
  }, [savedLayout])

  const importGedcom = useCallback(async (file: File) => {
    const text = await file.text()
    const records = importGedcomToRecords(text)
    const fileMap = new Map<string, string>()
    for (const r of records) {
      fileMap.set(r.filePath, serializePersonMarkdown(r))
    }
    const vaultData = await loadVaultFromFileMap(fileMap)
    applyVault(vaultData, fileMap)
  }, [])

  const exportGedcom = useCallback(() => {
    const v = useVaultStore.getState().vault
    if (!v) return
    const gedcom = exportRecordsToGedcom(v.people)
    const blob = new Blob([gedcom], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'family-tree.ged'
    a.click()
  }, [])

  const saveLayout = useCallback(async () => {
    const v = useVaultStore.getState().vault
    if (!v) return
    const layout = {
      version: 1 as const,
      views: { ...v.layout.views, sphere: savedLayout },
    }
    const content = serializeLayout(layout)
    useVaultStore.getState().updateLayout(content)
    const handle = useVaultStore.getState().directoryHandle
    if (handle) {
      await writeTextFile(handle, '.family-tree/layout.json', content)
      useVaultStore.getState().setSaveStatus('saved')
    }
  }, [savedLayout])

  const shareUrl = useCallback(() => {
    const activeView = useViewStore.getState().activeView
    const sel = useGraphStore.getState().selectedId
    const year = useTimeStore.getState().currentYear
    applyStateToUrl({
      view: activeView,
      sel: sel ?? undefined,
      year,
    })
    navigator.clipboard.writeText(window.location.href)
  }, [])

  const loadSampleData = useCallback(async (): Promise<{
    ok: boolean
    message?: string
  }> => {
    try {
      await clearCachedVault()
      const files = await loadSampleFiles()
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
    exportZip,
    importGedcom,
    exportGedcom,
    saveLayout,
    shareUrl,
    loadSampleData,
    tryLoadCache,
  }
}
