import { describe, expect, it } from 'vitest'

import { createLiveAttachmentRegistry, makeLiveTargetCoordinate } from '../../../src/internal/live-bridge-api.js'

describe('live host coordinate projection', () => {
  it('keeps two browser attachments distinct even when runtime coordinates match', () => {
    const registry = createLiveAttachmentRegistry({ enabled: true })
    const target = makeLiveTargetCoordinate({
      runtimeId: 'example-runtime',
      moduleId: 'LiveBridgeFixture',
      instanceId: 'default',
    })

    registry.submitAttachmentOffer({
      attachmentId: 'browser:conn-1',
      adapterKind: 'browser-dev',
      hostCoordinate: { hostKind: 'browser', tabId: 'tab-a', projectId: 'examples/logix-react' },
      transport: { carrier: 'websocket', connectionId: 'conn-1', health: 'ready' },
      targets: [target],
    })
    registry.submitAttachmentOffer({
      attachmentId: 'browser:conn-2',
      adapterKind: 'browser-dev',
      hostCoordinate: { hostKind: 'browser', tabId: 'tab-b', projectId: 'examples/logix-react' },
      transport: { carrier: 'websocket', connectionId: 'conn-2', health: 'ready' },
      targets: [target],
    })

    expect(registry.listTargets()).toEqual([
      expect.objectContaining({
        attachmentId: 'browser:conn-1',
        hostCoordinate: expect.objectContaining({ hostKind: 'browser', tabId: 'tab-a' }),
        transport: expect.objectContaining({ carrier: 'websocket', connectionId: 'conn-1' }),
      }),
      expect.objectContaining({
        attachmentId: 'browser:conn-2',
        hostCoordinate: expect.objectContaining({ hostKind: 'browser', tabId: 'tab-b' }),
        transport: expect.objectContaining({ carrier: 'websocket', connectionId: 'conn-2' }),
      }),
    ])
  })
})
