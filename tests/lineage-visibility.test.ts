import { describe, expect, it } from 'vitest'
import {
  applyPersonVisibility,
  lineageAccessFromUser,
  redactTextDocument,
  yearOnlyDate,
  NO_ACCESS_LINEAGE,
  REDACTED_LABEL,
} from '@/auth/lineage-visibility'
import type { PersonRecord } from '@/types/person'
import type { TextDocument } from '@/types/text'

function record(
  id: string,
  lineage: string,
  extra: Partial<PersonRecord['frontmatter']> = {},
): PersonRecord {
  return {
    filePath: `people/${id}.md`,
    body: '',
    frontmatter: {
      id,
      slug: id,
      givenName: `Jmeno${id}`,
      familyName: 'Test',
      gender: 'unknown',
      lineage,
      birth: { date: '1.1.1990', place: 'Praha' },
      death: { date: '', place: '' },
      parents: [],
      spouses: [],
      moving: [],
      links: [],
      internal_note: 'tajemstvi',
      note: 'verejne',
      ...extra,
    },
  }
}

describe('lineageAccessFromUser', () => {
  it('lets admins and legacy users see every lineage', () => {
    expect(
      lineageAccessFromUser({
        username: 'a',
        role: 'admin',
        isAdmin: true,
        canEditSavedViews: true,
        allowedLineages: null,
      }).seeAll,
    ).toBe(true)
    expect(
      lineageAccessFromUser({
        username: 'e',
        role: 'editor',
        isAdmin: false,
        canEditSavedViews: true,
      }).seeAll,
    ).toBe(true)
  })

  it('restricts assigned lineages', () => {
    const access = lineageAccessFromUser({
      username: 'r',
      role: 'readonly',
      isAdmin: false,
      canEditSavedViews: false,
      allowedLineages: ['novakovi'],
    })
    expect(access.seeAll).toBe(false)
    expect(access.allowed.has('novakovi')).toBe(true)
  })
})

describe('yearOnlyDate', () => {
  it('keeps year and drops day/month', () => {
    expect(yearOnlyDate('14.2.1968')).toBe('1968')
    expect(yearOnlyDate('1968-02-14')).toBe('1968')
    expect(yearOnlyDate('?1.2.1690')).toBe('?1690')
    expect(yearOnlyDate('??1925')).toBe('??1925')
    expect(yearOnlyDate('')).toBe('')
  })
})

