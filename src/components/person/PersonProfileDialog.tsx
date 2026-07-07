import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useViewStore } from '@/stores/view-store'
import { useGraphStore } from '@/stores/graph-store'
import { PersonDetailPanel } from '@/components/person/PersonDetailPanel'

export function PersonProfileDialog() {
  const { t } = useTranslation()
  const profilePersonId = useViewStore((s) => s.profilePersonId)
  const setProfilePersonId = useViewStore((s) => s.setProfilePersonId)
  const person = useGraphStore((s) =>
    profilePersonId ? s.persons.get(profilePersonId) : undefined,
  )

  return (
    <Dialog
      open={profilePersonId !== null}
      onOpenChange={(open) => {
        if (!open) setProfilePersonId(null)
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,48rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12">
          <DialogTitle>{person?.fullName ?? t('person.profileTitle')}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PersonDetailPanel />
        </div>
      </DialogContent>
    </Dialog>
  )
}
