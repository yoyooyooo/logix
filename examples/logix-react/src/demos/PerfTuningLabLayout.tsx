import React from 'react'
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useRuntime } from '@logix/react'
import { ComplexTraitFormDemoLayout } from './form/ComplexTraitFormDemoLayout'
import { TraitFormDemoLayout } from './form/TraitFormDemoLayout'
import { ConvergeControlPlanePanel, type ConvergeControlPlaneChange } from '../sections/ConvergeControlPlanePanel'

type MetricStats = {
  readonly n: number
  readonly medianMs: number
  readonly p95Ms: number
}

let nextSnapshotId = 0

const quantile = (values: ReadonlyArray<number>, q: number): number => {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1))
  return sorted[idx] ?? 0
}

const statsOf = (values: ReadonlyArray<number>): MetricStats => ({
  n: values.length,
  medianMs: quantile(values, 0.5),
  p95Ms: quantile(values, 0.95),
})

const formatDelta = (value: number): string => {
  if (!Number.isFinite(value)) return 'n/a'
  const rounded = Math.round(value * 100) / 100
  return (value > 0 ? '+' : '') + String(rounded)
}

const formatControlPlaneSummary = (
  overrides: ConvergeControlPlaneChange['overrides'] | undefined,
  moduleId: string,
): string => {
  if (!overrides) return 'default'
  const parts: string[] = []
  if (overrides.traitConvergeMode) parts.push(`mode=${overrides.traitConvergeMode}`)
  if (typeof overrides.traitConvergeDecisionBudgetMs === 'number') {
    parts.push(`decisionBudgetMs=${String(overrides.traitConvergeDecisionBudgetMs)}`)
  }
  if (typeof overrides.traitConvergeBudgetMs === 'number') {
    parts.push(`budgetMs=${String(overrides.traitConvergeBudgetMs)}`)
  }

  const patch = overrides.traitConvergeOverridesByModuleId?.[moduleId]
  if (patch) {
    const patchParts: string[] = []
    if (patch.traitConvergeMode) patchParts.push(`mode=${patch.traitConvergeMode}`)
    if (typeof patch.traitConvergeDecisionBudgetMs === 'number') {
      patchParts.push(`decisionBudgetMs=${String(patch.traitConvergeDecisionBudgetMs)}`)
    }
    if (typeof patch.traitConvergeBudgetMs === 'number') {
      patchParts.push(`budgetMs=${String(patch.traitConvergeBudgetMs)}`)
    }
    parts.push(`${moduleId}{${patchParts.length > 0 ? patchParts.join(',') : 'empty'}}`)
  }

  return parts.length > 0 ? parts.join(' · ') : 'default'
}

type ConvergeDecision = {
  readonly requestedMode?: string
  readonly executedMode?: string
  readonly outcome?: string
  readonly reasons?: ReadonlyArray<string>
  readonly decisionDurationMs?: number
  readonly executionDurationMs?: number
  readonly stepStats?: {
    readonly totalSteps?: number
    readonly executedSteps?: number
    readonly skippedSteps?: number
    readonly changedSteps?: number
  }
}

type BenchSnapshot = {
  readonly id: string
  readonly atMs: number
  readonly moduleId: string
  readonly config: string
  readonly steps: number
  readonly dirtyRootsRatio: number
  readonly runs: number
  readonly commit: MetricStats
  readonly execution: MetricStats | null
  readonly decision: MetricStats | null
  readonly executedModeSummary: string
  readonly outcomeSummary: string
  readonly reasonSummary: string
}

type BenchBundle = {
  readonly module: BenchModule
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly bumpReducer: (state: any, action: any) => any
  readonly getLastDecision: () => ConvergeDecision | undefined
  readonly clearLastDecision: () => void
}

type BenchTxnScope = Pick<Logix.Module.ModuleRuntime<any, any>, 'getState' | 'setState'>
type BenchModule = Effect.Effect<BenchTxnScope, never, any>

