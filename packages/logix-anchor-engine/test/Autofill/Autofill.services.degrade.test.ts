import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { autofillAnchors } from '../../src/Autofill.js'
import { buildAnchorIndex } from '../../src/Parser.js'

describe('079 autofill (services degrade)', () => {
  it('should not write services when there is no confident usage evidence', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-autofill-services-degrade')

    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const out = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r1', anchorIndex: index }))

    expect(out.patchPlan.summary.operationsTotal).toBe(0)
    expect(out.report.summary.reasons).toContainEqual({ code: 'no_confident_usage', count: 1 })
  })
})

