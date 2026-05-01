import * as CoreEvidence from '@logixjs/core/repo-internal/evidence-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const makeRuntimeWithDevtoolsHub = (options: {
  readonly moduleId: string
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly fieldConvergeDiagnosticsSampling?: Debug.FieldConvergeDiagnosticsSamplingConfig
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const State = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    derivedA: Schema.Number,
    derivedB: Schema.Number,
  })

  type S = Schema.Schema.Type<typeof State>

  const Actions = {
    noop: Schema.Void,
    incA: Schema.Void,
  }

  const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make(options.moduleId, {
  state: State,
  actions: Actions,
  reducers: {
      noop: (s: any) => s,
      incA: Logix.Module.Reducer.mutate((draft) => {
        draft.a += 1
      }),
    }
}), FieldContracts.fieldFrom(State)({
      derivedA: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
      derivedB: FieldContracts.fieldComputed({
        deps: ['b'],
        get: (b) => b + 1,
      }),
    }))

  const programModule = Logix.Program.make(M, {
    initial: { a: 0, b: 0, derivedA: 1, derivedB: 1 },
    logics: [],
  })

  Debug.clearDevtoolsEvents()

  const layer = Debug.devtoolsHubLayer({
    bufferSize: 256,
    diagnosticsLevel: options.diagnosticsLevel,
    ...(options.fieldConvergeDiagnosticsSampling
      ? { fieldConvergeDiagnosticsSampling: options.fieldConvergeDiagnosticsSampling }
      : null),
  })

  const runtime = Logix.Runtime.make(programModule, {
    stateTransaction: options.stateTransaction,
    layer: layer as Layer.Layer<any, never, never>,
  })

  return { M, runtime }
}

const runTxn = (
  M: any,
  runtime: ReturnType<typeof Logix.Runtime.make>,
  name: string,
): Effect.Effect<void, never, any> =>
  Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
        void name
        yield* rt.dispatch({ _tag: 'incA', payload: undefined } as any)
      }),
    ),
  )

const pickFieldConvergeRefs = (pkg: CoreEvidence.EvidencePackage): any[] =>
  pkg.events
    .filter((e) => e.type === 'debug:event')
    .map((e) => e.payload as any)
    .filter((p) => p && typeof p === 'object' && p.kind === 'field:converge')

