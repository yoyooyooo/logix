import { describe, expect, it } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../../src/index.js'

describe('ModuleRuntime dispatch scope acquisition fast path', () => {
  it('reuses the imported module handle for the same resolved runtime inside one BoundApi', async () => {
    const Child = Logix.Module.make('DispatchScopeAcquisitionFastPath.Child', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.count += 1
        }),
      },
    })

    const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
    let handleBuilds = 0
    ;(Child.tag as any)[EXTEND_HANDLE] = (_runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => {
      handleBuilds += 1
      return { ...base, handleBuild: handleBuilds }
    }

    const ChildProgram = Logix.Program.make(Child, {
      initial: { count: 0 },
      logics: [],
    })

    const Host = Logix.Module.make('DispatchScopeAcquisitionFastPath.Host', {
      state: Schema.Void,
      actions: {},
    })

    const HostProgram = Logix.Program.make(Host, {
      initial: undefined,
      logics: [],
      capabilities: {
        imports: [ChildProgram],
      },
    })

    await Logix.Runtime.run(
      HostProgram,
      ({ $ }) =>
        Effect.gen(function* () {
          const byModule = yield* $.use(Child)
          yield* byModule.dispatch({ _tag: 'inc', payload: undefined } as any)

          const byTag = yield* $.use(Child.tag)
          yield* byTag.dispatch({ _tag: 'inc', payload: undefined } as any)

          const byTagAgain = yield* $.use(Child.tag)
          yield* byTagAgain.dispatch({ _tag: 'inc', payload: undefined } as any)

          expect(byTag).toBe(byModule)
          expect(byTagAgain).toBe(byModule)
          expect((byModule as any).handleBuild).toBe(1)
          expect(handleBuilds).toBe(1)

          const count = yield* byTagAgain.read((state: any) => state.count)
          expect(count).toBe(3)
        }),
      { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
    )

    expect(handleBuilds).toBe(1)
  })

  it('does not share cached imported handles across runtime roots', async () => {
    const Shared = Logix.Module.make('DispatchScopeAcquisitionFastPath.Shared', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
    let handleBuilds = 0
    ;(Shared.tag as any)[EXTEND_HANDLE] = (_runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => {
      handleBuilds += 1
      return { ...base, handleBuild: handleBuilds }
    }

    const Root = Logix.Module.make('DispatchScopeAcquisitionFastPath.Root', {
      state: Schema.Void,
      actions: {},
    })

    const readImportedValue = (value: number) => {
      const SharedProgram = Logix.Program.make(Shared, {
        initial: { value },
        logics: [],
      })
      const RootProgram = Logix.Program.make(Root, {
        initial: undefined,
        logics: [],
        capabilities: {
          imports: [SharedProgram],
        },
      })

      return Logix.Runtime.run(
        RootProgram,
        ({ $ }) =>
          Effect.gen(function* () {
            const handle = yield* $.use(Shared.tag)
            return {
              handle,
              value: yield* handle.read((state: any) => state.value),
            }
          }),
        { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
      )
    }

    const first = await readImportedValue(1)
    const second = await readImportedValue(2)

    expect(first.value).toBe(1)
    expect(second.value).toBe(2)
    expect(second.handle).not.toBe(first.handle)
    expect(handleBuilds).toBe(2)
  })
})
