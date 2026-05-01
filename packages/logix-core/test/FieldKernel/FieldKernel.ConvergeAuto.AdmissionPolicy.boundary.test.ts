import { describe, expect, it } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import * as Logix from '../../src/index.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

const INPUT_COUNT = 64
const BROAD_WRITE_COUNT = 58
const ANALYZED_SAMPLES = 5

type DecisionSummary = {
  readonly requestedMode: string
  readonly executedMode: string
  readonly reasons: ReadonlyArray<string>
  readonly executionDurationMs?: number
  readonly decisionDurationMs?: number
  readonly stepStats?: {
    readonly executedSteps?: number
    readonly skippedSteps?: number
  }
  readonly dirty?: {
    readonly dirtyAll?: boolean
    readonly reason?: string
    readonly rootCount?: number
  }
}

type ScenarioAggregate = {
  readonly name: string
  readonly writeShape: string
  readonly sampleCount: number
  readonly requestedModes: ReadonlyArray<string>
  readonly executedModes: ReadonlyArray<string>
  readonly reasonCounts: Readonly<Record<string, number>>
  readonly dirtyReasonCounts: Readonly<Record<string, number>>
  readonly dirtyAllCount: number
  readonly medianDirtyRootCount: number
  readonly medianExecutedSteps: number
  readonly medianSkippedSteps: number
  readonly medianExecutionDurationMs: number
  readonly medianDecisionDurationMs: number | null
}

const unique = (values: ReadonlyArray<string>): ReadonlyArray<string> => Array.from(new Set(values)).sort()

const countBy = (values: ReadonlyArray<string>): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {}
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

const median = (values: ReadonlyArray<number>): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000

const formatReasonProfile = (counts: Readonly<Record<string, number>>, total: number): string =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([reason, count]) => `${reason}=${count}/${total}`)
    .join(', ')

const makeAdmissionPolicyFixture = (options: {
  readonly moduleId: string
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly stateTransaction?: RuntimeOptions['stateTransaction']
}) => {
  const shape: Record<string, Schema.Schema<any>> = {}
  for (let i = 0; i < INPUT_COUNT; i++) {
    shape[`in${i}`] = Schema.Number
    shape[`d${i}`] = Schema.Number
  }

  type S = Record<string, number>
  const State = Schema.Struct(shape) as unknown as Schema.Schema<S>

  const Actions = {
    mutateMany: Schema.Array(Schema.String),
    replaceOne: Schema.String,
  }

  const fieldDeclarations: Record<string, any> = {}
  for (let i = 0; i < INPUT_COUNT; i++) {
    const input = `in${i}`
    fieldDeclarations[`d${i}`] = FieldContracts.fieldComputed<any, any, any>({
      deps: [input],
      get: (value: any) => (value as number) + 1,
    })
  }

  const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make(options.moduleId, {
  state: State,
  actions: Actions,
  reducers: {
      mutateMany: Logix.Module.Reducer.mutate((draft: Record<string, number>, keys: ReadonlyArray<string>) => {
        for (const key of keys) {
          const prev = draft[key]
          if (typeof prev === 'number') {
            draft[key] = prev + 1
          }
        }
      }),
      replaceOne: (state: Record<string, number>, action: { readonly _tag: 'replaceOne'; readonly payload: string }) => {
        const key = action.payload
        const prev = state[key]
        if (typeof prev !== 'number') return state
        return { ...state, [key]: prev + 1 }
      },
    }
}), FieldContracts.fieldFrom(State as any)(fieldDeclarations as any))

  const initial: Record<string, number> = {}
  for (let i = 0; i < INPUT_COUNT; i++) {
    initial[`in${i}`] = 0
    initial[`d${i}`] = 1
  }

  const programModule = Logix.Program.make(M, {
    initial,
    logics: [],
  })

  const ring = Debug.makeRingBufferSink(2048)
  const layer = Layer.mergeAll(
    Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
    Debug.diagnosticsLevel(options.diagnosticsLevel),
  ) as Layer.Layer<any, never, never>

  const runtime = Logix.Runtime.make(programModule, {
    layer,
    stateTransaction: options.stateTransaction,
  })

  return { M, runtime, ring }
}

const pickDecisionSummaries = (ring: Debug.RingBufferSink): ReadonlyArray<DecisionSummary> =>
  ring
    .getSnapshot()
    .filter(
      (e): e is Extract<Debug.Event, { readonly type: 'trace:field:converge' }> => e.type === 'trace:field:converge',
    )
    .map((e) => (e as any).data as DecisionSummary)

