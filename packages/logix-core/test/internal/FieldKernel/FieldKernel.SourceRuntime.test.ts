import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Resource from '../../../src/Resource.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'
import * as Debug from '../../../src/internal/debug-api.js'
import type { ResourceRegistry } from '../../../src/Resource.js'

describe('FieldKernel.source runtime integration', () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    profile: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }),
    profileResource: Schema.Struct({
      status: Schema.String,
      keyHash: Schema.optional(Schema.String),
      data: Schema.optional(
        Schema.Struct({
          name: Schema.String,
        }),
      ),
      error: Schema.optional(Schema.Any),
    }),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  const KeySchema = Schema.Struct({
    userId: Schema.String,
  })

  type Key = Schema.Schema.Type<typeof KeySchema>

  const makeProgram = () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      sum: FieldContracts.fieldComputed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
      profileResource: FieldContracts.fieldSource({
        deps: ['profile.id'],
        resource: 'user/profile',
        key: (profileId) => ({ userId: profileId }),
      }),
      'profile.name': FieldContracts.fieldLink({
        from: 'profileResource.data.name',
      }),
    })

    return FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
  }

  it('uses ResourceSpec.load when QueryClient is not provided', async () => {
    const program = makeProgram()

    const calls: Array<Key> = []

    const spec = Resource.make<Key, { readonly name: string }, never, never>({
      id: 'user/profile',
      keySchema: KeySchema,
      load: (key) =>
        Effect.succeed({ name: `resource:${key.userId}` }).pipe(Effect.tap(() => Effect.sync(() => calls.push(key)))),
    })

    const testEffect = Effect.gen(function* () {
      type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        profile: { id: 'u1', name: 'Alice' },
        profileResource: Resource.Snapshot.idle(),
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'FieldKernelSourceRuntimeTest-Resource',
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          // ActionSchema is not used in this test; use a placeholder Schema to satisfy typing.
          actionSchema: Schema.Never as any,
          actionMap: { load: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          // Ensure onState / fieldSpec are usable in the current phase.
          getPhase: () => 'run',
          moduleId: 'FieldKernelSourceRuntimeTest-Resource',
        },
      )

      // Install the FieldKernel program behavior (includes source-refresh entrypoint registration).
      yield* FieldContracts.installFieldProgram(bound as any, program)

      // Explicitly trigger a source refresh once.
      yield* bound.fields.source.refresh('profileResource')

      // Wait for refresh and writeback (loading -> success).
      yield* Effect.sleep('30 millis')

      const finalState = (yield* runtime.getState) as State
      expect(finalState.profileResource.status).toBe('success')
      expect(finalState.profileResource.data?.name).toBe('resource:u1')
      // link: profile.name follows profileResource.data.name.
      expect(finalState.profile.name).toBe('resource:u1')
    })

    const stack: EffectOp.MiddlewareStack = []

    const programEffect = Effect.scoped(
      Effect.provide(
        Effect.provideService(testEffect, EffectOpCore.EffectOpMiddlewareTag, { stack }),
        Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>,
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(programEffect)

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ userId: 'u1' })
  })

  it('rejects non-canonical source keys before remote IO', async () => {
    const calls: Array<unknown> = []

    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      profileResource: FieldContracts.fieldSource({
        deps: ['profile.id'],
        resource: 'user/profile.invalid-key',
        key: () => ({ userId: undefined }),
      }),
    })
    const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

    const spec = Resource.make<unknown, { readonly name: string }, never, never>({
      id: 'user/profile.invalid-key',
      keySchema: Schema.Unknown,
      load: (key) =>
        Effect.succeed({ name: 'should-not-load' }).pipe(Effect.tap(() => Effect.sync(() => calls.push(key)))),
    })

    const ring = Debug.makeRingBufferSink(32)

    const testEffect = Effect.gen(function* () {
      type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        profile: { id: 'u1', name: 'Alice' },
        profileResource: Resource.Snapshot.idle(),
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'FieldKernelSourceRuntimeTest-RejectedKey',
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { load: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'FieldKernelSourceRuntimeTest-RejectedKey',
        },
      )

      yield* FieldContracts.installFieldProgram(bound as any, program)
      yield* bound.fields.source.refresh('profileResource')
      yield* Effect.sleep('30 millis')

      const finalState = (yield* runtime.getState) as State
      expect(finalState.profileResource.status).toBe('idle')
    })

    const programEffect = Effect.scoped(
      Effect.provide(
        Effect.provideService(
          testEffect,
          EffectOpCore.EffectOpMiddlewareTag,
          { stack: [] as EffectOp.MiddlewareStack },
        ),
        Layer.mergeAll(
          Resource.layer([spec]) as Layer.Layer<any, never, ResourceRegistry>,
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
        ) as Layer.Layer<any, never, any>,
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(programEffect)

    expect(calls).toHaveLength(0)
    const diagnostics = ring
      .getSnapshot()
      .filter((e) => e.type === 'diagnostic' && e.code === 'field_kernel::source_key_rejected') as ReadonlyArray<
      Extract<Debug.Event, { readonly type: 'diagnostic' }>
    >
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.severity).toBe('error')
    expect(diagnostics[0]?.trigger?.details).toMatchObject({
      resourceId: 'user/profile.invalid-key',
      reason: 'nested-undefined',
      keyPath: '$.userId',
    })
  })

  it('keeps newer forced same-key refresh result from being overwritten by an older task', async () => {
    const resolvers: Array<(value: { readonly name: string; readonly seq: number }) => void> = []
    const calls: Array<unknown> = []

    const spec = Resource.make<unknown, { readonly name: string; readonly seq: number }, never, never>({
      id: 'user/profile.same-key-generation',
      keySchema: KeySchema,
      load: (key) =>
        Effect.promise(
          () =>
            new Promise<{ readonly name: string; readonly seq: number }>((resolve) => {
              calls.push(key)
              resolvers.push(resolve)
            }),
        ),
    })

    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      profileResource: FieldContracts.fieldSource({
        deps: ['profile.id'],
        resource: 'user/profile.same-key-generation',
        key: (profileId) => ({ userId: profileId }),
        concurrency: 'exhaust-trailing',
      }),
    })
    const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

    const testEffect = Effect.gen(function* () {
      type Shape = Logix.Module.Shape<typeof StateSchema, { load: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        profile: { id: 'u1', name: 'Alice' },
        profileResource: Resource.Snapshot.idle(),
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'FieldKernelSourceRuntimeTest-SameKeyGeneration',
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { load: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => 'run',
          moduleId: 'FieldKernelSourceRuntimeTest-SameKeyGeneration',
        },
      )

      yield* FieldContracts.installFieldProgram(bound as any, program)

      yield* bound.fields.source.refresh('profileResource', { force: true })
      yield* Effect.sleep('5 millis')
      yield* bound.fields.source.refresh('profileResource', { force: true })
      yield* Effect.sleep('5 millis')

      expect(calls).toHaveLength(1)

      resolvers[0]?.({ name: 'old', seq: 1 })
      yield* Effect.sleep('5 millis')

      const afterOldState = (yield* runtime.getState) as State
      expect(afterOldState.profileResource.status).toBe('loading')
      expect(afterOldState.profileResource.data).toBeUndefined()

      yield* Effect.sleep('5 millis')
      expect(calls).toHaveLength(2)

      resolvers[1]?.({ name: 'new', seq: 2 })
      yield* Effect.sleep('5 millis')

      const finalState = (yield* runtime.getState) as any
      expect(finalState.profileResource.status).toBe('success')
      expect(finalState.profileResource.data).toEqual({ name: 'new', seq: 2 })
    })

    const programEffect = Effect.scoped(
      Effect.provide(
        Effect.provideService(testEffect, EffectOpCore.EffectOpMiddlewareTag, { stack: [] as EffectOp.MiddlewareStack }),
        Resource.layer([spec]) as Layer.Layer<never, never, ResourceRegistry>,
      ),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(programEffect)
  })
})
