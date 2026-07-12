import type { PersonRecord } from '@/types/person'
import { v4 as uuidv4 } from 'uuid'

interface GedcomNode {
  id: string
  type: 'INDI' | 'FAM'
  data: Record<string, string[]>
  children: string[]
}

function parseGedcom(text: string): GedcomNode[] {
  const lines = text.split(/\r?\n/)
  const stack: GedcomNode[] = []
  const nodes: GedcomNode[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const match = line.match(/^(\d+)\s+(\S+)(?:\s+(.*))?$/)
    if (!match) continue
    const level = parseInt(match[1], 10)
    const tag = match[2]
    const value = match[3] ?? ''

    while (stack.length > level) stack.pop()

    if (level === 0 && tag.startsWith('@') && tag.endsWith('@')) {
      const node: GedcomNode = {
        id: tag.replace(/@/g, ''),
        type: 'INDI',
        data: {},
        children: [],
      }
      nodes.push(node)
      stack[0] = node
    } else if (stack.length > 0) {
      const parent = stack[stack.length - 1]
      if (!parent.data[tag]) parent.data[tag] = []
      parent.data[tag].push(value)
      if (tag === 'FAM' || tag === 'INDI') {
        const childId = value.replace(/@/g, '')
        parent.children.push(childId)
      }
    }
  }
  return nodes
}

function getName(data: Record<string, string[]>): {
  givenName: string
  familyName: string
} {
  const name = data.NAME?.[0] ?? 'Neznámý /'
  const parts = name.split('/')
  return {
    givenName: parts[0]?.trim() || 'Neznámý',
    familyName: parts[1]?.trim() || '',
  }
}

export function importGedcomToRecords(text: string): PersonRecord[] {
  const nodes = parseGedcom(text).filter((n) => n.type === 'INDI')
  const records: PersonRecord[] = []

  for (const node of nodes) {
    const { givenName, familyName } = getName(node.data)
    const birth = node.data.BIRT?.[0]
    const death = node.data.DEAT?.[0]
    const sex = node.data.SEX?.[0]?.toLowerCase()
    const gender =
      sex === 'm' ? 'male' : sex === 'f' ? 'female' : ('unknown' as const)
    const slug = `${givenName}-${familyName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    records.push({
      frontmatter: {
        id: uuidv4(),
        slug: slug || `person-${node.id}`,
        givenName,
        familyName: familyName || undefined,
        gender,
        lineage: familyName
          ? familyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          : 'unknown',
        birth: birth ? { date: birth } : undefined,
        death: death ? { date: death } : undefined,
        parents: [],
        spouses: [],
        links: [],
        internal_note: 'Importováno z GEDCOM',
        note: '',
      },
      body: '',
      filePath: `people/${slug || node.id}.md`,
    })
  }
  return records
}

export function exportRecordsToGedcom(records: PersonRecord[]): string {
  const lines: string[] = ['0 HEAD', '1 SOUR Family Tree Graph', '1 GEDC', '2 VERS 5.5.1', '1 CHAR UTF-8']
  for (const r of records) {
    const fm = r.frontmatter
    const ref = fm.id.slice(0, 8).toUpperCase()
    lines.push(`0 @I${ref}@ INDI`)
    lines.push(
      `1 NAME ${fm.givenName} /${fm.familyName ?? ''}/`,
    )
    if (fm.gender === 'male') lines.push('1 SEX M')
    if (fm.gender === 'female') lines.push('1 SEX F')
    if (fm.birth?.date) {
      lines.push('1 BIRT')
      lines.push(`2 DATE ${fm.birth.date}`)
      if (fm.birth.place) lines.push(`2 PLAC ${fm.birth.place}`)
    }
    if (fm.death?.date) {
      lines.push('1 DEAT')
      lines.push(`2 DATE ${fm.death.date}`)
      if (fm.death.place) lines.push(`2 PLAC ${fm.death.place}`)
    }
  }
  lines.push('0 TRLR')
  return lines.join('\n')
}
