import { describe, expect, it } from 'vitest'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'

describe('Runtime Workbench Run projection contract', () => {
  it('preserves null, undefined and truncation lossiness metadata in run-result preview', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        {
          kind: 'run-result',
          runId: 'run:null',
          status: 'passed',
          value: null,
          valueKind: 'null',
          lossy: false,
          sourceDigest: 'sha256:source-a',
        },
        {
          kind: 'run-result',
          runId: 'run:undefined',
          status: 'passed',
          value: null,
          valueKind: 'undefined',
          lossy: true,
          lossReasons: ['undefined-to-null'],
          sourceDigest: 'sha256:source-a',
        },
        {
          kind: 'run-result',
          runId: 'run:truncated',
          status: 'passed',
          value: '[Truncated]',
          valueKind: 'truncated',
          lossy: true,
          lossReasons: ['depth-truncated'],
          sourceDigest: 'sha256:source-a',
        },
      ],
    })

    const projectedNull = index.indexes?.artifactsById['artifact:run-result:run:null']?.preview as any
    const projectedUndefined = index.indexes?.artifactsById['artifact:run-result:run:undefined']?.preview as any
    const projectedTruncated = index.indexes?.artifactsById['artifact:run-result:run:truncated']?.preview as any

    expect(projectedNull.valueKind).toBe('null')
    expect(projectedNull.lossy).toBe(false)
    expect(projectedUndefined.valueKind).toBe('undefined')
    expect(projectedUndefined.lossy).toBe(true)
    expect(projectedUndefined.lossReasons).toContain('undefined-to-null')
    expect(projectedTruncated.valueKind).toBe('truncated')
    expect(projectedTruncated.lossReasons).toContain('depth-truncated')
  })

  it('keeps failed Run separate from value projection', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        {
          kind: 'run-result',
          runId: 'run:failure',
          status: 'failed',
          failure: { code: 'runtime', message: 'boom' },
          sourceDigest: 'sha256:source-a',
        },
      ],
    })

    const projectedFailure = index.indexes?.artifactsById['artifact:run-result:run:failure']?.preview as any
    expect(projectedFailure.status).toBe('failed')
    expect(projectedFailure.value).toBeUndefined()
    expect(projectedFailure.failure).toEqual({ code: 'runtime', message: 'boom' })
  })
})
