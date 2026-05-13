import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import { emitScenarioRowScopedReasonLinkFixture } from '../internal/verification/fixtures/scenarioCarrierReasonLinkFixture.js'

describe('Verification scenario carrier row-scoped reason-link contract', () => {
  it.effect('derives ownerRef and row-chain coordinates from row scope input', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:row-scoped-reason-link',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioRowScopedReasonLinkFixture({
            reasonSlotId: 'submit:1',
            listPath: 'items',
            rowId: 'row-2',
            fieldPath: 'warehouseId',
            bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
          }),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)

      const feedEvents = result.evidence.events.filter((event) => event.type === scenarioCarrierEvidenceFeedEventType)
      expect(feedEvents).toHaveLength(1)
      expect(feedEvents[0]?.payload).toEqual({
        kind: 'ScenarioCarrierEvidenceFeed',
        rows: [
          {
            kind: 'reason-link',
            reasonSlotId: 'submit:1',
            bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
            ownerRef: 'items[row-2].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
          },
        ],
      })
    }),
  )
})
