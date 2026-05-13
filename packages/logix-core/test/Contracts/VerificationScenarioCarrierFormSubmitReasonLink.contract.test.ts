import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../../logix-form/src/index.js'
import * as Resource from '../../src/Resource.js'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import {
  emitScenarioFormMultiSubmitLinkFixture,
  emitScenarioFormSubmitLinkFixture,
} from '../internal/verification/fixtures/scenarioCarrierReasonLinkFixture.js'
import { materializeExtendedHandle } from '../../../logix-form/test/support/form-harness.js'

describe('Verification scenario carrier Form submit reason-link contract', () => {
  it.effect('links a real Form submit reasonSlotId to the scenario carrier feed', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        warehouseId: Schema.String,
      })
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
        warehouseResource: Schema.Unknown,
      })
      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const warehouseResource = Resource.make({
        id: 'warehouse/submit-link',
        keySchema: KeySchema,
        load: ({ warehouseId }) => Effect.succeed({ id: warehouseId }),
      })

      const form = Form.make(
        'Form.ScenarioSubmitLink.Contract',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            items: [
              { id: 'row-1', warehouseId: 'WH-001', warehouseResource: Resource.Snapshot.idle() },
              { id: 'row-2', warehouseId: 'DUP', warehouseResource: Resource.Snapshot.idle() },
            ],
          },
        },
        (define) => {
          define.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            item: {
              deps: ['warehouseId'],
              validate: (row: { readonly warehouseId: string }) =>
                Effect.succeed(row.warehouseId === 'DUP' ? { warehouseId: 'warehouse-duplicate' } : undefined),
            },
          })
          define.field('items.warehouseResource').source({
            resource: warehouseResource,
            deps: ['items.warehouseId'],
            key: (warehouseId) => (warehouseId ? { warehouseId } : undefined),
            submitImpact: 'observe',
          })
          define.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([warehouseResource]) as Layer.Layer<any, never, never>,
      })

      const formState = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
            const handle = materializeExtendedHandle(form.tag, rt) as any
            yield* handle.submit()
            return yield* handle.getState
          }) as Effect.Effect<unknown, never, any>,
        ),
      )
      const rowRuleOutcome = (formState as any).errors?.items?.rows?.[1]?.warehouseId
      expect(rowRuleOutcome?.origin).toBe('rule')
      expect(rowRuleOutcome?.severity).toBe('error')
      expect((formState as any).$form?.submitAttempt?.reasonSlotId).toBe('submit:1')

      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:form-submit-link',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioFormSubmitLinkFixture({
            state: formState as any,
            listPath: 'items',
            rowId: 'row-2',
            fieldPath: 'warehouseId',
            evidenceFieldPath: 'warehouseResource',
            formEvidenceContract: {
              sources: [
                {
                  fieldPath: 'items[].warehouseResource',
                  bundlePatchPath: 'items[].warehouseResource',
                },
              ],
            },
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
            bundlePatchRef: 'bundlePatch:items[].warehouseResource',
            ownerRef: 'items[row-2].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
          },
        ],
      })
      expect(result.evidence.summary).toBeUndefined()
    }),
  )

  it.effect('links multiple row-scoped rule outcomes from one submit to distinct owner refs', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
        regionId: Schema.String,
        warehouseResource: Schema.Unknown,
      })
      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.ScenarioSubmitLink.MultiContract',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            items: [
              { id: 'row-1', warehouseId: 'OK', regionId: 'R1', warehouseResource: Resource.Snapshot.idle() },
              { id: 'row-2', warehouseId: 'DUP', regionId: 'R2', warehouseResource: Resource.Snapshot.idle() },
              { id: 'row-3', warehouseId: 'OK2', regionId: 'BAD', warehouseResource: Resource.Snapshot.idle() },
            ],
          },
        },
        (define) => {
          define.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            item: {
              deps: ['warehouseId', 'regionId'],
              validate: (row: { readonly warehouseId: string; readonly regionId: string }) =>
                Effect.succeed({
                  ...(row.warehouseId === 'DUP' ? { warehouseId: 'warehouse-duplicate' } : null),
                  ...(row.regionId === 'BAD' ? { regionId: 'region-invalid' } : null),
                }),
            },
          })
          define.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const formState = yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
            const handle = materializeExtendedHandle(form.tag, rt) as any
            yield* handle.submit()
            return yield* handle.getState
          }) as Effect.Effect<unknown, never, any>,
        ),
      )

      expect((formState as any).errors?.items?.rows?.[1]?.warehouseId?.origin).toBe('rule')
      expect((formState as any).errors?.items?.rows?.[2]?.regionId?.origin).toBe('rule')
      expect((formState as any).$form?.submitAttempt?.reasonSlotId).toBe('submit:1')

      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:form-multi-submit-link',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioFormMultiSubmitLinkFixture({
            state: formState as any,
            formEvidenceContract: {
              sources: [
                {
                  fieldPath: 'items[].warehouseResource',
                  bundlePatchPath: 'items[].warehouseResource',
                },
              ],
            },
            targets: [
              {
                listPath: 'items',
                rowId: 'row-2',
                fieldPath: 'warehouseId',
                evidenceFieldPath: 'warehouseResource',
              },
              {
                listPath: 'items',
                rowId: 'row-3',
                fieldPath: 'regionId',
                evidenceFieldPath: 'warehouseResource',
              },
            ],
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
            bundlePatchRef: 'bundlePatch:items[].warehouseResource',
            ownerRef: 'items[row-2].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
          },
          {
            kind: 'reason-link',
            reasonSlotId: 'submit:1',
            bundlePatchRef: 'bundlePatch:items[].warehouseResource',
            ownerRef: 'items[row-3].regionId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-3',
          },
        ],
      })
      expect(result.evidence.summary).toBeUndefined()
    }),
  )
})
