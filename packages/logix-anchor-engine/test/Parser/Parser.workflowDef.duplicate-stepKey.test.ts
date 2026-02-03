import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'

describe('anchor-engine parser (workflow duplicate stepKey)', () => {
  it('should emit workflow_def/workflow_step duplicate_step_key reason codes', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-workflow-def')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    const wf = index.entries.find((e) => e.kind === 'WorkflowDef' && e.workflowLocalIdLiteral === 'W1')
    expect(wf).toBeTruthy()
    expect(wf?.reasonCodes ?? []).toContain('workflow_def.duplicate_step_key')

    const dupStep = index.rawMode.find((e) => e.reasonCodes.includes('workflow_step.duplicate_step_key'))
    expect(dupStep).toBeTruthy()

    const missingKeyTargets = index.entries.filter(
      (e) =>
        e.kind === 'AutofillTarget' &&
        e.target.kind === 'workflow' &&
        e.target.workflowLocalIdLiteral === 'W1' &&
        Boolean(e.missing.workflowStepKey),
    )
    expect(missingKeyTargets.length).toBeGreaterThan(0)
  })
})

