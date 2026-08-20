import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HighlightedBody } from './HighlightedText'
import { highlightRanges } from '@/lib/texts'
import type { TextOccurrence } from '@/types/text'

interface TextDocumentDialogProps {
  occurrence: TextOccurrence | null
  onClose: () => void
}

export function TextDocumentDialog({ occurrence, onClose }: TextDocumentDialogProps) {
  const { t } = useTranslation()
  const open = occurrence !== null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,48rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12">
          <DialogTitle>{occurrence?.document.title ?? t('texts.openFull')}</DialogTitle>
          {occurrence?.document.date && (
            <p className="text-sm text-muted-foreground">{occurrence.document.date}</p>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {occurrence && (
            <HighlightedBody
              body={occurrence.document.displayBody}
              ranges={highlightRanges(occurrence.mentions)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
