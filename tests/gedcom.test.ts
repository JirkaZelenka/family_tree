import { describe, it, expect } from 'vitest'
import { importGedcomToRecords, exportRecordsToGedcom } from '@/lib/gedcom'

const SAMPLE_GEDCOM = `0 HEAD
1 SOUR Family Tree Graph
0 @I1@ INDI
1 NAME Jan /Novák/
1 SEX M
1 BIRT
2 DATE 1850
2 PLAC Praha
1 DEAT
2 DATE 1920
0 @I2@ INDI
1 NAME Marie /Svobodová/
1 SEX F
1 BIRT
2 DATE 1855
0 TRLR
`

describe('gedcom', () => {
  it('imports individuals', () => {
    const records = importGedcomToRecords(SAMPLE_GEDCOM)
    expect(records.length).toBe(2)
    expect(records[0].frontmatter.givenName).toBe('Jan')
  })

  it('exports gedcom', () => {
    const records = importGedcomToRecords(SAMPLE_GEDCOM)
    const out = exportRecordsToGedcom(records)
    expect(out).toContain('NAME Jan')
    expect(out).toContain('0 TRLR')
  })
})
