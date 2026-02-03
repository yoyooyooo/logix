import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'
import { ReasonCodes } from '../../src/internal/reasonCodes.js'

describe('anchor-engine parser (WorkflowDef)', () => {
  it('should emit WorkflowDef + WorkflowCallUse + missing stepKey targets', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-workflow-def')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    const workflows = index.entries.filter((e) => e.kind === 'WorkflowDef')
    expect(workflows.map((w) => w.workflowLocalIdLiteral)).toContain('W1')

    const callUses = index.entries.filter((e) => e.kind === 'WorkflowCallUse')
    expect(callUses.map((c) => c.serviceIdLiteral)).toContain('svc/one')

    const targets = index.entries.filter((e) => e.kind === 'AutofillTarget')
    expect(targets.some((t) => t.target.kind === 'workflow' && t.target.workflowLocalIdLiteral === 'W1')).toBe(true)

    // duplicate stepKey should be visible as RawMode (conflict; refuse to write).
    expect(index.rawMode.flatMap((x) => x.reasonCodes)).toContain(ReasonCodes.workflowStepDuplicateStepKey)
  })
})

