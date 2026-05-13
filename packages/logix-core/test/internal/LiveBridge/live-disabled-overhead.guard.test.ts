import { describe, expect, it } from 'vitest'

import { createLiveAttachmentRegistry } from '../../../src/internal/live-bridge-api.js'

describe('live bridge disabled overhead guard', () => {
  it('does not allocate capture buffer on disabled path', () => {
    const registry = createLiveAttachmentRegistry({ enabled: false })

    expect(registry.getDiagnostics()).toEqual({
      captureBufferAllocations: 0,
      transportAllocations: 0,
      operationRequests: 0,
    })

    const capture = registry.openCaptureWindow({
      actorId: 'agent',
      operationKind: 'capture.eventWindow',
      target: { runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' },
      budget: { maxEvents: 16, maxInlineBytes: 4096 },
      redactionPolicyRef: 'default',
    })

    expect(capture.kind).toBe('evidence.gap')
    expect(registry.getDiagnostics()).toEqual({
      captureBufferAllocations: 0,
      transportAllocations: 0,
      operationRequests: 1,
    })
  })
})