describe('applyPersonVisibility', () => {
  const jan = record('1', 'novakovi', {
    givenName: 'Jan',
    familyName: 'Novák',
    spouses: [{ id: '13', marriageDate: '11.9.2022' }],
    parents: ['3', '4'],
  })
  const petr = record('3', 'novakovi', { givenName: 'Petr' })
  const marieMother = record('4', 'dvorakovi', {
    givenName: 'Marie',
    familyName: 'Nováková',
    birth: { date: '10.8.1965', place: 'Brno' },
    death: { date: '5.3.2020', place: 'Praha' },
    spouses: [{ id: '3', marriageDate: '10.8.1990' }],
    parents: ['40'],
  })
  const grandma = record('40', 'dvorakovi', {
    givenName: 'Anna',
    birth: { date: '3.4.1940', place: 'Ostrava' },
  })
  const marieWife = record('13', 'dvorakovi', {
    givenName: 'Marie',
    familyName: 'Dvořáková',
    birth: { date: '2.2.1995', place: 'Plzeň' },
    spouses: [{ id: '1', marriageDate: '11.9.2022' }],
    parents: ['50', '51'],
  })
  const wifeFather = record('50', 'dvorakovi', {
    givenName: 'Karel',
    birth: { date: '1.1.1970', place: 'Plzeň' },
    death: { date: '12.12.2015', place: 'Plzeň' },
  })
  const wifeMother = record('51', 'dvorakovi', {
    givenName: 'Eva',
    birth: { date: '6.6.1972', place: 'Plzeň' },
  })
  const frantisek = record('14', 'dvorakovi', { givenName: 'František' })

  const access = lineageAccessFromUser({
    username: 'r',
    role: 'readonly',
    isAdmin: false,
    canEditSavedViews: false,
    allowedLineages: ['novakovi'],
  })

  it('keeps allowed people and redacts connected relatives as X', () => {
    const result = applyPersonVisibility(
      [jan, petr, marieMother, marieWife, frantisek, grandma, wifeFather, wifeMother],
      access,
    )
    const byId = new Map(result.map((item) => [item.frontmatter.id, item]))
    expect(byId.has('1')).toBe(true)
    expect(byId.get('1')?.redacted).toBeFalsy()
    expect(byId.get('1')?.frontmatter.givenName).toBe('Jan')
    expect(byId.get('4')?.redacted).toBe(true)
    expect(byId.get('4')?.frontmatter.givenName).toBe(REDACTED_LABEL)
    expect(byId.get('4')?.frontmatter.note).toBe('')
    expect(byId.get('13')?.redacted).toBe(true)
    expect(byId.has('14')).toBe(false)
  })

  it('keeps birth/death years without day, month, or place on stubs', () => {
    const result = applyPersonVisibility(
      [jan, petr, marieMother, marieWife, grandma, wifeFather, wifeMother],
      access,
    )
    const mother = result.find((item) => item.frontmatter.id === '4')
    expect(mother?.frontmatter.birth).toEqual({ date: '1965', place: '' })
    expect(mother?.frontmatter.death).toEqual({ date: '2020', place: '' })
    expect(mother?.frontmatter.familyName).toBe('')
  })

  it('keeps ancestor chain upward as redacted stubs', () => {
    const result = applyPersonVisibility(
      [jan, petr, marieMother, marieWife, grandma, wifeFather, wifeMother],
      access,
    )
    const byId = new Map(result.map((item) => [item.frontmatter.id, item]))
    expect(byId.get('40')?.redacted).toBe(true)
    expect(byId.get('40')?.frontmatter.birth.date).toBe('1940')
    expect(byId.get('4')?.frontmatter.parents).toEqual(['40'])
  })

  it('keeps parents and years on redacted spouse from excluded lineage', () => {
    const result = applyPersonVisibility(
      [jan, petr, marieMother, marieWife, grandma, wifeFather, wifeMother],
      access,
    )
    const byId = new Map(result.map((item) => [item.frontmatter.id, item]))
    const wife = byId.get('13')
    expect(wife?.redacted).toBe(true)
    expect(wife?.frontmatter.parents).toEqual(['50', '51'])
    expect(byId.get('50')?.redacted).toBe(true)
    expect(byId.get('50')?.frontmatter.givenName).toBe(REDACTED_LABEL)
    expect(byId.get('50')?.frontmatter.birth.date).toBe('1970')
    expect(byId.get('50')?.frontmatter.death.date).toBe('2015')
    expect(byId.get('51')?.frontmatter.birth.date).toBe('1972')
  })

  it('does not leak hidden family names on stubs', () => {
    const result = applyPersonVisibility(
      [jan, petr, marieMother, marieWife, wifeFather, wifeMother],
      access,
    )
    const wife = result.find((item) => item.frontmatter.id === '13')
    expect(wife?.frontmatter.lineage).toBe(NO_ACCESS_LINEAGE)
    expect(wife?.frontmatter.familyName).toBe('')
  })

  it('assigns all redacted relatives to the no-access lineage group', () => {
    const result = applyPersonVisibility(
      [jan, petr, marieMother, marieWife, grandma, wifeFather, wifeMother],
      access,
    )
    const redacted = result.filter((item) => item.redacted)
    expect(redacted.length).toBeGreaterThan(0)
    for (const item of redacted) {
      expect(item.frontmatter.lineage).toBe(NO_ACCESS_LINEAGE)
      expect(item.frontmatter.givenName).toBe(REDACTED_LABEL)
    }
  })
})

