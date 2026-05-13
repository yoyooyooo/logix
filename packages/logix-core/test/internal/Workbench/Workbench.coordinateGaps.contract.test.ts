import { describe, expect, it } from 'vitest'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import { makeWorkbenchReport } from './Workbench.testkit.js'

describe('Runtime Workbench coordinate gap contract', () => {
  it('creates gaps for missing focusRef, artifact key, source digest and debug coordinate', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        { kind: 'control-plane-report', report: makeWorkbenchReport({ artifacts: false, focusRef: false }) },
        { kind: 'debug-event-batch', batchId: 'debug-missing', events: [{ eventId: 'event-without-coordinate' }] },
      ],
    })

    const gapCodes = new Set(Object.values(index.indexes?.gapsById ?? {}).map((gap) => gap.code))
    expect(gapCodes.has('missing-focus-ref')).toBe(true)
    expect(gapCodes.has('missing-artifact-output-key')).toBe(true)
    expect(gapCodes.has('missing-source-digest')).toBe(true)
    expect(gapCodes.has('debug-event-without-stable-coordinate')).toBe(true)
  })

  it('does not treat raw source locator as source truth without digest/provenance owner', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report: makeWorkbenchReport(), sourceDigest: 'sha256:source-a' }],
      contextRefs: [{ kind: 'source-locator', locator: 'src/a.ts:1', provenance: 'host' }],
    })

    const source = Object.values(index.indexes?.sourcesById ?? {})[0]
    expect(source?.provenance).toBe('host')
    expect(source?.sourceDigest).toBeUndefined()
  })
})