describe('FieldKernel converge diagnostics levels', () => {
  it.effect('off: no exportable field:converge event nor summary', () =>
    Effect.gen(function* () {
      const moduleId = 'FieldKernelConvergeAuto_DiagnosticsLevels_Off'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'off',
        stateTransaction: { fieldConvergeMode: 'auto' },
      })

      yield* runTxn(M, runtime, 't1')

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'off' },
      })

      expect(pickFieldConvergeRefs(pkg).length).toBe(0)
      expect(pkg.summary).toBeUndefined()
    }),
  )

  it.effect('light: field:converge exported with slim dirty + rootIds mapping + minimal staticIrByDigest summary', () =>
    Effect.gen(function* () {
      const moduleId = 'FieldKernelConvergeAuto_DiagnosticsLevels_Light'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'light',
        stateTransaction: { fieldConvergeMode: 'auto' },
      })

      yield* runTxn(M, runtime, 't1')

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'light' },
      })

      const refs = pickFieldConvergeRefs(pkg)
      expect(refs.length).toBeGreaterThan(0)

      const last = refs[refs.length - 1]!
      const meta = last.meta as any
      const dirty = meta.dirty as any

      expect(dirty).toBeDefined()
      expect(typeof dirty.dirtyAll).toBe('boolean')
      expect('rootCount' in dirty).toBe(false)
      expect(Array.isArray(dirty.rootIds)).toBe(true)
      expect(typeof dirty.rootIdsTruncated).toBe('boolean')
      expect('rootPaths' in dirty).toBe(false)

      const summary = pkg.summary as any
      expect(summary).toBeDefined()
      expect(summary.converge).toBeDefined()
      expect(summary.converge.staticIrByDigest).toBeDefined()
      expect(typeof meta.staticIrDigest).toBe('string')
      expect(meta.staticIrDigest.length).toBeGreaterThan(0)
      const byDigest = summary.converge.staticIrByDigest as any
      expect(byDigest[meta.staticIrDigest]).toBeDefined()
      expect(Array.isArray(byDigest[meta.staticIrDigest].fieldPaths)).toBe(true)
      expect(byDigest[meta.staticIrDigest].writersKey).toBeUndefined()
    }),
  )

  it.effect('full: field:converge exported with controlled roots summary and staticIrByDigest summary', () =>
    Effect.gen(function* () {
      const moduleId = 'FieldKernelConvergeAuto_DiagnosticsLevels_Full'
      const { M, runtime } = makeRuntimeWithDevtoolsHub({
        moduleId,
        diagnosticsLevel: 'full',
        stateTransaction: { fieldConvergeMode: 'auto' },
      })

      yield* runTxn(M, runtime, 't1')

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'full' },
      })

      const refs = pickFieldConvergeRefs(pkg)
      expect(refs.length).toBeGreaterThan(0)

      const last = refs[refs.length - 1]!
      const meta = last.meta as any
      const dirty = meta.dirty as any

      expect(dirty).toBeDefined()
      expect(typeof dirty.dirtyAll).toBe('boolean')
      expect(typeof dirty.rootCount).toBe('number')
      expect(Array.isArray(dirty.rootIds)).toBe(true)
      expect(dirty.rootIds.length).toBeLessThanOrEqual(3)
      expect(typeof dirty.rootIdsTruncated).toBe('boolean')
      expect('rootPaths' in dirty).toBe(false)

      const summary = pkg.summary as any
      expect(summary).toBeDefined()
      expect(summary.converge).toBeDefined()
      expect(summary.converge.staticIrByDigest).toBeDefined()
      expect(typeof meta.staticIrDigest).toBe('string')
      expect(meta.staticIrDigest.length).toBeGreaterThan(0)
      expect((summary.converge.staticIrByDigest as any)[meta.staticIrDigest]).toBeDefined()
    }),
  )

  it.effect(
    'sampled: field:converge exported with slim dirty + diagnosticsSampling summary + optional top3 hotspots',
    () =>
      Effect.gen(function* () {
        const moduleId = 'FieldKernelConvergeAuto_DiagnosticsLevels_Sampled'
        const { M, runtime } = makeRuntimeWithDevtoolsHub({
          moduleId,
          diagnosticsLevel: 'sampled',
          fieldConvergeDiagnosticsSampling: { sampleEveryN: 1, topK: 3 },
          stateTransaction: { fieldConvergeMode: 'auto' },
        })

        yield* runTxn(M, runtime, 't1')

        const pkg = Debug.exportEvidencePackage({
          source: { host: 'test', label: 'sampled' },
        })

        const refs = pickFieldConvergeRefs(pkg)
        expect(refs.length).toBeGreaterThan(0)

        const last = refs[refs.length - 1]!
        const meta = last.meta as any

        const dirty = meta.dirty as any
        expect(dirty).toBeDefined()
        expect(typeof dirty.dirtyAll).toBe('boolean')
        expect('rootCount' in dirty).toBe(false)
        expect('rootIds' in dirty).toBe(false)
        expect('rootIdsTruncated' in dirty).toBe(false)

        const sampling = meta.diagnosticsSampling as any
        expect(sampling).toBeDefined()
        expect(sampling.strategy).toBe('txnSeq_interval')
        expect(sampling.sampleEveryN).toBe(1)
        expect(sampling.topK).toBe(3)
        expect(sampling.sampled).toBe(true)

        const summary = pkg.summary as any
        expect(summary).toBeDefined()
        expect(summary.converge).toBeDefined()
        expect(summary.converge.staticIrByDigest).toBeDefined()
        expect(typeof meta.staticIrDigest).toBe('string')
        expect(meta.staticIrDigest.length).toBeGreaterThan(0)
        expect((summary.converge.staticIrByDigest as any)[meta.staticIrDigest]).toBeDefined()

        const top3 = meta.top3 as any
        expect(Array.isArray(top3)).toBe(true)
        expect(top3.length).toBeGreaterThan(0)
        expect(top3.length).toBeLessThanOrEqual(3)
        expect(typeof top3[0]?.stepId).toBe('number')
        expect(typeof top3[0]?.durationMs).toBe('number')
        expect(typeof top3[0]?.changed).toBe('boolean')
      }),
  )

  it.effect('mixed tiers: staticIrByDigest should keep full/minimal shape per digest without cross-tier pollution', () =>
    Effect.gen(function* () {
      Debug.clearDevtoolsEvents()

      const FullState = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
      })
      const FullActions = {
        inc: Schema.Void,
      }
      const FullModule = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConvergeAuto_DiagnosticsLevels_Mixed_Full', {
  state: FullState,
  actions: FullActions,
  reducers: {
          inc: Logix.Module.Reducer.mutate((draft) => {
            draft.a += 1
          }),
        }
}), FieldContracts.fieldFrom(FullState)({
          derivedA: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
        }))
      const fullProgram = Logix.Program.make(FullModule, {
        initial: { a: 0, derivedA: 1 },
        logics: [],
      })
      const fullRuntime = Logix.Runtime.make(fullProgram, {
        stateTransaction: { fieldConvergeMode: 'auto' },
        layer: Debug.devtoolsHubLayer({
          bufferSize: 256,
          diagnosticsLevel: 'full',
        }) as Layer.Layer<any, never, never>,
      })

      const LightState = Schema.Struct({
        x: Schema.Number,
        derivedX: Schema.Number,
        marker: Schema.Number,
      })
      const LightActions = {
        inc: Schema.Void,
      }
      const LightModule = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConvergeAuto_DiagnosticsLevels_Mixed_Light', {
  state: LightState,
  actions: LightActions,
  reducers: {
          inc: Logix.Module.Reducer.mutate((draft) => {
            draft.x += 1
          }),
        }
}), FieldContracts.fieldFrom(LightState)({
          derivedX: FieldContracts.fieldComputed({
            deps: ['x'],
            get: (x) => x + 1,
          }),
        }))
      const lightProgram = Logix.Program.make(LightModule, {
        initial: { x: 0, derivedX: 1, marker: 0 },
        logics: [],
      })
      const lightRuntime = Logix.Runtime.make(lightProgram, {
        stateTransaction: { fieldConvergeMode: 'auto' },
        layer: Debug.devtoolsHubLayer({
          bufferSize: 256,
          diagnosticsLevel: 'light',
        }) as Layer.Layer<any, never, never>,
      })

      yield* Effect.promise(() =>
        fullRuntime.runPromise(
          Effect.gen(function* () {
            const rt = yield* Effect.service(FullModule.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'inc', payload: undefined } as any)
          }),
        ),
      )

      yield* Effect.promise(() =>
        lightRuntime.runPromise(
          Effect.gen(function* () {
            const rt = yield* Effect.service(LightModule.tag).pipe(Effect.orDie)
            yield* rt.dispatch({ _tag: 'inc', payload: undefined } as any)
          }),
        ),
      )

      const pkg = Debug.exportEvidencePackage({
        source: { host: 'test', label: 'mixed-tiers' },
      })

      const refs = pickFieldConvergeRefs(pkg)
      const fullRef = refs.find((ref) => ref?.moduleId === FullModule.id)
      const lightRef = refs.find((ref) => ref?.moduleId === LightModule.id)

      expect(fullRef).toBeDefined()
      expect(lightRef).toBeDefined()

      const fullDigest = (fullRef as any)?.meta?.staticIrDigest as string
      const lightDigest = (lightRef as any)?.meta?.staticIrDigest as string
      expect(typeof fullDigest).toBe('string')
      expect(fullDigest.length).toBeGreaterThan(0)
      expect(typeof lightDigest).toBe('string')
      expect(lightDigest.length).toBeGreaterThan(0)
      expect(fullDigest).not.toBe(lightDigest)

      const byDigest = (pkg.summary as any)?.converge?.staticIrByDigest as Record<string, any>
      expect(byDigest).toBeDefined()

      const fullEntry = byDigest[fullDigest]
      const lightEntry = byDigest[lightDigest]
      expect(fullEntry).toBeDefined()
      expect(lightEntry).toBeDefined()

      expect(typeof fullEntry.moduleId).toBe('string')
      expect(typeof fullEntry.instanceId).toBe('string')
      expect(typeof fullEntry.generation).toBe('number')
      expect(Array.isArray(fullEntry.stepOutFieldPathIdByStepId)).toBe(true)
      expect(Array.isArray(fullEntry.stepSchedulingByStepId)).toBe(true)

      expect(Array.isArray(lightEntry.fieldPaths)).toBe(true)
      expect(lightEntry.moduleId).toBeUndefined()
      expect(lightEntry.instanceId).toBeUndefined()
      expect(lightEntry.generation).toBeUndefined()
      expect(lightEntry.stepOutFieldPathIdByStepId).toBeUndefined()
      expect(lightEntry.stepSchedulingByStepId).toBeUndefined()
      expect(lightEntry.topoOrder).toBeUndefined()
    }),
  )
})
