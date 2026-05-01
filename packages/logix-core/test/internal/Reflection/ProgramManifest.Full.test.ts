import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

describe('runtime reflection full Program manifest', () => {
  it('extracts Program-level reflection with summaries, capabilities, budget and stable digest', () => {
    const Counter = Logix.Module.make('RuntimeReflection.Counter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: {
        increment: Schema.Void,
        setCount: Schema.Number,
      } as const,
      reducers: {
        setCount: (state, action) => ({ ...state, count: action.payload }),
      },
      effects: {
        setCount: [() => Effect.void],
      },
      schemas: {
        count: Schema.Number,
      },
      services: {
        clock: {} as never,
      },
    })

    const log = Counter.logic('counter.log', () => Effect.void)
    const program = Logix.Program.make(Counter, {
      initial: { count: 0 },
      logics: [log],
    })

    const manifest = CoreReflection.extractRuntimeReflectionManifest(program, {
      programId: 'counter.program',
      sourceRefs: [{ kind: 'source', path: '/src/logic/counter.logic.ts' }],
    })
    const manifestAgain = CoreReflection.extractRuntimeReflectionManifest(program, {
      programId: 'counter.program',
      sourceRefs: [{ kind: 'source', path: '/src/logic/counter.logic.ts' }],
    })

    expect(manifest.manifestVersion).toBe('runtime-reflection-manifest@167B')
    expect(manifest.programId).toBe('counter.program')
    expect(manifest.rootModuleId).toBe('RuntimeReflection.Counter')
    expect(manifest.rootModule.moduleId).toBe('RuntimeReflection.Counter')
    expect(manifest.actions.map((action) => action.actionTag)).toEqual(['increment', 'setCount'])
    expect(manifest.actions.find((action) => action.actionTag === 'setCount')?.payload).toMatchObject({
      kind: 'nonVoid',
      summary: 'Schema.Number',
      validatorAvailable: true,
    })
    expect(manifest.initialState).toMatchObject({
      label: 'Schema.Struct({ count: Schema.Number })',
      digest: expect.stringMatching(/^schema:/),
    })
    expect(manifest.logicUnits.map((unit) => unit.id)).toContain('counter.log')
    expect(manifest.effects).toEqual([{ actionTag: 'setCount', kind: 'declared', sourceKey: '__logix_internal:effects:declared::h1' }])
    expect(manifest.services).toEqual([{ serviceKey: 'clock' }])
    expect(manifest.capabilities).toEqual({
      run: 'available',
      check: 'available',
      trial: 'available',
    })
    expect(manifest.sourceRefs).toEqual([{ kind: 'source', path: '/src/logic/counter.logic.ts' }])
    expect(manifest.budget.truncated).toBe(false)
    expect(manifest.digest).toBe(manifestAgain.digest)
    expect(manifest.digest).toMatch(/^runtime-manifest:/)
  })

  it('diffs action and payload summary changes at Program manifest level', () => {
    const before = CoreReflection.extractRuntimeReflectionManifest(
      Logix.Program.make(
        Logix.Module.make('RuntimeReflection.Diff', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: { setValue: Schema.Number } as const,
          reducers: {},
        }),
        { initial: { value: 0 }, logics: [] },
      ),
      { programId: 'diff.program' },
    )

    const after = CoreReflection.extractRuntimeReflectionManifest(
      Logix.Program.make(
        Logix.Module.make('RuntimeReflection.Diff', {
          state: Schema.Struct({ value: Schema.Number }),
          actions: {
            setValue: Schema.String,
            reset: Schema.Void,
          } as const,
          reducers: {},
        }),
        { initial: { value: 0 }, logics: [] },
      ),
      { programId: 'diff.program' },
    )

    const diff = CoreReflection.diffRuntimeReflectionManifest(before, after)

    expect(diff.beforeDigest).toBe(before.digest)
    expect(diff.afterDigest).toBe(after.digest)
    expect(diff.changes.map((change) => change.code)).toEqual(['action.added', 'payload.changed'])
    expect(diff.summary).toEqual({ actionAdded: 1, actionRemoved: 0, payloadChanged: 1 })
  })
})
