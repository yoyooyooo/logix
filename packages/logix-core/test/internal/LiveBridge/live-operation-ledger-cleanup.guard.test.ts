import { describe, expect, it } from 'vitest'

import {
  createLiveAttachmentRegistry,
  createLiveOperationLedgerStore,
  makeLiveTargetCoordinate,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-cleanup',
  moduleId: 'CleanupModule',
  instanceId: 'default',
})

describe('live operation ledger cleanup guard', () => {
  it('deletes target ledger stores and later reads return target-ledger-cleaned', () => {
    const ledgerStore = createLiveOperationLedgerStore({ enabled: true })
    const registry = createLiveAttachmentRegistry({ enabled: true, ledgerStore })
    registry.submitAttachmentOffer({
      attachmentId: 'attachment-clean',
      adapterKind: 'node-local',
      targets: [target],
    })

    registry.requestOperation({
      actorId: 'agent',
      operationKind: 'capture.eventWindow',
      target,
      budget: { maxEvents: 4, maxInlineBytes: 4096 },
      redactionPolicyRef: 'default',
    })
    expect(ledgerStore.getLedger(target)?.eventCount).toBe(1)

    const cleanup = registry.cleanup('attachment-clean')
    const window = ledgerStore.readWindow({ target, attachmentId: 'attachment-clean' })

    expect(cleanup).toMatchObject({
      attachmentId: 'attachment-clean',
      state: 'cleaned',
      dropped: { reason: 'cleanup.target-terminal' },
    })
    expect(ledgerStore.getLedger(target)).toBeUndefined()
    expect(window.events).toEqual([])
    expect(window.gaps).toEqual([expect.objectContaining({ code: 'target-ledger-cleaned' })])
  })
})