const summarizeScenario = (name: string, writeShape: string, decisions: ReadonlyArray<DecisionSummary>): ScenarioAggregate => {
  const executionDurations = decisions
    .map((d) => d.executionDurationMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const decisionDurations = decisions
    .map((d) => d.decisionDurationMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const dirtyReasons = decisions
    .map((d) => d.dirty?.reason)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)

  return {
    name,
    writeShape,
    sampleCount: decisions.length,
    requestedModes: unique(decisions.map((d) => d.requestedMode)),
    executedModes: unique(decisions.map((d) => d.executedMode)),
    reasonCounts: countBy(decisions.flatMap((d) => [...d.reasons])),
    dirtyReasonCounts: countBy(dirtyReasons),
    dirtyAllCount: decisions.filter((d) => d.dirty?.dirtyAll === true).length,
    medianDirtyRootCount: median(decisions.map((d) => d.dirty?.rootCount ?? 0)),
    medianExecutedSteps: median(decisions.map((d) => d.stepStats?.executedSteps ?? 0)),
    medianSkippedSteps: median(decisions.map((d) => d.stepStats?.skippedSteps ?? 0)),
    medianExecutionDurationMs: round3(median(executionDurations)),
    medianDecisionDurationMs: decisionDurations.length > 0 ? round3(median(decisionDurations)) : null,
  }
}

const broadKeys = Array.from({ length: BROAD_WRITE_COUNT }, (_, i) => `in${i}`)

const printAdmissionPolicyTable = (summaries: ReadonlyArray<ScenarioAggregate>): void => {
  console.table(
    summaries.map((summary) => ({
      scenario: summary.name,
      writeShape: summary.writeShape,
      requestedMode: summary.requestedModes.join('|'),
      executedMode: summary.executedModes.join('|'),
      reasons: formatReasonProfile(summary.reasonCounts, summary.sampleCount),
      dirtyReason:
        Object.keys(summary.dirtyReasonCounts).length > 0
          ? formatReasonProfile(summary.dirtyReasonCounts, summary.sampleCount)
          : '-',
      dirtyAll: `${summary.dirtyAllCount}/${summary.sampleCount}`,
      dirtyRoots: summary.medianDirtyRootCount,
      executedSteps: summary.medianExecutedSteps,
      skippedSteps: summary.medianSkippedSteps,
      execMs: summary.medianExecutionDurationMs,
      decisionMs: summary.medianDecisionDurationMs ?? '-',
    })),
  )
}

describe('FieldKernel converge auto admission policy boundary', () => {
  it.effect('quantifies unknown_write / dirty_all / near_full against covered single-field writes', () =>
    Effect.gen(function* () {
      type ScenarioRunner = (rt: any) => Effect.Effect<void, any, any>

      const collectScenario = (
        name: string,
        writeShape: string,
        run: ScenarioRunner,
      ): Effect.Effect<ScenarioAggregate, never, never> =>
        Effect.gen(function* () {
          const { M, runtime, ring } = makeAdmissionPolicyFixture({
            moduleId: `FieldKernelConvergeAutoAdmissionPolicy_${name}`,
            diagnosticsLevel: 'light',
            stateTransaction: {
              fieldConvergeMode: 'auto',
              fieldConvergeBudgetMs: 100_000,
              fieldConvergeDecisionBudgetMs: 100_000,
            },
          })

          const decisions: Array<DecisionSummary> = []
          for (let i = 0; i < ANALYZED_SAMPLES + 1; i++) {
            const beforeCount = pickDecisionSummaries(ring).length
            yield* Effect.promise(() =>
              runtime.runPromise(
                Effect.gen(function* () {
                  const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
                  yield* run(rt)
                }),
              ),
            )
            const snapshot = pickDecisionSummaries(ring)
            const latest = snapshot[beforeCount]
            expect(latest).toBeDefined()
            if (i === 0) continue
            decisions.push(latest!)
          }

          return summarizeScenario(name, writeShape, decisions)
        })

      const scenarios = yield* Effect.all(
        [
          collectScenario('covered_single_field', 'Reducer.mutate([in0])', (rt) =>
            rt.dispatch({ _tag: 'mutateMany', payload: ['in0'] } as any),
          ),
          collectScenario('unknown_write_setState', 'setState(single-field, no patch)', (rt) =>
            FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'unknown-write' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, in0: (prev as any)['in0'] + 1 })
              }),
            ),
          ),
          collectScenario('dirty_all_non_trackable', 'setState(single-field) + recordStatePatch(NaN)', (rt) =>
            FieldContracts.runWithStateTransaction(rt, { kind: 'test', name: 'dirty-all' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, in0: (prev as any)['in0'] + 1 })
                FieldContracts.recordStatePatch(rt, Number.NaN as any, 'unknown')
              }),
            ),
          ),
          collectScenario('plain_replace_single_field', 'plain reducer replaceOne(in0)', (rt) =>
            rt.dispatch({ _tag: 'replaceOne', payload: 'in0' } as any),
          ),
          collectScenario('near_full_broad_mutate', `Reducer.mutate(${BROAD_WRITE_COUNT}/${INPUT_COUNT})`, (rt) =>
            rt.dispatch({ _tag: 'mutateMany', payload: broadKeys } as any),
          ),
        ],
        { concurrency: 1 },
      )

      printAdmissionPolicyTable(scenarios)

      const byName = Object.fromEntries(scenarios.map((scenario) => [scenario.name, scenario])) as Record<
        string,
        ScenarioAggregate
      >

      expect(byName.covered_single_field?.requestedModes).toEqual(['auto'])
      expect(byName.covered_single_field?.executedModes).toEqual(['dirty'])
      expect(byName.covered_single_field?.reasonCounts.cache_hit).toBeGreaterThan(0)
      expect(byName.covered_single_field?.medianDirtyRootCount).toBe(1)
      expect(byName.covered_single_field?.dirtyAllCount).toBe(0)
      expect(byName.covered_single_field?.medianExecutedSteps).toBe(1)
      expect(byName.covered_single_field?.medianSkippedSteps).toBe(INPUT_COUNT - 1)

      expect(byName.unknown_write_setState?.requestedModes).toEqual(['auto'])
      expect(byName.unknown_write_setState?.executedModes).toEqual(['dirty'])
      expect(byName.unknown_write_setState?.reasonCounts.cache_hit).toBeGreaterThan(0)
      expect(byName.unknown_write_setState?.dirtyReasonCounts.unknownWrite ?? 0).toBe(0)
      expect(byName.unknown_write_setState?.dirtyAllCount).toBe(0)
      expect(byName.unknown_write_setState?.medianDirtyRootCount).toBe(1)
      expect(byName.unknown_write_setState?.medianExecutedSteps).toBe(1)
      expect(byName.unknown_write_setState?.medianSkippedSteps).toBe(INPUT_COUNT - 1)

      expect(byName.dirty_all_non_trackable?.requestedModes).toEqual(['auto'])
      expect(byName.dirty_all_non_trackable?.executedModes).toEqual(['full'])
      expect(byName.dirty_all_non_trackable?.reasonCounts.dirty_all).toBe(ANALYZED_SAMPLES)
      expect(byName.dirty_all_non_trackable?.reasonCounts.unknown_write).toBe(ANALYZED_SAMPLES)
      expect(byName.dirty_all_non_trackable?.dirtyReasonCounts.nonTrackablePatch).toBe(ANALYZED_SAMPLES)
      expect(byName.dirty_all_non_trackable?.dirtyAllCount).toBe(ANALYZED_SAMPLES)
      expect(byName.dirty_all_non_trackable?.medianDirtyRootCount).toBe(0)
      expect(byName.dirty_all_non_trackable?.medianExecutedSteps).toBe(INPUT_COUNT)
      expect(byName.dirty_all_non_trackable?.medianSkippedSteps).toBe(0)

      expect(byName.plain_replace_single_field?.requestedModes).toEqual(['auto'])
      expect(byName.plain_replace_single_field?.executedModes).toEqual(['dirty'])
      expect(byName.plain_replace_single_field?.reasonCounts.cache_hit).toBeGreaterThan(0)
      expect(byName.plain_replace_single_field?.dirtyAllCount).toBe(0)
      expect(byName.plain_replace_single_field?.medianDirtyRootCount).toBe(1)
      expect(byName.plain_replace_single_field?.medianExecutedSteps).toBe(1)
      expect(byName.plain_replace_single_field?.medianSkippedSteps).toBe(INPUT_COUNT - 1)

      expect(byName.near_full_broad_mutate?.requestedModes).toEqual(['auto'])
      expect(byName.near_full_broad_mutate?.executedModes).toEqual(['full'])
      expect(byName.near_full_broad_mutate?.reasonCounts.near_full).toBe(ANALYZED_SAMPLES)
      expect(byName.near_full_broad_mutate?.dirtyAllCount).toBe(0)
      expect(byName.near_full_broad_mutate?.medianDirtyRootCount).toBeGreaterThanOrEqual(BROAD_WRITE_COUNT)
      expect(byName.near_full_broad_mutate?.medianExecutedSteps).toBe(INPUT_COUNT)
      expect(byName.near_full_broad_mutate?.medianSkippedSteps).toBe(0)

      expect(byName.unknown_write_setState!.medianExecutedSteps).toBe(
        byName.covered_single_field!.medianExecutedSteps,
      )
      expect(byName.dirty_all_non_trackable!.medianExecutedSteps).toBeGreaterThan(
        byName.covered_single_field!.medianExecutedSteps,
      )
      expect(byName.plain_replace_single_field!.medianExecutedSteps).toBe(
        byName.covered_single_field!.medianExecutedSteps,
      )
      expect(byName.near_full_broad_mutate!.medianExecutedSteps).toBeGreaterThan(
        byName.covered_single_field!.medianExecutedSteps,
      )
    }),
  )
})
