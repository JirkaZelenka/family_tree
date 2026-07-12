import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { viewRegistry } from '@/views/registry'
import { useViewStore } from '@/stores/view-store'
import { Toolbar } from './Toolbar'
import { PersonTreeSidebar } from '@/components/person/PersonTreeSidebar'
import { LineageSidebar } from '@/components/lineage/LineageSidebar'
import { PersonProfileDialog } from '@/components/person/PersonProfileDialog'
import { TimeSliderBar } from '@/components/shared/TimeSliderBar'
import { CommandPalette } from '@/components/search/CommandPalette'
import { PersonHoverTooltip } from '@/components/shared/PersonHoverTooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useVaultActions } from '@/hooks/useVaultActions'
import { useUrlState } from '@/hooks/useUrlState'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useVaultStore } from '@/stores/vault-store'

export function AppShell() {
  const { t } = useTranslation()
  const activeView = useViewStore((s) => s.activeView)
  const vault = useVaultActions()
  const isBootstrapping = useVaultStore((s) => s.isBootstrapping)
  useUrlState()
  useAutoSave()

  const zipInputRef = useRef<HTMLInputElement>(null)
  const gedcomInputRef = useRef<HTMLInputElement>(null)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [sampleError, setSampleError] = useState<string | null>(null)

  const handleLoadSample = useCallback(async () => {
    setSampleLoading(true)
    setSampleError(null)
    const result = await vault.loadSampleData()
    if (!result.ok) {
      setSampleError(result.message ?? 'Načtení ukázkových dat selhalo.')
    }
    setSampleLoading(false)
  }, [vault])

  const ActiveView = viewRegistry.find((v) => v.id === activeView)?.Component

  const handleImportZip = useCallback(() => {
    zipInputRef.current?.click()
  }, [])

  const handleImportGedcom = useCallback(() => {
    gedcomInputRef.current?.click()
  }, [])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
        <h1 className="text-2xl font-bold">{t('app.title')}</h1>
        <p className="text-muted-foreground">{t('app.loading')}</p>
      </div>
    )
  }

  if (!vault.loaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">{t('app.title')}</h1>
        <p className="text-muted-foreground">{t('app.noVault')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={vault.openFolder}
          >
            {t('toolbar.openFolder')}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2 text-sm"
            onClick={handleImportZip}
          >
            {t('toolbar.importZip')}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
            disabled={sampleLoading}
            onClick={() => void handleLoadSample()}
          >
            {sampleLoading ? 'Načítám…' : 'Ukázková data'}
          </button>
        </div>
        {sampleError && (
          <p className="max-w-md text-center text-sm text-destructive">{sampleError}</p>
        )}
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) vault.importZip(f)
          }}
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Toolbar
          onOpenFolder={vault.openFolder}
          onImportZip={handleImportZip}
          onExportZip={vault.exportZip}
          onImportGedcom={handleImportGedcom}
          onExportGedcom={vault.exportGedcom}
          onSaveLayout={vault.saveLayout}
          onShareUrl={vault.shareUrl}
        />
        <div className="flex min-h-0 flex-1">
          {activeView === 'tree' && <PersonTreeSidebar />}
          <main className="relative min-w-0 flex-1">
            {ActiveView && <ActiveView className="absolute inset-0" />}
          </main>
          <LineageSidebar />
        </div>
        <TimeSliderBar />
        <CommandPalette />
        {activeView !== 'tree' && <PersonProfileDialog />}
        <PersonHoverTooltip />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) vault.importZip(f)
          }}
        />
        <input
          ref={gedcomInputRef}
          type="file"
          accept=".ged,.gedcom"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) vault.importGedcom(f)
          }}
        />
      </div>
    </TooltipProvider>
  )
}
