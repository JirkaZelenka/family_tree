import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGraphStore } from '@/stores/graph-store'
import { computeKinship } from '@/lib/relationships/kinship'

export function KinshipDialog() {
  const { t } = useTranslation()
  const graph = useGraphStore((s) => s.graph)
  const persons = useGraphStore((s) => s.persons)
  const [personA, setPersonA] = useState('')
  const [personB, setPersonB] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const personList = [...persons.values()].filter((p) => !p.redacted)

  const calculate = () => {
    if (!graph || !personA || !personB) return
    const kinship = computeKinship(graph, personA, personB)
    if (!kinship) {
      setResult('—')
      return
    }
    setResult(
      t('kinship.result', {
        label: kinship.labelCs,
        degree: kinship.degree,
      }),
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t('kinship.title')}>
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('kinship.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('kinship.personA')}</Label>
            <Select value={personA} onValueChange={setPersonA}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {personList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('kinship.personB')}</Label>
            <Select value={personB} onValueChange={setPersonB}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {personList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={calculate}>{t('kinship.calculate')}</Button>
          {result && <p className="text-sm">{result}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
