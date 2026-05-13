import { describe, expect, it } from 'vitest'

import { isLiveWireEnvelope, makeLiveWireEnvelope } from '../../../src/internal/live-bridge-api.js'

describe('live wire envelope guards', () => {
  it('accepts bounded host offers and rejects verification verdict fields', () => {
    const envelope = makeLiveWireEnvelope({
      id: 'msg-1',
      role: 'browser',
      type: 'host.offer',
      payload: {
        attachmentId: 'browser:conn-1',
        adapterKind: 'browser-dev',
        hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
        targets: [{ runtimeId: 'r', moduleId: 'm', instanceId: 'i' }],
      },
    })

    expect(isLiveWireEnvelope(envelope)).toBe(true)
    expect(isLiveWireEnvelope({ ...envelope, repairHints: [] })).toBe(false)
    expect(isLiveWireEnvelope({ ...envelope, nextRecommendedStage: 'trial' })).toBe(false)
    expect(isLiveWireEnvelope({ ...envelope, verdict: 'FAIL' })).toBe(false)
    expect(isLiveWireEnvelope({ ...envelope, primaryReportOutputKey: 'report' })).toBe(false)
  })
})
