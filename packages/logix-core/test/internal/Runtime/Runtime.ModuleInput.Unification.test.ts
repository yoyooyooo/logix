import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('Runtime module input unification', () => {
  it.scoped('accepts legacy Module.impl root in writeback stage and emits migration diagnostics', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(32)
      const diagnosticsLayer = Layer.mergeAll(
        Logix.Debug.replace([ring.sink]),
        Logix.Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const Root = Logix.Module.make('RuntimeLegacyImplRootPositive', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const built = Root.build({
        initial: { count: 9 },
        logics: [],
      })

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(built.impl, {
            layer: diagnosticsLayer,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )

      const readCount = Effect.gen(function* () {
        const rt = yield* Root.tag
        return (yield* rt.getState).count
      }) as Effect.Effect<number, never, any>

      const value = yield* Effect.promise(() => runtime.runPromise(readCount))

      expect(value).toBe(9)

      const events = ring
        .getSnapshot()
        .filter((event) => event.type === 'diagnostic' && (event as any).code === 'module_instantiation::legacy_entry')
      expect(events.length).toBe(1)
      expect((events[0] as any).source).toBe('Module.impl')
    }),
  )

  it.scoped('does not leak Module.impl legacy diagnostics into build(...).createInstance()', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(32)
      const diagnosticsLayer = Layer.mergeAll(
        Logix.Debug.replace([ring.sink]),
        Logix.Debug.diagnosticsLevel('light'),
      ) as Layer.Layer<any, never, never>

      const Root = Logix.Module.make('RuntimeLegacyImplLeakGuard', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: { noop: Schema.Void },
      })

      const built = Root.build({
        initial: { count: 5 },
        logics: [],
      })

      // Touch legacy getter first; createInstance() should still stay on non-legacy path.
      void built.impl

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(built.createInstance(), {
            layer: diagnosticsLayer,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )

      const readCount = Effect.gen(function* () {
        const rt = yield* Root.tag
        return (yield* rt.getState).count
      }) as Effect.Effect<number, never, any>

      const value = yield* Effect.promise(() => runtime.runPromise(readCount))
      expect(value).toBe(5)

      const events = ring
        .getSnapshot()
        .filter((event) => event.type === 'diagnostic' && (event as any).code === 'module_instantiation::legacy_entry')
      expect(events.length).toBe(0)
    }),
  )

  it.scoped('prefers createInstance() when both createInstance() and legacy .impl are present', () =>
    Effect.gen(function* () {
      const RootA = Logix.Module.make('RuntimeRootSameId', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {},
      })
      const RootB = Logix.Module.make('RuntimeRootSameId', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {},
      })

      const builtA = RootA.build({ initial: { count: 1 } })
      const builtB = RootB.build({ initial: { count: 9 } })

      const inconsistentRoot = {
        ...builtA,
        createInstance: () => builtA.createInstance(),
        impl: builtB.createInstance(),
      } as any

      const runtime = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Logix.Runtime.make(inconsistentRoot, {
            layer: Layer.empty as Layer.Layer<any, never, never>,
          }),
        ),
        (rt) => Effect.promise(() => rt.dispose()).pipe(Effect.asVoid),
      )

      const readCount = Effect.gen(function* () {
        const rt = yield* RootA.tag
        return (yield* rt.getState).count
      }) as Effect.Effect<number, never, any>

      const value = yield* Effect.promise(() => runtime.runPromise(readCount))

      expect(value).toBe(1)
    }),
  )

  it('fails fast when createInstance() returns a non-ModuleImpl value', () => {
    const Root = Logix.Module.make('RuntimeInvalidRootFromCreate', {
      state: Schema.Void,
      actions: {},
    })
    const built = Root.build({ initial: undefined })

    const invalidRoot = {
      ...built,
      createInstance: () => ({ _tag: 'NotModuleImpl' }),
      impl: undefined,
    } as any

    expect(() =>
      Logix.Runtime.make(invalidRoot, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      }),
    ).toThrowError(/\[InvalidModuleRoot]/)
  })

  it('fails fast when Runtime.make receives ModuleDef directly', () => {
    const RootDef = Logix.Module.make('RuntimeInvalidRootModuleDef', {
      state: Schema.Void,
      actions: {},
    })

    expect(() =>
      Logix.Runtime.make(RootDef as any, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      }),
    ).toThrowError(/\[InvalidModuleRoot]/)
  })

  it('fails fast when Runtime.make receives malformed ModuleImpl-like root', () => {
    const malformedRoot = {
      _tag: 'ModuleImpl',
      module: undefined,
      layer: undefined,
    } as any

    expect(() =>
      Logix.Runtime.make(malformedRoot, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      }),
    ).toThrowError(/\[InvalidModuleRoot]/)
  })

  it('fails fast when createInstance() is missing (legacy .impl is ignored)', () => {
    const Root = Logix.Module.make('RuntimeInvalidRootNoImpl', {
      state: Schema.Void,
      actions: {},
    })

    const invalidRoot = {
      _kind: 'Module',
      id: 'RuntimeInvalidRootNoImpl',
      tag: Root.tag,
      impl: undefined,
    } as any

    expect(() =>
      Logix.Runtime.make(invalidRoot, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      }),
    ).toThrowError(/\[InvalidModuleRoot]/)
  })

  it('fails fast when root only provides legacy .impl (no fallback unwrap)', () => {
    const Root = Logix.Module.make('RuntimeInvalidLegacyImpl', {
      state: Schema.Void,
      actions: {},
    })

    const built = Root.build({ initial: undefined })

    const invalidRoot = {
      _kind: 'Module',
      id: 'RuntimeInvalidLegacyImpl',
      tag: Root.tag,
      impl: built.createInstance(),
    } as any

    expect(() =>
      Logix.Runtime.make(invalidRoot, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      }),
    ).toThrowError(/\[InvalidModuleRoot]/)
  })
})
