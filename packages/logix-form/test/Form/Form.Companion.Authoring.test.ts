import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import * as Resource from '../../../logix-core/src/Resource.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 40)
    }),
)

describe('Form companion authoring', () => {
  it.effect('supports field(path).companion({ deps, lower }) as a public define route', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        profileId: Schema.String,
      })

      const OptionSchema = Schema.Struct({
        id: Schema.String,
        name: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile.companion',
        keySchema: KeySchema,
        load: ({ profileId }) =>
          Effect.succeed([
            Schema.decodeUnknownSync(OptionSchema)({
              id: `${profileId}-1`,
              name: `Profile ${profileId} · 1`,
            }),
            Schema.decodeUnknownSync(OptionSchema)({
              id: `${profileId}-2`,
              name: `Profile ${profileId} · 2`,
            }),
          ]),
      })

      const form = Form.make(
        'Form.Companion.Authoring',
        {
          values: ValuesSchema,
          initialValues: {
            profileId: 'p1',
            profileResource: Resource.Snapshot.idle(),
          },
        },
        (define) => {
          define.field('profileResource').source({
            resource: profileResource,
            deps: ['profileId'],
            key: (profileId) => (profileId ? { profileId } : undefined),
            triggers: ['onMount', 'onKeyChange'],
          })
          ;(define.field('profileResource') as any).companion({
            deps: ['profileId'],
            lower: (ctx: any) => {
              const snapshot = ctx.source
              if (snapshot?.status !== 'success') return undefined
              return {
                availability: {
                  kind: 'interactive',
                  profileId: ctx.deps.profileId,
                },
                candidates: {
                  items: snapshot.data,
                  keepCurrent: true,
                },
              }
            },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.ui?.profileResource?.$companion).toEqual({
          availability: {
            kind: 'interactive',
            profileId: 'p1',
          },
          candidates: {
            items: [
              { id: 'p1-1', name: 'Profile p1 · 1' },
              { id: 'p1-2', name: 'Profile p1 · 2' },
            ],
            keepCurrent: true,
          },
        })

        yield* handle.field('profileId').set('')
        yield* waitForAsync

        const clearedState: any = yield* handle.getState
        expect(clearedState.ui?.profileResource?.$companion).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('materializes source-less companion on startup without marking the form dirty', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        countryId: Schema.String,
      })

      const form = Form.make(
        'Form.Companion.Startup',
        {
          values: ValuesSchema,
          initialValues: {
            countryId: 'CN',
          },
        },
        (define) => {
          define.field('countryId').companion({
            deps: ['countryId'],
            lower: (ctx) => ({
              availability: {
                kind: ctx.value ? 'interactive' : 'hidden',
              },
              candidates: {
                items: [ctx.deps.countryId],
                keepCurrent: true,
              },
            }),
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.ui?.countryId?.$companion).toEqual({
          availability: {
            kind: 'interactive',
          },
          candidates: {
            items: ['CN'],
            keepCurrent: true,
          },
        })
        expect(mountedState.$form?.isDirty).toBe(false)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('keeps availability and candidates out of submit final truth', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        countryId: Schema.String,
      })

      const form = Form.make(
        'Form.Companion.SoftFactNotFinalTruth',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            countryId: '',
          },
        },
        (define) => {
          define.field('countryId').companion({
            deps: ['countryId'],
            lower: () => ({
              availability: {
                kind: 'hidden',
              },
              candidates: {
                items: [],
                keepCurrent: false,
              },
            }),
          })
          define.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.ui?.countryId?.$companion).toEqual({
          availability: {
            kind: 'hidden',
          },
          candidates: {
            items: [],
            keepCurrent: false,
          },
        })
        expect(mountedState.errors?.countryId).toBeUndefined()
        expect(mountedState.$form?.errorCount).toBe(0)

        let validCount = 0
        let invalidCount = 0

        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const submittedState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(0)
        expect(submittedState.errors?.countryId).toBeUndefined()
        expect(submittedState.$form.submitAttempt).toEqual({
          seq: 1,
          reasonSlotId: 'submit:1',
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
            evidence: {
              reasonSlotId: 'submit:1',
              sourceRef: '$form.submitAttempt',
              family: 'none',
              scope: 'submit',
              blockingBasis: 'none',
              errorCount: 0,
              pendingCount: 0,
            },
          },
          compareFeed: {
            reasonSlotId: 'submit:1',
            verdict: 'ok',
            decodedVerdict: 'valid',
            blockingBasis: 'none',
            errorCount: 0,
            pendingCount: 0,
            evidence: {
              reasonSlotId: 'submit:1',
              sourceRef: '$form.submitAttempt',
              family: 'none',
              scope: 'submit',
              blockingBasis: 'none',
              errorCount: 0,
              pendingCount: 0,
            },
          },
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
