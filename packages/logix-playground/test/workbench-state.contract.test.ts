import { describe, expect, it } from 'vitest'
import { Effect, Schema } from 'effect'
import {
  PlaygroundWorkbench,
  PlaygroundWorkbenchProgram,
  WorkbenchStateSchema,
  initialPlaygroundWorkbenchState,
} from '../src/internal/state/workbenchProgram.js'

const readWorkbenchState = async (run: Effect.Effect<void, never, any> = Effect.void) => {
  const runtime = PlaygroundWorkbench.live(initialPlaygroundWorkbenchState)
  const program = Effect.gen(function* () {
    const workbench = yield* Effect.service(PlaygroundWorkbench.tag).pipe(Effect.orDie)
    yield* run
    return yield* workbench.getState
  }).pipe(Effect.provide(runtime))

  return Effect.runPromise(Effect.scoped(program) as Effect.Effect<typeof initialPlaygroundWorkbenchState, never, never>)
}

describe('Playground workbench state', () => {
  it('keeps layout, editor and inspector host state in the workbench module', () => {
    expect(initialPlaygroundWorkbenchState.layout).toEqual({
      filesWidth: 256,
      inspectorWidth: 340,
      bottomHeight: 192,
      filesCollapsed: false,
      bottomCollapsed: false,
    })
    expect(initialPlaygroundWorkbenchState.editor).toMatchObject({
      engine: 'textarea',
      languageServiceStatus: 'idle',
      typeBundleStatus: 'idle',
      loadedTypePackages: [],
      diagnostics: [],
    })
    expect(initialPlaygroundWorkbenchState.inspector).toEqual({
      activeInspectorTab: 'actions',
      advancedDispatchExpanded: false,
      selectedDriverId: undefined,
      selectedScenarioId: undefined,
      driverExecution: { status: 'idle' },
      scenarioExecution: { status: 'idle', stepResults: [] },
    })
    expect(PlaygroundWorkbenchProgram).toBeDefined()
  })

  it('updates layout, editor and inspector selections through reducer actions', async () => {
    const state = await readWorkbenchState(
      Effect.gen(function* () {
        const workbench = yield* Effect.service(PlaygroundWorkbench.tag).pipe(Effect.orDie)
        yield* workbench.dispatch({ _tag: 'resizeWorkbenchLayout', payload: { filesWidth: 180, bottomHeight: 96 } })
        yield* workbench.dispatch({ _tag: 'setWorkbenchCollapsed', payload: { filesCollapsed: true, bottomCollapsed: true } })
        yield* workbench.dispatch({
          _tag: 'setEditorHostState',
          payload: {
            engine: 'monaco',
            activeModelUri: 'file:///src/main.program.ts',
            languageServiceStatus: 'ready',
            typeBundleStatus: 'ready',
            fallbackReason: undefined,
            loadedTypePackages: ['@logixjs/core', 'effect'],
            diagnostics: [],
          },
        })
        yield* workbench.dispatch({ _tag: 'selectInspectorTab', payload: 'actions' })
        yield* workbench.dispatch({ _tag: 'setAdvancedDispatchExpanded', payload: true })
        yield* workbench.dispatch({ _tag: 'selectDriver', payload: 'increase' })
        yield* workbench.dispatch({ _tag: 'setDriverExecution', payload: { status: 'running', driverId: 'increase' } })
        yield* workbench.dispatch({ _tag: 'setDriverExecution', payload: { status: 'passed', driverId: 'increase' } })
        yield* workbench.dispatch({ _tag: 'selectScenario', payload: 'counter-demo' })
        yield* workbench.dispatch({
          _tag: 'setScenarioExecution',
          payload: {
            status: 'running',
            scenarioRunId: 'scenario-run-1',
            scenarioId: 'counter-demo',
            stepResults: [{ stepId: 'increase-once', kind: 'driver', status: 'passed', durationMs: 1 }],
          },
        })
      }),
    )

    expect(state.layout).toEqual({
      filesWidth: 180,
      inspectorWidth: 340,
      bottomHeight: 96,
      filesCollapsed: true,
      bottomCollapsed: true,
    })
    expect(state.editor).toMatchObject({
      engine: 'monaco',
      activeModelUri: 'file:///src/main.program.ts',
      languageServiceStatus: 'ready',
      typeBundleStatus: 'ready',
      loadedTypePackages: ['@logixjs/core', 'effect'],
    })
    expect(state.inspector).toEqual({
      activeInspectorTab: 'actions',
      advancedDispatchExpanded: true,
      selectedDriverId: 'increase',
      selectedScenarioId: 'counter-demo',
      driverExecution: { status: 'passed', driverId: 'increase' },
      scenarioExecution: {
        status: 'running',
        scenarioRunId: 'scenario-run-1',
        scenarioId: 'counter-demo',
        stepResults: [{ stepId: 'increase-once', kind: 'driver', status: 'passed', durationMs: 1 }],
      },
    })
  })

  it('keeps workbench host state serializable through the state schema', () => {
    const decoded = Schema.decodeUnknownSync(WorkbenchStateSchema as never)(
      initialPlaygroundWorkbenchState,
    ) as typeof initialPlaygroundWorkbenchState
    expect(decoded.layout.bottomHeight).toBe(192)
    expect(decoded.editor.engine).toBe('textarea')
    expect(decoded.inspector.activeInspectorTab).toBe('actions')
    expect(() => Schema.decodeUnknownSync(WorkbenchStateSchema as never)({
      ...initialPlaygroundWorkbenchState,
      inspector: {
        ...initialPlaygroundWorkbenchState.inspector,
        activeInspectorTab: 'state',
      },
    })).toThrow()
  })

  it('stores runtime evidence envelopes by operation lane', async () => {
    const state = await readWorkbenchState(
      Effect.gen(function* () {
        const workbench = yield* Effect.service(PlaygroundWorkbench.tag).pipe(Effect.orDie)
        yield* workbench.dispatch({
          _tag: 'recordRuntimeEvidence',
          payload: {
            lane: 'reflect',
            evidence: {
              kind: 'runtimeEvidence',
              sourceDigest: 'playground-source:1',
              sourceRevision: 0,
              operationKind: 'reflect',
              operationCoordinate: { instanceId: 'p:r0', txnSeq: 0, opSeq: 1 },
              operationEvents: [],
              sourceRefs: [],
              artifactRefs: [],
              evidenceGaps: [],
            },
          },
        })
      }),
    )

    expect(state.runtimeEvidence.reflect?.sourceDigest).toBe('playground-source:1')
  })
})
