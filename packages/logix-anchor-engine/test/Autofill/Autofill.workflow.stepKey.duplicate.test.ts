import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { autofillAnchors } from '../../src/Autofill.js'
import { buildAnchorIndex } from '../../src/Parser.js'

describe('079 workflow stepKey autofill (duplicate keys)', () => {
  it('should refuse write-back when duplicate stepKey exists', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-workflow-def')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const out = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r1', anchorIndex: index }))

    const decision = out.report.changes
      .flatMap((c) => c.decisions)
      .find((d) => d.kind === 'workflow.stepKey' && d.status === 'skipped')

    expect(decision && (decision as any).reason?.code).toBe('duplicate_step_key')
  })
})

