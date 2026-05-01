import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import {
  type FormEvidenceContractArtifactPayload,
  formEvidenceContractArtifactKey,
} from '../../src/internal/form/artifacts.js'
import { getTrialRunArtifactExporters } from '../../../logix-core/src/internal/observability/artifacts/registry.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form reason evidence contract', () => {
  it('registers a form evidence contract artifact without introducing a second truth', () => {
    const ValuesSchema = Schema.Struct({
      profileId: Schema.String,
      profileResource: Schema.Unknown,
    })

    const form = Form.make(
      'Form.ReasonContract.Artifact',
      {
        values: ValuesSchema,
        initialValues: {
          profileId: 'u1',
          profileResource: {},
        },
      },
      (form) => {
        form.field('profileResource').source({
          resource: { id: 'user/profile.reason-contract' },
          deps: ['profileId'],
          key: (profileId) => (profileId ? { userId: profileId } : undefined),
          submitImpact: 'block',
        })
        ;(form.field('profileResource') as any).companion({
          deps: ['profileId'],
          lower: (ctx: any) =>
            ctx.source?.status === 'success'
              ? {
                  availability: { kind: 'interactive' },
                }
              : undefined,
        })
        form.submit()
      },
    )

    const exporter = getTrialRunArtifactExporters((form as any).tag).find(
      (candidate) => candidate.artifactKey === formEvidenceContractArtifactKey,
    )

    expect(exporter).toBeDefined()
    expect(
      exporter?.export({
        moduleId: 'Form.ReasonContract.Artifact',
      } as any),
    ).toEqual({
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
      companions: [
        {
          fieldPath: 'profileResource',
          deps: ['profileResource', 'profileId'],
          companionRef: 'companion:profileResource',
          sourceRef: 'profileResource',
        },
      ],
      sources: [
        {
          fieldPath: 'profileResource',
          resourceId: 'user/profile.reason-contract',
          deps: ['profileId'],
          submitImpact: 'block',
          sourceReceiptRef: 'source:profileResource',
          sourceRef: 'profileResource',
          sourceSnapshotPath: 'profileResource',
          keyHashRef: 'profileResource.keyHash',
          reasonSourceRef: '$form.submitAttempt',
          bundlePatchPath: 'profileResource',
        },
      ],
    })
  })

  it('exports row-scoped source receipt coordinates through the form evidence artifact', () => {
    const RowSchema = Schema.Struct({
      id: Schema.String,
      profileId: Schema.String,
      profileResource: Schema.Unknown,
    })

    const ValuesSchema = Schema.Struct({
      items: Schema.Array(RowSchema),
    })

    const form = Form.make(
      'Form.ReasonContract.RowScopedSourceReceipt',
      {
        values: ValuesSchema,
        initialValues: {
          items: [
            { id: 'row-1', profileId: 'u1', profileResource: {} },
            { id: 'row-2', profileId: 'u2', profileResource: {} },
          ],
        },
      },
      (form) => {
        form.list('items', {
          identity: { mode: 'trackBy', trackBy: 'id' },
        })
        form.field('items.profileResource').source({
          resource: { id: 'user/profile.row-scoped-receipt' },
          deps: ['items.profileId'],
          key: (profileId) => (profileId ? { userId: profileId } : undefined),
        })
      },
    )

    const exporter = getTrialRunArtifactExporters((form as any).tag).find(
      (candidate) => candidate.artifactKey === formEvidenceContractArtifactKey,
    )

    expect(exporter).toBeDefined()
    const artifact = exporter?.export({
      moduleId: 'Form.ReasonContract.RowScopedSourceReceipt',
    } as any) as FormEvidenceContractArtifactPayload | undefined

    expect(artifact).toBeDefined()
    expect(artifact?.sources).toContainEqual({
      fieldPath: 'items[].profileResource',
      resourceId: 'user/profile.row-scoped-receipt',
      deps: ['items[].profileId'],
      submitImpact: 'block',
      sourceReceiptRef: 'source:items[].profileResource',
      sourceRef: 'items[].profileResource',
      sourceSnapshotPath: 'items[].profileResource',
      keyHashRef: 'items[].profileResource.keyHash',
      reasonSourceRef: '$form.submitAttempt',
      bundlePatchPath: 'items[].profileResource',
    })
  })

  it.effect('keeps submit summary and compare feed on the same submitAttempt authority', () =>
    Effect.gen(function* () {
      const DecodeSchema = Schema.Struct({
        name: Schema.String.pipe(
          Schema.refine((value): value is string => value.startsWith('A'), {
            message: 'must-start-with-a',
          }),
        ),
      })

      const ValuesSchema = Schema.Struct({
        name: Schema.String,
      })

      const form = Form.make(
        'Form.ReasonEvidence.Contract',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: { name: 'Bob' },
        },
        (form) => {
          form.submit({
            decode: DecodeSchema,
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.submit()
        const invalidState: any = yield* handle.getState
        const invalidEvidence = {
          reasonSlotId: 'submit:1',
          sourceRef: '$form.submitAttempt',
          family: 'decode',
          scope: 'submit',
          blockingBasis: 'decode',
          errorCount: 0,
          pendingCount: 0,
        }
        expect(invalidState.$form.submitAttempt).toEqual({
          seq: 1,
          reasonSlotId: 'submit:1',
          verdict: 'blocked',
          decodedVerdict: 'invalid',
          blockingBasis: 'decode',
          errorCount: 0,
          pendingCount: 0,
          summary: {
            verdict: 'blocked',
            decodedVerdict: 'invalid',
            blockingBasis: 'decode',
            errorCount: 0,
            pendingCount: 0,
            evidence: invalidEvidence,
          },
          compareFeed: {
            reasonSlotId: 'submit:1',
            verdict: 'blocked',
            decodedVerdict: 'invalid',
            blockingBasis: 'decode',
            errorCount: 0,
            pendingCount: 0,
            evidence: invalidEvidence,
          },
        })

        yield* handle.field('name').set('Alice')
        yield* handle.submit()
        const validState: any = yield* handle.getState
        const validEvidence = {
          reasonSlotId: 'submit:2',
          sourceRef: '$form.submitAttempt',
          family: 'none',
          scope: 'submit',
          blockingBasis: 'none',
          errorCount: 0,
          pendingCount: 0,
        }
        expect(validState.$form.submitAttempt).toEqual({
          seq: 2,
          reasonSlotId: 'submit:2',
          verdict: 'ok',
          decodedVerdict: 'valid',
          blockingBasis: 'none',
          errorCount: 0,
          pendingCount: 0,
          summary: {
            verdict: 'ok',
            decodedVerdict: 'valid',
            blockingBasis: 'none',
            errorCount: 0,
            pendingCount: 0,
            evidence: validEvidence,
          },
          compareFeed: {
            reasonSlotId: 'submit:2',
            verdict: 'ok',
            decodedVerdict: 'valid',
            blockingBasis: 'none',
            errorCount: 0,
            pendingCount: 0,
            evidence: validEvidence,
          },
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
