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

const waitForOldLoadSettled = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 45)
    }),
)

const waitForTrailingSettled = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 100)
    }),
)

describe('Form source stale submit snapshot', () => {
  it.effect('keeps the blocked submitAttempt snapshot stable after later source success', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile.stale-submit-snapshot',
        keySchema: KeySchema,
        load: ({ userId }) => Effect.sleep(Duration.millis(50)).pipe(Effect.as({ name: `resource:${userId}` })),
      })

      const form = Form.make(
        'Form.Source.StaleSubmitSnapshot',
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
            submitImpact: 'block',
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

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

        const blockedState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(blockedState.$form.submitAttempt.seq).toBe(1)
        expect(blockedState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(blockedState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)

        yield* waitForSettled

        const settledState: any = yield* handle.getState
        expect(settledState.profileResource?.status).toBe('success')
        expect(settledState.profileResource?.data?.name).toBe('resource:u1')
        expect(typeof settledState.profileResource?.keyHash).toBe('string')
        expect(settledState.$form.submitAttempt.seq).toBe(1)
        expect(settledState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(settledState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)

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

        const refreshedState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(refreshedState.$form.submitAttempt.seq).toBe(2)
        expect(refreshedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(refreshedState.$form.submitAttempt.pendingCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('does not lower later source error into canonical error truth for the old submitAttempt', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile.stale-submit-error',
        keySchema: KeySchema,
        load: () => Effect.sleep(Duration.millis(50)).pipe(Effect.flatMap(() => Effect.fail('remote-failed'))),
      })

      const form = Form.make(
        'Form.Source.StaleSubmitError',
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
            submitImpact: 'block',
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

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

        const blockedState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(blockedState.$form.submitAttempt.blockingBasis).toBe('pending')

        yield* waitForSettled

        const erroredState: any = yield* handle.getState
        expect(erroredState.profileResource?.status).toBe('error')
        expect(typeof erroredState.profileResource?.keyHash).toBe('string')
        expect(erroredState.errors?.profileResource).toBeUndefined()
        expect(erroredState.$form.errorCount).toBe(0)
        expect(erroredState.$form.submitAttempt.seq).toBe(1)
        expect(erroredState.$form.submitAttempt.blockingBasis).toBe('pending')

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

        const refreshedState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(refreshedState.$form.submitAttempt.seq).toBe(2)
        expect(refreshedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(refreshedState.$form.submitAttempt.pendingCount).toBe(0)
        expect(refreshedState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('keeps stale in-flight source key results from overwriting the current source snapshot or receipt', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile.stale-key-isolation',
        keySchema: KeySchema,
        load: ({ userId }) =>
          Effect.sleep(Duration.millis(userId === 'u1' ? 30 : 40)).pipe(
            Effect.as({ name: `resource:${userId}`, userId }),
          ),
      })

      const form = Form.make(
        'Form.Source.StaleKeyIsolation',
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
            triggers: ['onMount', 'onKeyChange'],
            submitImpact: 'block',
            concurrency: 'exhaust-trailing',
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForLoading

        const firstLoadingState: any = yield* handle.getState
        const oldKeyHash = firstLoadingState.profileResource?.keyHash
        expect(firstLoadingState.profileResource?.status).toBe('loading')
        expect(typeof oldKeyHash).toBe('string')

        yield* handle.field('profileId').set('u2')

        const switchedLoadingState: any = yield* handle.getState
        const newKeyHash = switchedLoadingState.profileResource?.keyHash
        expect(switchedLoadingState.profileResource?.status).toBe('loading')
        expect(typeof newKeyHash).toBe('string')
        expect(newKeyHash).not.toBe(oldKeyHash)

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

        const blockedState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(blockedState.profileResource?.status).toBe('loading')
        expect(blockedState.profileResource?.keyHash).toBe(newKeyHash)
        expect(blockedState.$form.submitAttempt.seq).toBe(1)
        expect(blockedState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(blockedState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)

        yield* waitForOldLoadSettled

        const afterOldLoadState: any = yield* handle.getState
        expect(afterOldLoadState.profileResource?.status).toBe('loading')
        expect(afterOldLoadState.profileResource?.keyHash).toBe(newKeyHash)
        expect(afterOldLoadState.profileResource?.data?.userId).not.toBe('u1')
        expect(afterOldLoadState.$form.submitAttempt.seq).toBe(1)
        expect(afterOldLoadState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(afterOldLoadState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)

        yield* waitForTrailingSettled

        const settledState: any = yield* handle.getState
        expect(settledState.profileResource?.status).toBe('success')
        expect(settledState.profileResource?.keyHash).toBe(newKeyHash)
        expect(settledState.profileResource?.data).toEqual({
          name: 'resource:u2',
          userId: 'u2',
        })
        expect(settledState.profileResource?.data?.userId).not.toBe('u1')
        expect(settledState.$form.submitAttempt.seq).toBe(1)
        expect(settledState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(settledState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)

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

        const refreshedState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(refreshedState.profileResource?.keyHash).toBe(newKeyHash)
        expect(refreshedState.profileResource?.data?.userId).toBe('u2')
        expect(refreshedState.$form.submitAttempt.seq).toBe(2)
        expect(refreshedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(refreshedState.$form.submitAttempt.pendingCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('debounces onKeyChange refreshes and keeps switch mode on the latest key only', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const calls: Array<string> = []

      const profileResource = Resource.make({
        id: 'user/profile.switch-debounce',
        keySchema: KeySchema,
        load: ({ userId }) =>
          Effect.sync(() => {
            calls.push(userId)
            return { name: `resource:${userId}`, userId }
          }),
      })

      const form = Form.make(
        'Form.Source.SwitchDebounce',
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
            triggers: ['onKeyChange'],
            submitImpact: 'observe',
            concurrency: 'switch',
            debounceMs: 25,
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.field('profileId').set('u2')
        yield* Effect.sleep('5 millis')
        yield* handle.field('profileId').set('u3')
        yield* Effect.sleep('5 millis')
        yield* handle.field('profileId').set('u4')

        const beforeDebounceState: any = yield* handle.getState
        expect(beforeDebounceState.profileResource?.status).toBe('idle')
        expect(calls).toEqual([])

        yield* Effect.sleep('70 millis')

        const settledState: any = yield* handle.getState
        expect(calls).toEqual(['u4'])
        expect(settledState.profileResource?.status).toBe('success')
        expect(settledState.profileResource?.data).toEqual({
          name: 'resource:u4',
          userId: 'u4',
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('flushes debounced block source before submit so scheduled freshness is visible', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile.debounce-block-submit',
        keySchema: KeySchema,
        load: ({ userId }) => Effect.sleep(Duration.millis(50)).pipe(Effect.as({ name: `resource:${userId}`, userId })),
      })

      const form = Form.make(
        'Form.Source.DebounceBlockSubmit',
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
            triggers: ['onKeyChange'],
            submitImpact: 'block',
            concurrency: 'exhaust-trailing',
            debounceMs: 50,
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.field('profileId').set('u2')

        const beforeSubmitState: any = yield* handle.getState
        expect(beforeSubmitState.profileResource?.status).toBe('idle')

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

        const blockedState: any = yield* handle.getState
        const submittedKeyHash = blockedState.profileResource?.keyHash
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(blockedState.profileResource?.status).toBe('loading')
        expect(typeof submittedKeyHash).toBe('string')
        expect(blockedState.$form.submitAttempt.seq).toBe(1)
        expect(blockedState.$form.submitAttempt.blockingBasis).toBe('pending')
        expect(blockedState.$form.submitAttempt.pendingCount).toBeGreaterThan(0)

        yield* waitForSettled

        const settledState: any = yield* handle.getState
        expect(settledState.profileResource?.status).toBe('success')
        expect(settledState.profileResource?.keyHash).toBe(submittedKeyHash)
        expect(settledState.profileResource?.data).toEqual({
          name: 'resource:u2',
          userId: 'u2',
        })
        expect(settledState.$form.submitAttempt.seq).toBe(1)
        expect(settledState.$form.submitAttempt.blockingBasis).toBe('pending')

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

        const refreshedState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(refreshedState.$form.submitAttempt.seq).toBe(2)
        expect(refreshedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(refreshedState.$form.submitAttempt.pendingCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
