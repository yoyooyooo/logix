import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { autofillAnchors } from '../../src/Autofill.js'
import { buildAnchorIndex } from '../../src/Parser.js'

describe('079 autofill determinism (report)', () => {
  it('should be stable for the same input', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-autofill-services')

    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    const a = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r1', anchorIndex: index }))
    const b = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r1', anchorIndex: index }))

    expect(JSON.stringify(a.report)).toBe(JSON.stringify(b.report))
    expect(JSON.stringify(a.patchPlan)).toBe(JSON.stringify(b.patchPlan))
  })
})

