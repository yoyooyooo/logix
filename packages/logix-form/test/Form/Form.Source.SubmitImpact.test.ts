import { describe, expect, it } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import * as Resource from '../../../logix-core/src/Resource.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForLoading = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    }),
)

const waitForSettled = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 70)
    }),
)

describe('Form source submitImpact', () => {
  const KeySchema = Schema.Struct({
    userId: Schema.String,
  })

  const ValuesSchema = Schema.Struct({
    profileId: Schema.String,
    profileResource: Schema.Unknown,
  })

  const makeProfileResource = (id: string, mode: 'success' | 'failure') =>
    Resource.make({
      id,
      keySchema: KeySchema,
      load: ({ userId }) =>
        mode === 'success'
          ? Effect.sleep(Duration.millis(50)).pipe(Effect.as({ name: `resource:${userId}` }))
          : Effect.sleep(Duration.millis(50)).pipe(Effect.flatMap(() => Effect.fail(`remote-failed:${userId}`))),
    })

  const makeRuntime = (submitImpact: 'block' | 'observe', mode: 'success' | 'failure' = 'success') => {
    const profileResource = makeProfileResource(`user/profile.submit-impact.${submitImpact}.${mode}`, mode)
    const form = Form.make(
      `Form.Source.SubmitImpact.${submitImpact}.${mode}`,
      {
        values: ValuesSchema,
        initialValues: {
          profileId: 'u1',
          profileResource: Resource.Snapshot.idle(),
        },
      },
      (form) => {
        form.field('profileResource').source({
          resource: profileResource,
          deps: ['profileId'],
          key: (profileId) => (profileId ? { userId: profileId } : undefined),
          triggers: ['onMount'],
          submitImpact,
        })
        form.submit()
      },
    )

    const runtime = Logix.Runtime.make(form, {
      layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
    })

    return { form, runtime }
  }

  it.effect('observe does not block submit while loading', () =>
    Effect.gen(function* () {
      const { form, runtime } = makeRuntime('observe')

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForLoading

        const loadingState: any = yield* handle.getState
        expect(loadingState.profileResource?.status).toBe('loading')

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
        expect(submittedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(submittedState.$form.submitAttempt.pendingCount).toBe(0)
        expect(typeof submittedState.profileResource?.keyHash).toBe('string')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('observe keeps later source failure out of submit blocker truth', () =>
    Effect.gen(function* () {
      const { form, runtime } = makeRuntime('observe', 'failure')

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForLoading

        const loadingState: any = yield* handle.getState
        expect(loadingState.profileResource?.status).toBe('loading')

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
        const submittedKeyHash = submittedState.profileResource?.keyHash
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(0)
        expect(submittedState.$form.submitAttempt.seq).toBe(1)
        expect(submittedState.$form.submitAttempt.verdict).toBe('ok')
        expect(submittedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(submittedState.$form.submitAttempt.pendingCount).toBe(0)
        expect(submittedState.$form.submitAttempt.errorCount).toBe(0)
        expect(typeof submittedKeyHash).toBe('string')

        yield* waitForSettled

        const erroredState: any = yield* handle.getState
        expect(erroredState.profileResource?.status).toBe('error')
        expect(erroredState.profileResource?.keyHash).toBe(submittedKeyHash)
        expect(erroredState.errors?.profileResource).toBeUndefined()
        expect(erroredState.$form.errorCount).toBe(0)
        expect(erroredState.$form.submitAttempt.seq).toBe(1)
        expect(erroredState.$form.submitAttempt.verdict).toBe('ok')
        expect(erroredState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(erroredState.$form.submitAttempt.pendingCount).toBe(0)
        expect(erroredState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('block keeps pending source in submit blocker truth', () =>
    Effect.gen(function* () {
      const { form, runtime } = makeRuntime('block')

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForLoading

        const loadingState: any = yield* handle.getState
        expect(loadingState.profileResource?.status).toBe('loading')

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
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(submittedState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(submittedState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)
        expect(typeof submittedState.profileResource?.keyHash).toBe('string')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('block treats settled source failure as lifecycle state instead of canonical error truth', () =>
    Effect.gen(function* () {
      const { form, runtime } = makeRuntime('block', 'failure')

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForSettled

        const erroredState: any = yield* handle.getState
        const erroredKeyHash = erroredState.profileResource?.keyHash
        expect(erroredState.profileResource?.status).toBe('error')
        expect(typeof erroredKeyHash).toBe('string')
        expect(erroredState.errors?.profileResource).toBeUndefined()
        expect(erroredState.$form.errorCount).toBe(0)

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
        expect(submittedState.profileResource?.status).toBe('error')
        expect(submittedState.profileResource?.keyHash).toBe(erroredKeyHash)
        expect(submittedState.errors?.profileResource).toBeUndefined()
        expect(submittedState.$form.errorCount).toBe(0)
        expect(submittedState.$form.submitAttempt.seq).toBe(1)
        expect(submittedState.$form.submitAttempt.verdict).toBe('ok')
        expect(submittedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(submittedState.$form.submitAttempt.pendingCount).toBe(0)
        expect(submittedState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
