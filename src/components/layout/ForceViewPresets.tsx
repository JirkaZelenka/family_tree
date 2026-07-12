import { useCallback, useMemo, useState } from 'react'
import { Bookmark, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLayoutStore } from '@/stores/layout-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ForceViewPresetsProps {
  onLoaded?: () => void
}

export function ForceViewPresets({ onLoaded }: ForceViewPresetsProps) {
  const { t } = useTranslation()
  const forceSavedViews = useLayoutStore((s) => s.forceSavedViews)
  const activeForceViewName = useLayoutStore((s) => s.activeForceViewName)
  const saveForceViewPreset = useLayoutStore((s) => s.saveForceViewPreset)
  const loadForceViewPreset = useLayoutStore((s) => s.loadForceViewPreset)
  const renameForceViewPreset = useLayoutStore((s) => s.renameForceViewPreset)
  const deleteForceViewPreset = useLayoutStore((s) => s.deleteForceViewPreset)

  const presetNames = useMemo(
    () => Object.keys(forceSavedViews).sort((a, b) => a.localeCompare(b, 'cs')),
    [forceSavedViews],
  )

  const [open, setOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleSave = useCallback(() => {
    const name = saveName.trim()
    if (!name) return
    if (presetNames.includes(name)) {
      const ok = window.confirm(t('layout.forceViewOverwrite', { name }))
      if (!ok) return
    }
    if (saveForceViewPreset(name)) {
      setSaveName('')
    }
  }, [presetNames, saveForceViewPreset, saveName, t])

  const handleLoad = useCallback(
    (name: string) => {
      if (loadForceViewPreset(name)) {
        onLoaded?.()
        setOpen(false)
      }
    },
    [loadForceViewPreset, onLoaded],
  )

  const handleDelete = useCallback(
    (name: string) => {
      const ok = window.confirm(t('layout.forceViewDeleteConfirm', { name }))
      if (!ok) return
      deleteForceViewPreset(name)
    },
    [deleteForceViewPreset, t],
  )

  const handleRename = useCallback(() => {
    if (!renameTarget) return
    const next = renameValue.trim()
    if (!next) return
    if (presetNames.includes(next) && next !== renameTarget) {
      window.alert(t('layout.forceViewNameTaken', { name: next }))
      return
    }
    if (renameForceViewPreset(renameTarget, next)) {
      setRenameTarget(null)
      setRenameValue('')
    }
  }, [presetNames, renameForceViewPreset, renameTarget, renameValue, t])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('layout.forceViewsTitle')}
        className="rounded-md border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-accent"
      >
        <span className="inline-flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" aria-hidden />
          {t('layout.forceViewsTitle')}
          {activeForceViewName ? (
            <span className="max-w-[8rem] truncate text-muted-foreground">
              ({activeForceViewName})
            </span>
          ) : null}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('layout.forceViewsTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('layout.forceViewSaveHint')}</p>
              <div className="flex gap-2">
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t('layout.forceViewNamePlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                  }}
                />
                <Button type="button" size="sm" onClick={handleSave}>
                  {t('layout.forceViewSave')}
                </Button>
              </div>
            </div>

            {presetNames.length > 0 ? (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {presetNames.map((name) => (
                  <li
                    key={name}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                      name === activeForceViewName ? 'bg-accent' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left hover:underline"
                      onClick={() => handleLoad(name)}
                      title={t('layout.forceViewLoad')}
                    >
                      {name}
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-background"
                      title={t('layout.forceViewRename')}
                      onClick={() => {
                        setRenameTarget(name)
                        setRenameValue(name)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-background"
                      title={t('layout.forceViewDelete')}
                      onClick={() => handleDelete(name)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('layout.forceViewEmpty')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRenameTarget(null)
            setRenameValue('')
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('layout.forceViewRename')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
              }}
            />
            <Button type="button" size="sm" onClick={handleRename}>
              {t('layout.forceViewRenameSave')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