const makeBenchBundle = (steps: number): BenchBundle => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    fields[`b${i}`] = Schema.Number
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)

  const traits: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [`b${i}`] as any,
      get: (value: any) => (value as number) + 1,
    }) as any
  }

  const M = Logix.Module.make(`PerfConvergeSteps${steps}`, {
    state: State as any,
    actions: { bump: Schema.Number },
    traits: Logix.StateTrait.from(State as any)(traits as any) as any,
  })

  const initial: Record<string, number> = {}
  for (let i = 0; i < steps; i++) {
    initial[`b${i}`] = 0
    initial[`d${i}`] = 1
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  const bumpReducer = Logix.Module.Reducer.mutate((draft: Record<string, number>, dirtyRoots: number) => {
    for (let i = 0; i < dirtyRoots; i++) {
      const k = `b${i}`
      draft[k] += 1
    }
  })

  let lastDecision: ConvergeDecision | undefined
  const clearLastDecision = () => {
    lastDecision = undefined
  }
  const getLastDecision = () => lastDecision

  const captureSink: Logix.Debug.Sink = {
    record: (event: Logix.Debug.Event) =>
      Effect.sync(() => {
        if (event.type !== 'state:update') return
        const decision = (event as any)?.traitSummary?.converge as ConvergeDecision | undefined
        if (decision) lastDecision = decision
      }),
  }

  const runtime = Logix.Runtime.make(impl, {
    label: `PerfTuningLab · ConvergeSteps(${steps})`,
    devtools: true,
    layer: Logix.Debug.appendSinks([captureSink]),
  })

  return {
    module: M.tag,
    runtime,
    bumpReducer,
    getLastDecision,
    clearLastDecision,
  }
}

