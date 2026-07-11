import { describe, it, expect } from 'vitest'
import { mergeVaultMetaFiles } from '@/lib/storage/vault-merge'

describe('mergeVaultMetaFiles', () => {
  it('prefers cached config and layout over defaults', () => {
    const files = new Map([
      ['.family-tree/config.yaml', 'default-config'],
      ['.family-tree/layout.json', '{"version":1,"views":{}}'],
      ['people/a.md', 'person'],
    ])
    const cached = new Map([
      ['.family-tree/config.yaml', 'cached-config'],
      ['.family-tree/layout.json', '{"version":1,"views":{"force":{}}}'],
    ])

    mergeVaultMetaFiles(files, cached, null)

    expect(files.get('.family-tree/config.yaml')).toBe('cached-config')
    expect(files.get('.family-tree/layout.json')).toContain('"force"')
    expect(files.get('people/a.md')).toBe('person')
  })

  it('falls back to disk when cache is missing', () => {
    const files = new Map([
      ['.family-tree/config.yaml', 'default-config'],
      ['.family-tree/layout.json', '{}'],
    ])
    const disk = new Map([
      ['.family-tree/config.yaml', 'disk-config'],
    ])

    mergeVaultMetaFiles(files, null, disk)

    expect(files.get('.family-tree/config.yaml')).toBe('disk-config')
  })
})
