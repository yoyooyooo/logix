import { describe, expect, it } from 'vitest'

import { createLiveAttachmentRegistry, makeLiveTargetCoordinate } from '../../../src/internal/live-bridge-api.js'

describe('live target discovery', () => {
  it('lists connected runtime targets with stable coordinates from adapter offers', () => {
    const registry = createLiveAttachmentRegistry({ enabled: true })
    const target = makeLiveTargetCoordinate({ runtimeId: ' runtime-1 ', moduleId: 'module-1', instanceId: 'instance-1' })

    registry.submitAttachmentOffer({
      attachmentId: 'attachment-1',
      adapterKind: 'node-local',
      targets: [target],
    })

    expect(registry.listTargets()).toEqual([
      {
        ...target,
        attachmentId: 'attachment-1',
        adapterKind: 'node-local',
      },
    ])
  })

  it('returns an evidence gap when no runtime is attached', () => {
    const registry = createLiveAttachmentRegistry({ enabled: true })

    expect(registry.discoverTargets()).toEqual({
      kind: 'evidence.gap',
      gapId: 'live:no-runtime-attached',
      code: 'no-runtime-attached',
      severity: 'warning',
      summary: 'No live runtime target is attached.',
      stageClass: 'drilldown-only',
    })
  })
})
