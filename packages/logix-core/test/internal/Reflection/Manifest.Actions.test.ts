import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Debug from '../../../src/Debug.js'

describe('Reflection.extractManifest actions[] (US1)', () => {
  it.scoped('should output stable actions[] and allow joining action events', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ count: Schema.Number })
      type S = Schema.Schema.Type<typeof State>

      const M = Logix.Module.make('Manifest.Actions.Join', {
        state: State,
        actions: {
          z: Schema.Void,
          a: Schema.Number,
          m: Schema.String,
        } as const,
        reducers: {
          a: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>, n) => {
            draft.count += n
          }),
        },
        dev: {
          source: { file: 'Manifest.Actions.test.ts', line: 1, column: 1 },
        },
      })

      const impl = M.implement({ initial: { count: 0 }, logics: [] })

      const manifest = Logix.Reflection.extractManifest(impl)
      expect(manifest.moduleId).toBe('Manifest.Actions.Join')
      expect(manifest.actions.map((a) => a.actionTag)).toEqual(['a', 'm', 'z'])

      expect(manifest.actions.find((a) => a.actionTag === 'a')).toEqual({
        actionTag: 'a',
        payload: { kind: 'nonVoid' },
        primaryReducer: { kind: 'declared' },
        source: { file: 'Manifest.Actions.test.ts', line: 1, column: 1 },
      })

      expect(manifest.actions.find((a) => a.actionTag === 'm')).toEqual({
        actionTag: 'm',
        payload: { kind: 'nonVoid' },
        source: { file: 'Manifest.Actions.test.ts', line: 1, column: 1 },
      })

      expect(manifest.actions.find((a) => a.actionTag === 'z')).toEqual({
        actionTag: 'z',
        payload: { kind: 'void' },
        source: { file: 'Manifest.Actions.test.ts', line: 1, column: 1 },
      })

      const ring = Debug.makeRingBufferSink(64)
      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* M.tag
        yield* rt.dispatch({ _tag: 'a', payload: 2 } as any)
        yield* rt.dispatch({ _tag: 'z', payload: undefined } as any)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>)).pipe(
        Effect.ensuring(Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid)),
      )

      const actionRefs = ring
        .getSnapshot()
        .filter((e) => e.type === 'action:dispatch')
        .map((e) => Debug.toRuntimeDebugEventRef(e as any, { diagnosticsLevel: 'light' }))
        .filter((x): x is Debug.RuntimeDebugEventRef => Boolean(x))

      expect(actionRefs.map((r) => ({ kind: r.kind, label: r.label }))).toEqual([
        { kind: 'action', label: 'a' },
        { kind: 'action', label: 'z' },
      ])

      for (const ref of actionRefs) {
        expect(ref.moduleId).toBe(manifest.moduleId)
        const joined = manifest.actions.find((a) => a.actionTag === ref.label)
        expect(joined).toBeDefined()
      }
    }),
  )

  it.scoped('should prefer per-action source from ActionToken when provided', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ count: Schema.Number })

      const CounterActions = Logix.Action.makeActions(
        {
          z: Schema.Void,
          a: Schema.Number,
        } as const,
        {
          sources: {
            a: { file: 'a.action.ts', line: 2, column: 3 },
            z: { file: 'z.action.ts', line: 4, column: 5 },
          },
        },
      )

      const M = Logix.Module.make('Manifest.Actions.TokenSource', {
        state: State,
        actions: CounterActions,
        dev: {
          source: { file: 'module.ts', line: 1, column: 1 },
        },
      })

      const impl = M.implement({ initial: { count: 0 }, logics: [] })

      const manifest = Logix.Reflection.extractManifest(impl)
      expect(manifest.actions.find((a) => a.actionTag === 'a')?.source).toEqual({ file: 'a.action.ts', line: 2, column: 3 })
      expect(manifest.actions.find((a) => a.actionTag === 'z')?.source).toEqual({ file: 'z.action.ts', line: 4, column: 5 })
    }),
  )
})
