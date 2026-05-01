import { describe, expect, it } from 'vitest'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import { makeWorkbenchReport } from './Workbench.testkit.js'

describe('Runtime Workbench projection index contract', () => {
  it('uses sessions as the only semantic root and keeps host selection out', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report: makeWorkbenchReport(), sourceDigest: 'sha256:source-a' }],
      selectionHints: [{ kind: 'selected-session', sessionId: 'host-selection' }],
    })

    expect(Array.isArray(index.sessions)).toBe(true)
    expect('findings' in index).toBe(false)
    expect('artifacts' in index).toBe(false)
    expect('gaps' in index).toBe(false)
    expect('selectedSessionId' in index).toBe(false)
  })

  it('requires every projected node to carry authorityRef or derivedFrom', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        { kind: 'control-plane-report', report: makeWorkbenchReport(), sourceDigest: 'sha256:source-a' },
        { kind: 'run-result', runId: 'run-1', status: 'failed', failure: { message: 'boom' }, sourceDigest: 'sha256:source-a' },
      ],
    })

    const nodes = [
      ...index.sessions,
      ...Object.values(index.indexes?.findingsById ?? {}),
      ...Object.values(index.indexes?.artifactsById ?? {}),
      ...Object.values(index.indexes?.gapsById ?? {}),
      ...Object.values(index.indexes?.sourcesById ?? {}),
    ]

    expect(nodes.length).toBeGreaterThan(0)
    for (const node of nodes as ReadonlyArray<any>) {
      expect(node.authorityRef || node.derivedFrom).toBeTruthy()
    }
  })
})