describe('redactTextDocument', () => {
  it('replaces hidden person and lineage mentions with X', () => {
    const people = [
      record('1', 'novakovi', { givenName: 'Jan' }),
      record('13', 'dvorakovi', { givenName: 'Marie' }),
    ]
    const displayBody = 'Jan Novák a Marie z rodu Dvořákovi.'
    const jan = 'Jan Novák'
    const marie = 'Marie'
    const lineage = 'Dvořákovi'
    const document: TextDocument = {
      id: 'svatba',
      title: 'Svatba',
      filePath: 'texts/svatba.md',
      rawContent: '',
      displayBody,
      mentions: [
        {
          kind: 'person',
          ref: '1',
          display: jan,
          start: displayBody.indexOf(jan),
          end: displayBody.indexOf(jan) + jan.length,
        },
        {
          kind: 'person',
          ref: '13',
          display: marie,
          start: displayBody.indexOf(marie),
          end: displayBody.indexOf(marie) + marie.length,
        },
        {
          kind: 'lineage',
          ref: 'dvorakovi',
          display: lineage,
          start: displayBody.indexOf(lineage),
          end: displayBody.indexOf(lineage) + lineage.length,
        },
      ],
    }
    const access = lineageAccessFromUser({
      username: 'r',
      role: 'readonly',
      isAdmin: false,
      canEditSavedViews: false,
      allowedLineages: ['novakovi'],
    })
    const redacted = redactTextDocument(document, access, people)
    expect(redacted.displayBody).toBe('Jan Novák a X z rodu X.')
    expect(redacted.displayBody).not.toContain('Marie')
    expect(redacted.displayBody).not.toContain('Dvořákovi')
    expect(redacted.mentions.filter((m) => m.display === REDACTED_LABEL)).toHaveLength(2)
  })

  it('redacts adjacent given name when bare mention only captured the surname', () => {
    const people = [
      record('13', 'spilkovi', {
        givenName: 'Zuzana',
        familyName: 'Spilková',
        gender: 'female',
      }),
    ]
    const displayBody = 'Svatba se Zuzanou Spilkovou která bydlí v Řeži.'
    const surname = 'Spilkovou'
    const start = displayBody.indexOf(surname)
    const document: TextDocument = {
      id: 'pokus',
      title: 'Pokus',
      filePath: 'texts/pokus.md',
      rawContent: '',
      displayBody,
      mentions: [
        {
          kind: 'person',
          ref: '13',
          display: surname,
          start,
          end: start + surname.length,
        },
      ],
    }
    const access = lineageAccessFromUser({
      username: 'r',
      role: 'readonly',
      isAdmin: false,
      canEditSavedViews: false,
      allowedLineages: ['novakovi'],
    })
    const redacted = redactTextDocument(document, access, people)
    expect(redacted.displayBody).toBe('Svatba se X která bydlí v Řeži.')
    expect(redacted.displayBody).not.toContain('Zuzanou')
    expect(redacted.displayBody).not.toContain('Spilkovou')
  })

  it('redacts adjacent surname when bare mention only captured the given name', () => {
    const people = [
      record('13', 'spilkovi', {
        givenName: 'Zuzana',
        familyName: 'Spilková',
        gender: 'female',
      }),
    ]
    const displayBody = 'Potkal Spilkovou Zuzanu na návštěvě.'
    const given = 'Zuzanu'
    const start = displayBody.indexOf(given)
    const document: TextDocument = {
      id: 'pokus',
      title: 'Pokus',
      filePath: 'texts/pokus.md',
      rawContent: '',
      displayBody,
      mentions: [
        {
          kind: 'person',
          ref: '13',
          display: given,
          start,
          end: start + given.length,
        },
      ],
    }
    const access = lineageAccessFromUser({
      username: 'r',
      role: 'readonly',
      isAdmin: false,
      canEditSavedViews: false,
      allowedLineages: ['novakovi'],
    })
    const redacted = redactTextDocument(document, access, people)
    expect(redacted.displayBody).toBe('Potkal X na návštěvě.')
    expect(redacted.displayBody).not.toContain('Spilkovou')
    expect(redacted.displayBody).not.toContain('Zuzanu')
  })
})
