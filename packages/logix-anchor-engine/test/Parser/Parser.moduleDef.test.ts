import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'

describe('anchor-engine parser (ModuleDef)', () => {
  it('should find platform-grade Module.make definitions', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-basic')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    expect(index.kind).toBe('AnchorIndex')
    expect(index.schemaVersion).toBe(1)
    expect(index.summary.modulesTotal).toBeGreaterThanOrEqual(2)

    const moduleIds = index.entries.filter((e) => e.kind === 'ModuleDef').map((e) => e.moduleIdLiteral)
    expect(moduleIds).toContain('modA')
    expect(moduleIds).toContain('modB')

    for (const e of index.entries) {
      expect(typeof e.file).toBe('string')
      expect(e.file.length).toBeGreaterThan(0)
      expect(e.span.start.line).toBeGreaterThan(0)
      expect(e.span.start.column).toBeGreaterThan(0)
      expect(e.span.start.offset).toBeGreaterThanOrEqual(0)
    }
  })
})

