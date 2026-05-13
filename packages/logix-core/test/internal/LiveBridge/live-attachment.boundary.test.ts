import { describe, expect, it } from 'vitest'

import {
  createLiveAttachmentRegistry,
  createLiveOperationLedgerStore,
  makeLiveAttachmentState,
  makeLiveTargetCoordinate,
  type LiveOperationRequest,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' })

describe('live attachment boundary', () => {
  it('normalizes target coordinates and keeps attachment lifecycle explicit', () => {
    expect(makeLiveTargetCoordinate({ runtimeId: ' runtime-1 ', moduleId: 'module-1', instanceId: 'instance-1' })).toEqual({
      runtimeId: 'runtime-1',
      moduleId: 'module-1',
      instanceId: 'instance-1',
    })

    expect(makeLiveAttachmentState({ attachmentId: 'attachment-1', state: 'disabled' }).state).toBe('disabled')
  })

  it('does not put verdict or repair advice in operation requests', () => {
    const request: LiveOperationRequest = {
      actorId: 'agent',
      operationKind: 'target.discover',
      target,
      budget: { maxEvents: 0, maxInlineBytes: 0 },
      redactionPolicyRef: 'default',
    }

    expect(JSON.stringify(request)).not.toMatch(/repairHints|nextRecommendedStage|verdict/)
  })

  it('returns static-empty capability when disabled', () => {
    const registry = createLiveAttachmentRegistry({ enabled: false })

    expect(registry.getCapabilities()).toEqual({
      enabled: false,
      canAttach: false,
      canCapture: false,
      canMutate: false,
      reason: 'bridge-disabled',
    })
    expect(registry.listTargets()).toEqual([])
  })

  it('keeps revoked and disconnected attachments terminal', () => {
    const registry = createLiveAttachmentRegistry({ enabled: true })
    registry.submitAttachmentOffer({
      attachmentId: 'attachment-1',
      adapterKind: 'node-local',
      targets: [target],
    })

    registry.markTerminal('attachment-1', 'revoked')
    expect(registry.getAttachmentState('attachment-1')?.state).toBe('revoked')

    registry.submitAttachmentOffer({
      attachmentId: 'attachment-1',
      adapterKind: 'node-local',
      targets: [makeLiveTargetCoordinate({ runtimeId: 'runtime-2', moduleId: 'module-2', instanceId: 'instance-2' })],
    })

    expect(registry.getAttachmentState('attachment-1')?.state).toBe('revoked')
    expect(registry.listTargets()).toEqual([])

    const denied = registry.requestOperation({
      actorId: 'agent',
      operationKind: 'dispatch.declaredAction',
      target,
      actionTag: 'submit',
      manifestDigest: 'manifest:a',
      validatorAvailable: true,
      permissionScope: 'debug:dispatch',
      budget: { maxEvents: 1, maxInlineBytes: 128 },
      redactionPolicyRef: 'default',
    })

    expect(denied.kind).toBe('operation.denied')
    const deniedFacet = denied as Extract<typeof denied, { readonly kind: 'operation.denied' }>
    expect(deniedFacet.noMutation).toBe(true)
    expect(deniedFacet.reason).toBe('terminal-attachment')
  })

  it('records cleanup evidence drainage instead of silently dropping active evidence', () => {
    const registry = createLiveAttachmentRegistry({ enabled: true })
    registry.submitAttachmentOffer({
      attachmentId: 'attachment-1',
      adapterKind: 'node-local',
      targets: [target],
      pendingEvidenceRefs: ['capture:1'],
    })

    expect(registry.cleanup('attachment-1')).toEqual({
      attachmentId: 'attachment-1',
      state: 'cleaned',
      drainedEvidenceRefs: ['capture:1'],
    })
    expect(registry.getAttachmentState('attachment-1')?.state).toBe('cleaned')
  })

  it('cleans target ledger stores and returns terminal gaps instead of stale windows', () => {
    const ledgerStore = createLiveOperationLedgerStore({ enabled: true })
    const registry = createLiveAttachmentRegistry({ enabled: true, ledgerStore })
    registry.submitAttachmentOffer({
      attachmentId: 'attachment-1',
      adapterKind: 'node-local',
      targets: [target],
    })

    registry.requestOperation({
      actorId: 'agent',
      operationKind: 'target.discover',
      target,
      budget: { maxEvents: 8, maxInlineBytes: 4096 },
      redactionPolicyRef: 'default',
    })
    expect(ledgerStore.readWindow({ target }).events).toHaveLength(1)

    registry.cleanup('attachment-1')
    const afterCleanup = ledgerStore.readWindow({ target })

    expect(ledgerStore.getLedger(target)).toBeUndefined()
    expect(afterCleanup.events).toEqual([])
    expect(afterCleanup.gaps).toEqual([expect.objectContaining({ code: 'target-ledger-cleaned' })])
  })
})