const BenchInner: React.FC<{
  readonly steps: number
  readonly module: BenchModule
  readonly bumpReducer: (state: any, action: any) => any
  readonly getLastDecision: () => ConvergeDecision | undefined
  readonly clearLastDecision: () => void
  readonly overrides?: ConvergeControlPlaneChange['overrides']
  readonly lastSnapshot: BenchSnapshot | null
  readonly setLastSnapshot: React.Dispatch<React.SetStateAction<BenchSnapshot | null>>
  readonly snapshots: ReadonlyArray<BenchSnapshot>
  readonly setSnapshots: React.Dispatch<React.SetStateAction<ReadonlyArray<BenchSnapshot>>>
  readonly baselineId: string | null
  readonly setBaselineId: React.Dispatch<React.SetStateAction<string | null>>
}> = ({
  steps,
  module,
  bumpReducer,
  getLastDecision,
  clearLastDecision,
  overrides,
  lastSnapshot,
  setLastSnapshot,
  snapshots,
  setSnapshots,
  baselineId,
  setBaselineId,
}) => {
  const runtime = useRuntime()

  const [dirtyRootsRatio, setDirtyRootsRatio] = React.useState<number>(0.05)
  const [runs, setRuns] = React.useState<number>(20)

  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const [commitStats, setCommitStats] = React.useState<MetricStats | null>(null)
  const [executionStats, setExecutionStats] = React.useState<MetricStats | null>(null)
  const [decisionStats, setDecisionStats] = React.useState<MetricStats | null>(null)
  const [executedModeSummary, setExecutedModeSummary] = React.useState<string>('（无）')
  const [outcomeSummary, setOutcomeSummary] = React.useState<string>('（无）')
  const [reasonSummary, setReasonSummary] = React.useState<string>('（无）')

  const baseline = React.useMemo(() => {
    if (!baselineId) return null
    return snapshots.find((s) => s.id === baselineId) ?? null
  }, [baselineId, snapshots])

  const doRun = async () => {
    if (isRunning) return
    setError(null)
    setIsRunning(true)
    setProgress(0)
    setCommitStats(null)
    setExecutionStats(null)
    setDecisionStats(null)
    setExecutedModeSummary('（无）')
    setOutcomeSummary('（无）')
    setReasonSummary('（无）')
    setLastSnapshot(null)

    try {
      const n = Math.max(1, Math.min(200, Math.floor(runs)))
      const dirtyRoots = Math.max(1, Math.ceil(steps * dirtyRootsRatio))
      const moduleId = `PerfConvergeSteps${steps}`
      const configSummary = formatControlPlaneSummary(overrides, moduleId)

      const commitDurations: number[] = []
      const executionDurations: number[] = []
      const decisionDurations: number[] = []
      const outcomes: Record<string, number> = {}
      const executedModes: Record<string, number> = {}
      const reasons: Record<string, number> = {}

      // warmup：避开 cold_start 对统计的污染（尤其 runs 较小时）。
      {
        clearLastDecision()

        const op = Effect.gen(function* () {
          const scope = yield* module

          yield* Logix.InternalContracts.runWithStateTransaction(
            scope,
            { kind: 'perf', name: 'converge:txnCommit:warmup' },
            () =>
              Effect.gen(function* () {
                const prev = (yield* scope.getState) as any
                const next = bumpReducer(prev, { _tag: 'bump', payload: dirtyRoots } as any)
                yield* scope.setState(next)
                for (let j = 0; j < dirtyRoots; j++) {
                  Logix.InternalContracts.recordStatePatch(scope, `b${j}`, 'perf')
                }
              }),
          )
        })

        await runtime.runPromise(op as any)
        clearLastDecision()
      }

      for (let i = 0; i < n; i++) {
        clearLastDecision()

        const op = Effect.gen(function* () {
          const scope = yield* module

          yield* Logix.InternalContracts.runWithStateTransaction(
            scope,
            { kind: 'perf', name: 'converge:txnCommit' },
            () =>
              Effect.gen(function* () {
                const prev = (yield* scope.getState) as any
                const next = bumpReducer(prev, { _tag: 'bump', payload: dirtyRoots } as any)
                yield* scope.setState(next)
                for (let j = 0; j < dirtyRoots; j++) {
                  Logix.InternalContracts.recordStatePatch(scope, `b${j}`, 'perf')
                }
              }),
          )
        })

        const start = performance.now()
        await runtime.runPromise(op as any)
        const end = performance.now()
        commitDurations.push(Math.max(0, end - start))

        const decision = getLastDecision()
        const mode = decision?.executedMode ? String(decision.executedMode) : 'unknown'
        executedModes[mode] = (executedModes[mode] ?? 0) + 1

        const outcome = decision?.outcome ? String(decision.outcome) : 'unknown'
        outcomes[outcome] = (outcomes[outcome] ?? 0) + 1

        if (typeof decision?.decisionDurationMs === 'number') {
          decisionDurations.push(Math.max(0, decision.decisionDurationMs))
        }
        if (typeof decision?.executionDurationMs === 'number') {
          executionDurations.push(Math.max(0, decision.executionDurationMs))
        }
        if (Array.isArray(decision?.reasons)) {
          for (const r of decision.reasons) {
            const k = String(r)
            reasons[k] = (reasons[k] ?? 0) + 1
          }
        }

        setProgress(i + 1)
      }

      const nextCommit = statsOf(commitDurations)
      const nextExecution = executionDurations.length > 0 ? statsOf(executionDurations) : null
      const nextDecision = decisionDurations.length > 0 ? statsOf(decisionDurations) : null

      setCommitStats(nextCommit)
      setExecutionStats(nextExecution)
      setDecisionStats(nextDecision)

      const modeSummary = Object.entries(executedModes)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${String(v)}`)
        .join(' · ')
      const nextExecutedModeSummary = modeSummary || '（无）'
      setExecutedModeSummary(nextExecutedModeSummary)

      const outcomeSummaryText = Object.entries(outcomes)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${String(v)}`)
        .join(' · ')
      const nextOutcomeSummary = outcomeSummaryText || '（无）'
      setOutcomeSummary(nextOutcomeSummary)

      const reasonSummaryText = Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v]) => `${k}:${String(v)}`)
        .join(' · ')
      const nextReasonSummary = reasonSummaryText || '（无）'
      setReasonSummary(nextReasonSummary)

      setLastSnapshot({
        id: `snapshot-${++nextSnapshotId}`,
        atMs: Date.now(),
        moduleId,
        config: configSummary,
        steps,
        dirtyRootsRatio,
        runs: n,
        commit: nextCommit,
        execution: nextExecution,
        decision: nextDecision,
        executedModeSummary: nextExecutedModeSummary,
        outcomeSummary: nextOutcomeSummary,
        reasonSummary: nextReasonSummary,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">dirtyRootsRatio</div>
          <select
            value={String(dirtyRootsRatio)}
            onChange={(e) => setDirtyRootsRatio(Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono"
          >
            {[0.005, 0.05, 0.25, 0.75].map((v) => (
              <option key={String(v)} value={String(v)}>
                {String(v)}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">dirtyRoots = max(1, ceil(steps * ratio))</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">runs</div>
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono"
          />
          <div className="text-[11px] text-gray-500 dark:text-gray-400">上限 200（避免卡住页面）</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">run</div>
          <button
            type="button"
            className="w-full px-3 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            disabled={isRunning}
            onClick={() => void doRun()}
          >
            {isRunning
              ? `运行中… ${String(progress)}/${String(Math.max(1, Math.floor(runs)))}`
              : '运行（按当前 steps）'}
          </button>
          {error ? <div className="text-[11px] text-red-600">{error}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">commit wall-time (ms)</div>
          <div className="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">
            {commitStats
              ? `n=${commitStats.n} · median=${commitStats.medianMs.toFixed(2)} · p95=${commitStats.p95Ms.toFixed(2)}`
              : '（未运行）'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">executionDuration (ms)</div>
          <div className="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">
            {executionStats
              ? `n=${executionStats.n} · median=${executionStats.medianMs.toFixed(2)} · p95=${executionStats.p95Ms.toFixed(2)}`
              : '（unavailable）'}
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            converge 内部执行耗时（更贴近 Traits 本身）
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">decisionDuration (ms)</div>
          <div className="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">
            {decisionStats
              ? `n=${decisionStats.n} · median=${decisionStats.medianMs.toFixed(2)} · p95=${decisionStats.p95Ms.toFixed(2)}`
              : '（仅 auto 有意义 / 可能 unavailable）'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">executedMode</div>
          <div className="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">{executedModeSummary}</div>
          <div className="mt-2 text-[11px] font-semibold text-gray-600 dark:text-gray-300">outcome</div>
          <div className="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">{outcomeSummary}</div>
          <div className="mt-2 text-[11px] font-semibold text-gray-600 dark:text-gray-300">top reasons</div>
          <div className="mt-1 font-mono text-xs text-gray-900 dark:text-gray-100">{reasonSummary}</div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            outcome=Degraded 通常意味着预算过紧；cache_hit 多通常是好事
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">结果对比（可选）</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!lastSnapshot}
              className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              onClick={() => {
                if (!lastSnapshot) return
                setSnapshots((prev) => [lastSnapshot, ...prev].slice(0, 12))
                setBaselineId((prev) => prev ?? lastSnapshot.id)
              }}
            >
              保存本次结果
            </button>
            <button
              type="button"
              disabled={snapshots.length === 0}
              className="px-2 py-1 rounded border text-[11px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              onClick={() => {
                setSnapshots([])
                setBaselineId(null)
              }}
            >
              清空
            </button>
            <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
              <span>baseline</span>
              <select
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[11px] font-mono"
                value={baselineId ?? ''}
                onChange={(e) => setBaselineId(e.target.value || null)}
                disabled={snapshots.length === 0}
              >
                <option value="">（未设置）</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.atMs).toLocaleTimeString()} · {s.config}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {baseline && lastSnapshot ? (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
            Δ commit median:{' '}
            <span className="font-mono">{formatDelta(lastSnapshot.commit.medianMs - baseline.commit.medianMs)}ms</span>{' '}
            · Δ p95:{' '}
            <span className="font-mono">{formatDelta(lastSnapshot.commit.p95Ms - baseline.commit.p95Ms)}ms</span>
          </div>
        ) : (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
            保存几次运行后，在这里选择 baseline，就能看到当前结果相对 baseline 的增减。
          </div>
        )}

        {snapshots.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-[11px] font-mono text-gray-800 dark:text-gray-200">
              <thead className="text-gray-600 dark:text-gray-400">
                <tr className="text-left">
                  <th className="py-1 pr-3">time</th>
                  <th className="py-1 pr-3">config</th>
                  <th className="py-1 pr-3">commit(median/p95)</th>
                  <th className="py-1 pr-3">mode</th>
                  <th className="py-1 pr-3">outcome</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => {
                  const isBaseline = baselineId === s.id
                  return (
                    <tr key={s.id} className={isBaseline ? 'text-blue-700 dark:text-blue-300' : undefined}>
                      <td className="py-1 pr-3 whitespace-nowrap">{new Date(s.atMs).toLocaleTimeString()}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{s.config}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">
                        {s.commit.medianMs.toFixed(2)}/{s.commit.p95Ms.toFixed(2)}
                      </td>
                      <td className="py-1 pr-3 whitespace-nowrap">{s.executedModeSummary}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{s.outcomeSummary}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const ConvergeStepsBench: React.FC<{
  readonly layer?: any
  readonly overrides?: ConvergeControlPlaneChange['overrides']
}> = ({ layer, overrides }) => {
  const [steps, setSteps] = React.useState<number>(800)
  const [bundle, setBundle] = React.useState<BenchBundle | null>(null)
  const [isPreparing, setIsPreparing] = React.useState(false)

  const [lastSnapshot, setLastSnapshot] = React.useState<BenchSnapshot | null>(null)
  const [snapshots, setSnapshots] = React.useState<ReadonlyArray<BenchSnapshot>>([])
  const [baselineId, setBaselineId] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (!bundle) return
      void bundle.runtime.dispose().catch(() => {})
    }
  }, [bundle])

  const prepare = React.useCallback(() => {
    if (isPreparing) return
    setIsPreparing(true)

    setTimeout(() => {
      try {
        const next = makeBenchBundle(steps)
        setBundle((prev) => {
          if (prev) {
            void prev.runtime.dispose().catch(() => {})
          }
          return next
        })
      } finally {
        setIsPreparing(false)
      }
    }, 0)
  }, [isPreparing, steps])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            合成压测 · converge.txnCommit（steps × dirtyRootsRatio）
          </h4>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
            用小型合成 workload 快速感知 013 控制面旋钮的影响（只看趋势，不作为最终证据）。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-gray-600 dark:text-gray-400">steps</div>
          <select
            value={String(steps)}
            onChange={(e) => {
              const nextSteps = Number(e.target.value)
              setSteps(nextSteps)
              setBundle((prev) => {
                if (prev) {
                  void prev.runtime.dispose().catch(() => {})
                }
                return null
              })
            }}
            className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono"
          >
            {[200, 800, 2000].map((v) => (
              <option key={String(v)} value={String(v)}>
                {String(v)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bundle ? (
        <RuntimeProvider runtime={bundle.runtime} layer={layer}>
          <BenchInner
            steps={steps}
            module={bundle.module}
            bumpReducer={bundle.bumpReducer}
            getLastDecision={bundle.getLastDecision}
            clearLastDecision={bundle.clearLastDecision}
            overrides={overrides}
            lastSnapshot={lastSnapshot}
            setLastSnapshot={setLastSnapshot}
            snapshots={snapshots}
            setSnapshots={setSnapshots}
            baselineId={baselineId}
            setBaselineId={setBaselineId}
          />
        </RuntimeProvider>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-2">
          <div className="text-sm text-gray-700 dark:text-gray-300">合成 bench 尚未初始化（steps={steps}）。</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            初始化会同步构造一个较大的 Schema/Traits 模块（steps 越大越慢）。为了避免切路由卡顿，这里改为按需初始化。
          </div>
          <div>
            <button
              type="button"
              disabled={isPreparing}
              className="px-3 py-2 rounded border text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              onClick={prepare}
            >
              {isPreparing ? '初始化中…' : '初始化 bench'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const PerfTuningLabLayout: React.FC = () => {
  const [controlPlane, setControlPlane] = React.useState<ConvergeControlPlaneChange>({})
  const [showRealUiSamples, setShowRealUiSamples] = React.useState(false)

  return (
    <div className="space-y-8">
      <section className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Perf Tuning Lab（013 控制面）</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          这里把「控制面调参」与「压力体验」放在同一页：先用合成 bench 看趋势，再用真实 UI 场景（表单 Traits）观察交互与
          Devtools 事件。
        </p>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">怎么读这页的“趋势”</div>
        <ul className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed list-disc pl-5 space-y-1">
          <li>
            主要看 <span className="font-mono">commit wall-time</span>：同一 workload 下越低越好；同时关注{' '}
            <span className="font-mono">p95</span>（尾延迟）。
          </li>
          <li>
            <span className="font-mono">executedMode</span> 表示实际走 <span className="font-mono">full</span>
            （全量派生）还是 <span className="font-mono">dirty</span>（只跑受影响的派生）。
          </li>
          <li>
            <span className="font-mono">outcome=Degraded</span>{' '}
            是红灯：通常表示预算过紧导致“止损回退”，不适合作为默认值。
          </li>
          <li>
            <span className="font-mono">top reasons</span> 用来解释为什么选择该模式：常见如{' '}
            <span className="font-mono">cache_hit/cache_miss</span>、<span className="font-mono">near_full</span>、{' '}
            <span className="font-mono">unknown_write</span>、<span className="font-mono">budget_cutoff</span>。
          </li>
        </ul>
        <div className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
          建议做对比时一次只改一个旋钮，并固定 <span className="font-mono">steps</span> /{' '}
          <span className="font-mono">dirtyRootsRatio</span> / <span className="font-mono">runs</span>
          。想模拟更保守（近似旧行为）可以把 Requested Mode 设为 <span className="font-mono">full</span> 当 baseline。
        </div>
      </section>

      <ConvergeControlPlanePanel
        onChange={setControlPlane}
        knownModuleIds={[
          'TraitFormModule',
          'ComplexFormDemo',
          'PerfConvergeSteps200',
          'PerfConvergeSteps800',
          'PerfConvergeSteps2000',
        ]}
      />

      <section className="space-y-4">
        <ConvergeStepsBench layer={controlPlane.layer} overrides={controlPlane.overrides} />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          真实 UI 压力样本：TraitForm / ComplexTraitForm
        </h3>
        <p className="text-[11px] text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          下面两个示例会继承同一份 Provider 覆盖。建议打开 Devtools，观察{' '}
          <span className="font-mono">state:update</span> 里的 <span className="font-mono">traitSummary.converge</span>
          （executedMode/reasons）。
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-3 py-2 rounded border text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setShowRealUiSamples((v) => !v)}
          >
            {showRealUiSamples ? '隐藏真实 UI 样本' : '加载真实 UI 样本'}
          </button>
          {!showRealUiSamples ? (
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              真实 UI 样本会启动额外 Runtime/模块，默认不挂载以避免切路由卡顿。
            </div>
          ) : null}
        </div>

        {showRealUiSamples ? (
          <div className="space-y-6">
            <TraitFormDemoLayout layer={controlPlane.layer} />
            <ComplexTraitFormDemoLayout layer={controlPlane.layer} />
          </div>
        ) : null}
      </section>
    </div>
  )
}
