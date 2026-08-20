import { useTranslation } from 'react-i18next'
import {
  FolderOpen,
  FileArchive,
  Search,
  Share2,
  Save,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { viewRegistry } from '@/views/registry'
import { useViewStore } from '@/stores/view-store'
import { useSearchStore } from '@/stores/search-store'
import { useVaultStore } from '@/stores/vault-store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KinshipDialog } from '@/components/person/KinshipDialog'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

interface ToolbarProps {
  onOpenFolder: () => void
  onImportZip: () => void
  onExportZip: () => void
  onImportGedcom: () => void
  onExportGedcom: () => void
  onSaveLayout: () => void
  onShareUrl: () => void
}

export function Toolbar({
  onOpenFolder,
  onImportZip,
  onExportZip,
  onImportGedcom,
  onExportGedcom,
  onSaveLayout,
  onShareUrl,
}: ToolbarProps) {
  const { t } = useTranslation()
  const activeView = useViewStore((s) => s.activeView)
  const setActiveView = useViewStore((s) => s.setActiveView)
  const setCommandOpen = useSearchStore((s) => s.setCommandOpen)
  const saveStatus = useVaultStore((s) => s.saveStatus)

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 heritage-chrome">
      <h1 className="font-heritage text-[15px] font-semibold tracking-[0.14em] text-primary">
        {t('app.title')}
      </h1>
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <TabsList>
          {viewRegistry.map((view) => (
            <TabsTrigger key={view.id} value={view.id} className="gap-1.5">
              <view.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t(view.labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={() => setCommandOpen(true)}>
          <Search className="h-4 w-4" />
          <span className="hidden md:inline text-xs text-muted-foreground">Ctrl+K</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenFolder} title={t('toolbar.openFolder')}>
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onImportZip} title={t('toolbar.importZip')}>
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onExportZip} title={t('toolbar.exportZip')}>
          <FileArchive className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onImportGedcom}>
          GEDCOM ↓
        </Button>
        <Button variant="ghost" size="sm" onClick={onExportGedcom}>
          GEDCOM ↑
        </Button>
        <Button variant="ghost" size="icon" onClick={onSaveLayout} title={t('toolbar.saveLayout')}>
          <Save className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShareUrl} title={t('toolbar.shareUrl')}>
          <Share2 className="h-4 w-4" />
        </Button>
        <KinshipDialog />
        {saveStatus !== 'idle' && (
          <span className="text-xs text-muted-foreground">
            {t(`save.${saveStatus}`)}
          </span>
        )}
      </div>
    </header>
  )
}
