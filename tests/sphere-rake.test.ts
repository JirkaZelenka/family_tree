import { describe, it, expect } from 'vitest'
import { loadSampleVaultFileMap } from '@/lib/data/sample-vault-files'
import { loadVaultFromFileMap } from '@/lib/storage/vault-loader'
import { buildGraphFromRecords } from '@/lib/graph/builder'
import { computeSphereLayout } from '@/lib/layout/sphere'
import { buildTreeEdges } from '@/lib/layout/sphere-edges'

describe('rake edges on sample data', () => {
  it('connects Jirka and Zuzana with spouse line and compact layout', async () => {
    const files = loadSampleVaultFileMap()
    const vault = await loadVaultFromFileMap(files)
    const { graph } = buildGraphFromRecords(vault.people)

    const layout = computeSphereLayout(graph, undefined, 1930, 2010)
    const segments = buildTreeEdges(graph, layout.positions, layout.lineagePlanes)

    const p1 = layout.positions.get('1')!
    const p13 = layout.positions.get('13')!
    expect(p1.displayPlane).toBe('zelenkovi')
    expect(p13.displayPlane).toBe('zelenkovi')
    expect(Math.abs(p1.layoutU - p13.layoutU)).toBeGreaterThan(0.05)
    expect(Math.abs(p1.layoutU - p13.layoutU)).toBeLessThan(0.2)

    const spouseSegs = segments.filter((s) => s.kind === 'spouse')
    const jirkaZuzana = spouseSegs.find(
      (s) =>
        (s.points[0].distanceTo({ x: p1.x, y: p1.y, z: p1.z } as never) < 0.001 ||
          s.points[1].distanceTo({ x: p1.x, y: p1.y, z: p1.z } as never) < 0.001) &&
        (s.points[0].distanceTo({ x: p13.x, y: p13.y, z: p13.z } as never) < 0.001 ||
          s.points[1].distanceTo({ x: p13.x, y: p13.y, z: p13.z } as never) < 0.001),
    )
    expect(jirkaZuzana).toBeDefined()

    const descentSegs = segments.filter((s) => s.kind === 'descent' || s.kind === 'branch')
    expect(descentSegs.length).toBeGreaterThan(0)
  })
})
