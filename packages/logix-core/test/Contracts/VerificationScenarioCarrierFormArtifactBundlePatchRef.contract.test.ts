import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import { emitScenarioFormArtifactReasonLinkFixture } from '../internal/verification/fixtures/scenarioCarrierReasonLinkFixture.js'

const leakedSourceKeys = [
  'sourceReceiptRef',
  'keyHashRef',
  'sourceSnapshotPath',
  'reasonSourceRef',
  'sourceRef',
  'bundlePatchPath',
  'formEvidenceContract',
  'sources',
  'submitAttempt',
] as const

describe('Verification scenario carrier Form artifact bundlePatchRef contract', () => {
  it.effect('derives bundlePatchRef from a Form evidence-contract artifact seed and removes the last synthetic field', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:form-artifact-bundle-patch-ref',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioFormArtifactReasonLinkFixture({
            state: {
              $form: {
                submitAttempt: {
                  reasonSlotId: 'submit:1',
                },
              },
            },
            listPath: 'items',
            rowId: 'row-2',
            fieldPath: 'warehouseId',
            formEvidenceContract: {
              submitAttempt: {
                sourceRef: '$form.submitAttempt',
                summaryRef: '$form.submitAttempt.summary',
                compareFeedRef: '$form.submitAttempt.compareFeed',
              },
              cleanupReceipts: {
                receiptPathPrefix: 'ui.$cleanup',
                reasonSlotPrefix: 'cleanup:',
                subjectRefKind: 'cleanup',
              },
              companions: [],
              sources: [
                {
                  fieldPath: 'items.warehouseId',
                  resourceId: 'demo/resource',
                  deps: ['countryId'],
                  submitImpact: 'block',
                  sourceReceiptRef: 'source:items.warehouseId',
                  sourceRef: 'items.warehouseId',
                  sourceSnapshotPath: 'items.warehouseId',
                  keyHashRef: 'items.warehouseId.keyHash',
                  reasonSourceRef: '$form.submitAttempt',
                  bundlePatchPath: 'items.warehouseId',
                },
              ],
            },
          }),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)

      const feedEvents = result.evidence.events.filter((event) => event.type === scenarioCarrierEvidenceFeedEventType)
      expect(feedEvents).toHaveLength(1)
      const payload = feedEvents[0]?.payload
      expect(payload).toEqual({
        kind: 'ScenarioCarrierEvidenceFeed',
        rows: [
          {
            kind: 'reason-link',
            reasonSlotId: 'submit:1',
            bundlePatchRef: 'bundlePatch:items.warehouseId',
            ownerRef: 'items[row-2].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
          },
        ],
      })
      expect(result.evidence.summary).toBeUndefined()

      const row = (payload as any).rows[0]
      expect(row.bundlePatchRef).toBe('bundlePatch:items.warehouseId')
      for (const key of leakedSourceKeys) {
        expect(key in row).toBe(false)
        expect(key in (payload as any)).toBe(false)
      }
    }),
  )

  it.effect('matches a pattern source artifact seed without leaking source receipt coordinates into the feed row', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:form-artifact-pattern-bundle-patch-ref',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioFormArtifactReasonLinkFixture({
            state: {
              $form: {
                submitAttempt: {
                  reasonSlotId: 'submit:2',
                },
              },
            },
            listPath: 'items',
            rowId: 'row-7',
            fieldPath: 'warehouseId',
            formEvidenceContract: {
              sources: [
                {
                  fieldPath: 'items[].warehouseId',
                  sourceReceiptRef: 'source:items[].warehouseId',
                  sourceRef: 'items[].warehouseId',
                  sourceSnapshotPath: 'items[].warehouseId',
                  keyHashRef: 'items[].warehouseId.keyHash',
                  reasonSourceRef: '$form.submitAttempt',
                  bundlePatchPath: 'items[].warehouseId',
                },
              ],
            },
          }),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)

      const feedEvents = result.evidence.events.filter((event) => event.type === scenarioCarrierEvidenceFeedEventType)
      expect(feedEvents).toHaveLength(1)
      const payload = feedEvents[0]?.payload
      expect(payload).toEqual({
        kind: 'ScenarioCarrierEvidenceFeed',
        rows: [
          {
            kind: 'reason-link',
            reasonSlotId: 'submit:2',
            bundlePatchRef: 'bundlePatch:items[].warehouseId',
            ownerRef: 'items[row-7].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-7',
          },
        ],
      })
      expect(result.evidence.summary).toBeUndefined()

      const row = (payload as any).rows[0]
      for (const key of leakedSourceKeys) {
        expect(key in row).toBe(false)
        expect(key in (payload as any)).toBe(false)
      }
    }),
  )
})
