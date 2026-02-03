import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'

describe('anchor-engine parser (missing anchors)', () => {
  it('should emit AutofillTarget entries for missing services/dev.source with stable insertSpan', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-missing-anchors')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')

    const missingServices = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingServices')
    expect(missingServices).toBeTruthy()
    expect(missingServices?.missing.services?.field).toBe('services')
    expect(missingServices?.missing.services?.insertSpan.start.offset).toBe(missingServices?.missing.services?.insertSpan.end.offset)

    const missingDevSource = targets.find((t) => t.target.kind === 'module' && t.target.moduleIdLiteral === 'missingDevSource')
    expect(missingDevSource).toBeTruthy()
    expect(missingDevSource?.missing.services).toBeUndefined()
    expect(missingDevSource?.missing.devSource?.field).toBe('source')
    expect(missingDevSource?.missing.devSource?.insertSpan.start.offset).toBe(missingDevSource?.missing.devSource?.insertSpan.end.offset)
  })
})
