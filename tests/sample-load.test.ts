import { describe, it, expect } from 'vitest'
import { loadSampleVaultFileMap } from '@/lib/data/sample-vault-files'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { buildGraphFromRecords } from '@/lib/graph/builder'

describe('sample vault load', () => {
  it('loads user md files from data/people', async () => {
    const files = loadSampleVaultFileMap()
    const peopleMd = [...files.keys()].filter((k) => k.includes('people/') && k.endsWith('.md'))

    const vault = await loadVaultFromFileMap(files)

    console.log('md files:', peopleMd.length)
    console.log('parsed people:', vault.people.length)
    console.log('diagnostics:', vault.diagnostics)

    const { persons, diagnostics } = buildGraphFromRecords(vault.people)
    console.log('graph persons:', persons.size)
    console.log('graph diagnostics:', diagnostics)

    expect(vault.people.length).toBeGreaterThan(0)
    expect(persons.size).toBeGreaterThan(0)
  })
})
