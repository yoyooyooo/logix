import { describe, expect, it } from 'vitest'
import {
  makeLiveOperationDeniedFacet,
  makeLiveTargetCoordinate,
  toWorkbenchTruthInput,
} from '@logixjs/core/repo-internal/live-bridge-api'

import { deriveDevtoolsLiveBridgeProjection } from '../../src/internal/state/liveBridgeProjection.js'

describe('DevTools live bridge projection', () => {
  it('consumes live bridge evidence through Workbench projection only', () => {
    const input = toWorkbenchTruthInput(
      makeLiveOperationDeniedFacet({
        operationId: 'op-1',
        actorId: 'agent',
        operationKind: 'dispatch.declaredAction',
        target: makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' }),
        reason: 'unauthorized-target',
      }),
    )

    const projection = deriveDevtoolsLiveBridgeProjection([input])

    expect(projection.sessions.map((session) => session.id)).toEqual([
      'session:live-evidence:runtime-1:module-1:instance-1:event:0',
    ])
    expect(Object.values(projection.indexes?.artifactsById ?? {}).map((artifact) => artifact.artifactOutputKey)).toEqual([
      'live-operation:op-1',
    ])
    expect(Object.values(projection.indexes?.findingsById ?? {}).some((finding) => finding.class === 'control-plane-finding')).toBe(false)
  })
})
