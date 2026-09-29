import { describe, expect, it } from 'vitest'
import {
  applyPersonVisibility,
  lineageAccessFromUser,
  redactTextDocument,
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
    spouses: [{ id: '3', marriageDate: '10.8.1990' }],
  })
  const marieWife = record('13', 'dvorakovi', {
    givenName: 'Marie',
    familyName: 'Dvořáková',
    spouses: [{ id: '1', marriageDate: '11.9.2022' }],
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
      [jan, petr, marieMother, marieWife, frantisek],
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

  it('does not leak hidden family names on stubs', () => {
    const result = applyPersonVisibility([jan, petr, marieMother, marieWife], access)
    const wife = result.find((item) => item.frontmatter.id === '13')
    expect(wife?.frontmatter.lineage).toBe('novakovi')
    expect(wife?.frontmatter.familyName).toBe('')
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
})
