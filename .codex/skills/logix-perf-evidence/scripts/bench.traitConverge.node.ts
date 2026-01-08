import { Effect, Layer, Schema } from 'effect'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import * as Logix from '@logixjs/core'
import * as CoreNg from '@logixjs/core-ng'

type Primitive = string | number | boolean

type ProfileConfig = {
  readonly runs: number
  readonly warmupDiscard: number
  readonly timeoutMs: number
}

type PerfMatrix = {
  readonly id: string
  readonly defaults: {
    readonly runs: number
    readonly warmupDiscard: number
    readonly timeoutMs: number
    readonly stability?: {
      readonly maxP95DeltaRatio: number
      readonly maxP95DeltaMs: number
    }
    readonly profiles?: Record<string, ProfileConfig>
  }
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly title?: string
    readonly priority?: 'P1' | 'P2' | 'P3'
    readonly primaryAxis: string
    readonly axes: Record<string, ReadonlyArray<Primitive>>
    readonly metrics: ReadonlyArray<string>
    readonly budgets?: ReadonlyArray<unknown>
  }>
}

type MetricResult =
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'ok'
      readonly stats: {
        readonly n: number
        readonly medianMs: number
        readonly p95Ms: number
      }
    }
  | {
      readonly name: string
      readonly unit: 'ms'
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

type EvidenceResult =
  | {
      readonly name: string
      readonly unit: 'count' | 'ratio' | 'bytes' | 'string'
      readonly status: 'ok'
      readonly value: number | string
    }
  | {
      readonly name: string
      readonly unit: 'count' | 'ratio' | 'bytes' | 'string'
      readonly status: 'unavailable'
      readonly unavailableReason: string
    }

type PointResult = {
  readonly params: Record<string, Primitive>
  readonly status: 'ok' | 'timeout' | 'failed' | 'skipped'
  readonly reason?: string
  readonly metrics: ReadonlyArray<MetricResult>
  readonly evidence?: ReadonlyArray<EvidenceResult>
}

type PerfReport = {
  readonly schemaVersion: number
  readonly meta: {
    readonly createdAt: string
    readonly generator: string
    readonly matrixId: string
    readonly matrixUpdatedAt?: string
    readonly matrixHash?: string
    readonly git?: {
      readonly branch?: string
      readonly commit?: string
      readonly dirty?: boolean
    }
    readonly config: {
      readonly runs: number
      readonly warmupDiscard: number
      readonly timeoutMs: number
      readonly profile?: string
      readonly stability?: {
        readonly maxP95DeltaRatio: number
        readonly maxP95DeltaMs: number
      }
      readonly controlPlane?: {
        readonly traitConvergeBudgetMs?: number
        readonly traitConvergeDecisionBudgetMs?: number
        readonly tuningId?: string
      }
    }
    readonly env: {
      readonly os: string
      readonly arch: string
      readonly node: string
      readonly pnpm?: string
      readonly vitest?: string
      readonly playwright?: string
      readonly browser: {
        readonly name: string
        readonly version?: string
        readonly headless?: boolean
      }
    }
  }
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly title?: string
    readonly priority?: 'P1' | 'P2' | 'P3'
    readonly primaryAxis?: string
    readonly budgets?: ReadonlyArray<unknown>
    readonly metricCategories?: Record<string, 'e2e' | 'runtime' | 'diagnostics'>
    readonly points: ReadonlyArray<PointResult>
  }>
}

const nowMs = (): number => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarizeMs = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly medianMs: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

const summarizeBytes = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly median: number; readonly p95: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
  }
}

const gcIfAvailable = (): void => {
  if (typeof (globalThis as any).gc === 'function') {
    ;(globalThis as any).gc()
  }
}

const heapUsed = (): number => process.memoryUsage().heapUsed

const safeExec = (cmd: string, args: ReadonlyArray<string>): string | undefined => {
  try {
    return execFileSync(cmd, [...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

const readGitMeta = (): PerfReport['meta']['git'] | undefined => {
  const branch = safeExec('git', ['branch', '--show-current'])
  const commit = safeExec('git', ['rev-parse', 'HEAD'])
  const dirty = safeExec('git', ['status', '--porcelain'])
  if (!branch && !commit && dirty == null) return undefined
  return {
    branch: branch || undefined,
    commit: commit || undefined,
    dirty: dirty != null ? dirty.length > 0 : undefined,
  }
}

const parsePositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const n = Number(trimmed)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

const readPerfKernelIdFromEnv = (): Logix.Kernel.KernelId | undefined => {
  const raw = process.env.LOGIX_PERF_KERNEL_ID ?? process.env.VITE_LOGIX_PERF_KERNEL_ID
  if (raw === 'core') return 'core'
  if (raw === 'core-ng') return 'core-ng'
  return 'core'
}

type PerfExecVmModeOverride = 'off' | 'on'

const readPerfExecVmModeOverrideFromEnv = (): PerfExecVmModeOverride | undefined => {
  const raw = process.env.LOGIX_PERF_EXEC_VM_MODE ?? process.env.VITE_LOGIX_PERF_EXEC_VM_MODE
  if (raw == null) return undefined

  const normalized = raw.trim().toLowerCase()
  if (normalized === '' || normalized === 'default') return undefined

  if (normalized === 'off' || normalized === '0' || normalized === 'false' || normalized === 'disabled') return 'off'
  if (normalized === 'on' || normalized === '1' || normalized === 'true' || normalized === 'enabled') return 'on'

  throw new Error(`Unknown LOGIX_PERF_EXEC_VM_MODE: ${raw}`)
}

const parseEnabledFlag = (raw: string): boolean => {
  const normalized = raw.trim().toLowerCase()
  return normalized !== 'off' && normalized !== '0' && normalized !== 'false' && normalized !== 'disabled'
}

const readExecVmModeForEvidence = (): 'on' | 'off' => {
  const kernelId = readPerfKernelIdFromEnv()

  if (kernelId === 'core-ng') {
    const raw = process.env.LOGIX_CORE_NG_EXEC_VM_MODE ?? process.env.VITE_LOGIX_CORE_NG_EXEC_VM_MODE
    const enabled = raw == null ? true : parseEnabledFlag(raw)
    return enabled ? 'on' : 'off'
  }

  const override = readPerfExecVmModeOverrideFromEnv()
  return override === 'on' ? 'on' : 'off'
}

type PerfTxnLanesMode = 'default' | 'off' | 'on' | 'forced_off' | 'forced_sync'

const readPerfTxnLanesPatchFromEnv = (): any => {
  const raw = process.env.LOGIX_PERF_TXN_LANES_MODE ?? process.env.VITE_LOGIX_PERF_TXN_LANES_MODE
  if (raw == null) return undefined

  const mode = raw.trim() as PerfTxnLanesMode
  if (mode === '' || mode === 'default') return undefined

  if (mode === 'off') return { enabled: false }
  if (mode === 'on') return { enabled: true }
  if (mode === 'forced_off') return { overrideMode: 'forced_off' }
  if (mode === 'forced_sync') return { overrideMode: 'forced_sync' }

  throw new Error(`Unknown LOGIX_PERF_TXN_LANES_MODE: ${raw}`)
}

const makePerfKernelLayer = (): Layer.Layer<any, never, never> => {
  const kernelId = readPerfKernelIdFromEnv()
  if (kernelId !== 'core-ng') return Layer.empty as Layer.Layer<any, never, never>

  return CoreNg.coreNgFullCutoverLayer({
    capabilities: ['perf:fullCutover'],
  }) as Layer.Layer<any, never, never>
}

const makePerfExecVmModeLayer = (): Layer.Layer<any, never, never> => {
  const kernelId = readPerfKernelIdFromEnv()
  if (kernelId === 'core-ng') return Layer.empty as Layer.Layer<any, never, never>

  const override = readPerfExecVmModeOverrideFromEnv()
  if (override == null) return Layer.empty as Layer.Layer<any, never, never>

  return Logix.InternalContracts.execVmModeLayer(override === 'on') as Layer.Layer<any, never, never>
}

const readControlPlaneFromEnv = (): NonNullable<PerfReport['meta']['config']['controlPlane']> => ({
  traitConvergeBudgetMs: parsePositiveNumber(
    process.env.LOGIX_TRAIT_CONVERGE_BUDGET_MS ?? process.env.VITE_LOGIX_TRAIT_CONVERGE_BUDGET_MS,
  ),
  traitConvergeDecisionBudgetMs: parsePositiveNumber(
    process.env.LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS ?? process.env.VITE_LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS,
  ),
  tuningId:
    typeof process.env.LOGIX_PERF_TUNING_ID === 'string' && process.env.LOGIX_PERF_TUNING_ID.trim().length > 0
      ? process.env.LOGIX_PERF_TUNING_ID.trim()
      : typeof process.env.VITE_LOGIX_PERF_TUNING_ID === 'string' &&
          process.env.VITE_LOGIX_PERF_TUNING_ID.trim().length > 0
        ? process.env.VITE_LOGIX_PERF_TUNING_ID.trim()
        : undefined,
})

const parseArgs = (
  argv: ReadonlyArray<string>,
): {
  readonly outFile: string
  readonly profile?: string
  readonly matrixFile: string
  readonly runs?: number
  readonly warmupDiscard?: number
  readonly timeoutMs?: number
} => {
  const outFlagIndex = argv.lastIndexOf('--out')
  const profileFlagIndex = argv.lastIndexOf('--profile')
  const matrixFlagIndex = argv.lastIndexOf('--matrix')
  const runsFlagIndex = argv.lastIndexOf('--runs')
  const warmupDiscardFlagIndex = argv.lastIndexOf('--warmupDiscard')
  const timeoutMsFlagIndex = argv.lastIndexOf('--timeoutMs')

  const outFile = outFlagIndex >= 0 ? argv[outFlagIndex + 1] : undefined
  const profile = profileFlagIndex >= 0 ? argv[profileFlagIndex + 1] : undefined
  const matrixFile = matrixFlagIndex >= 0 ? argv[matrixFlagIndex + 1] : undefined
  const runs = runsFlagIndex >= 0 ? argv[runsFlagIndex + 1] : undefined
  const warmupDiscard = warmupDiscardFlagIndex >= 0 ? argv[warmupDiscardFlagIndex + 1] : undefined
  const timeoutMs = timeoutMsFlagIndex >= 0 ? argv[timeoutMsFlagIndex + 1] : undefined

  if (outFlagIndex >= 0 && (!outFile || outFile.startsWith('--'))) {
    throw new Error('Missing value for --out')
  }
  if (profileFlagIndex >= 0 && (!profile || profile.startsWith('--'))) {
    throw new Error('Missing value for --profile')
  }
  if (matrixFlagIndex >= 0 && (!matrixFile || matrixFile.startsWith('--'))) {
    throw new Error('Missing value for --matrix')
  }
  if (runsFlagIndex >= 0 && (!runs || runs.startsWith('--'))) {
    throw new Error('Missing value for --runs')
  }
  if (warmupDiscardFlagIndex >= 0 && (!warmupDiscard || warmupDiscard.startsWith('--'))) {
    throw new Error('Missing value for --warmupDiscard')
  }
  if (timeoutMsFlagIndex >= 0 && (!timeoutMs || timeoutMs.startsWith('--'))) {
    throw new Error('Missing value for --timeoutMs')
  }

  const parseIntOpt = (value: string | undefined): number | undefined => {
    if (!value) return undefined
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }

  return {
    outFile: outFile ?? 'perf/after.node.local.json',
    profile: profile || undefined,
    matrixFile: matrixFile ?? '.codex/skills/logix-perf-evidence/assets/matrix.json',
    runs: parseIntOpt(runs),
    warmupDiscard: parseIntOpt(warmupDiscard),
    timeoutMs: parseIntOpt(timeoutMs),
  }
}

type ConvergeRuntime = {
  readonly module: any
  readonly runtime: ReturnType<typeof Logix.Runtime.make>
  readonly bumpReducer: (state: any, action: any) => any
  readonly getLastConvergeDecision: () => unknown | undefined
  readonly clearLastConvergeDecision: () => void
}

const makeConvergeRuntime = (
  steps: number,
  convergeMode: 'full' | 'dirty' | 'auto',
  controlPlane: NonNullable<PerfReport['meta']['config']['controlPlane']>,
  options?: { readonly captureDecision?: boolean },
): ConvergeRuntime => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    fields[`b${i}`] = Schema.Number
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields as any)
  const Actions = { bump: Schema.Number }

  const traits: Record<string, unknown> = {}
  for (let i = 0; i < steps; i++) {
    traits[`d${i}`] = Logix.StateTrait.computed<any, any, any>({
      deps: [`b${i}`] as any,
      get: (value: any) => (value as number) + 1,
    }) as any
  }

  const M = Logix.Module.make(`PerfConvergeSteps${steps}`, {
    state: State as any,
    actions: Actions,
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

  const bumpReducer = Logix.Module.Reducer.mutate((draft: any, action: { readonly payload: number }) => {
    const dirtyRoots = action.payload
    for (let i = 0; i < dirtyRoots; i++) {
      const k = `b${i}`
      draft[k] = (draft[k] as number) + 1
    }
  })

  let lastDecision: unknown | undefined
  const clearLastConvergeDecision = (): void => {
    lastDecision = undefined
  }
  const getLastConvergeDecision = (): unknown | undefined => lastDecision

  const captureSink: Logix.Debug.Sink = {
    record: (event: Logix.Debug.Event) => {
      if (event.type !== 'state:update') return Effect.void
      const decision = (event as any)?.traitSummary?.converge
      if (decision != null) {
        lastDecision = decision
      }
      return Effect.void
    },
  }

  const noopSink: Logix.Debug.Sink = { record: () => Effect.void }
  const debugLayer = Logix.Debug.replace(options?.captureDecision ? [captureSink] : [noopSink]) as Layer.Layer<
    any,
    never,
    never
  >

  const perfKernelLayer = makePerfKernelLayer()
  const perfExecVmModeLayer = makePerfExecVmModeLayer()
  const runtime = Logix.Runtime.make(impl, {
    stateTransaction: {
      instrumentation: 'light',
      traitConvergeMode: convergeMode,
      traitConvergeBudgetMs: controlPlane.traitConvergeBudgetMs,
      traitConvergeDecisionBudgetMs: controlPlane.traitConvergeDecisionBudgetMs,
      txnLanes: readPerfTxnLanesPatchFromEnv(),
    },
    layer: Layer.mergeAll(debugLayer, perfKernelLayer, perfExecVmModeLayer) as Layer.Layer<any, never, never>,
    label: [
      `perf:converge:${convergeMode}:${steps}`,
      controlPlane.tuningId ? `tuning:${controlPlane.tuningId}` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  })

  return {
    module: M as any,
    runtime,
    bumpReducer,
    getLastConvergeDecision,
    clearLastConvergeDecision,
  }
}

const runConvergeTxnCommit = (rt: ConvergeRuntime, dirtyRoots: number): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const moduleScope = (yield* rt.module.tag) as any

    yield* Logix.InternalContracts.runWithStateTransaction(
      moduleScope,
      { kind: 'perf', name: 'converge:txnCommit' },
      () =>
        Effect.gen(function* () {
          const prev = yield* moduleScope.getState
          const next = rt.bumpReducer(prev, { _tag: 'bump', payload: dirtyRoots } as any)
          yield* moduleScope.setState(next)

          for (let i = 0; i < dirtyRoots; i++) {
            Logix.InternalContracts.recordStatePatch(moduleScope, `b${i}`, 'perf:dirty-root')
          }
        }),
    )
  }) as Effect.Effect<void, never, any>

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T

const withTimeout = async <A>(
  timeoutMs: number,
  run: () => Promise<A>,
): Promise<{ readonly ok: true; readonly value: A } | { readonly ok: false; readonly reason: 'timeout' }> => {
  if (timeoutMs <= 0) return { ok: false, reason: 'timeout' }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const value = await Promise.race([
      run(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      }),
    ])
    return { ok: true, value }
  } catch (e) {
    if (e instanceof Error && e.message === 'timeout') {
      return { ok: false, reason: 'timeout' }
    }
    throw e
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const main = async (): Promise<void> => {
  process.env.NODE_ENV = 'production'

  const args = parseArgs(process.argv.slice(2))
  const { outFile, profile, matrixFile } = args

  const matrixText = await readFile(matrixFile, 'utf8')
  const matrixHash = createHash('sha256').update(matrixText).digest('hex')
  const matrix = JSON.parse(matrixText) as PerfMatrix
  const matrixUpdatedAt = (() => {
    const updatedAtRaw: unknown = (matrix as any).updatedAt
    return typeof updatedAtRaw === 'string' && updatedAtRaw.length > 0 ? updatedAtRaw : undefined
  })()
  const suite = matrix.suites.find((s) => s.id === 'converge.txnCommit')
  if (!suite) {
    throw new Error(`Missing suite converge.txnCommit in matrix: ${matrixFile}`)
  }

  const profiles = matrix.defaults.profiles ?? {}
  const selectedProfile = profile && profiles[profile] ? profiles[profile]! : undefined
  const runs = args.runs ?? selectedProfile?.runs ?? matrix.defaults.runs
  const warmupDiscard = args.warmupDiscard ?? selectedProfile?.warmupDiscard ?? matrix.defaults.warmupDiscard
  const timeoutMs = args.timeoutMs ?? selectedProfile?.timeoutMs ?? matrix.defaults.timeoutMs

  const rawControlPlane = readControlPlaneFromEnv()
  const controlPlane: NonNullable<PerfReport['meta']['config']['controlPlane']> = {
    traitConvergeBudgetMs: rawControlPlane.traitConvergeBudgetMs ?? 10_000,
    traitConvergeDecisionBudgetMs: rawControlPlane.traitConvergeDecisionBudgetMs ?? 10_000,
    tuningId: rawControlPlane.tuningId,
  }

  const convergeModes = (suite.axes.convergeMode ?? []) as Array<'full' | 'dirty' | 'auto'>
  const stepsLevels = (suite.axes.steps ?? []) as number[]
  const dirtyRootsRatioLevels = (suite.axes.dirtyRootsRatio ?? []) as number[]

  if (convergeModes.length === 0 || stepsLevels.length === 0 || dirtyRootsRatioLevels.length === 0) {
    throw new Error(`Invalid axes for converge.txnCommit in matrix: ${matrixFile}`)
  }

  const points: PointResult[] = []

  const runtimeByKey = new Map<string, ConvergeRuntime>()

  try {
    for (const convergeMode of convergeModes) {
      for (const dirtyRootsRatio of dirtyRootsRatioLevels) {
        for (const steps of stepsLevels) {
          const dirtyRoots = Math.max(1, Math.ceil(steps * dirtyRootsRatio))

          const key = `${convergeMode}:${steps}`
          const cached =
            runtimeByKey.get(key) ??
            makeConvergeRuntime(steps, convergeMode, controlPlane, {
              captureDecision: convergeMode === 'auto',
            })
          runtimeByKey.set(key, cached)

          cached.clearLastConvergeDecision()

          const msSamplesOff: number[] = []
          const msSamplesLight: number[] = []
          const msSamplesFull: number[] = []
          const heapDeltaSamples: number[] = []
          const decisionMsSamples: number[] = []

          let pointStatus: PointResult['status'] = 'ok'
          let pointReason: string | undefined

          const pointStartedAt = nowMs()

          const runOnce = async (
            diagnosticsLevel: 'off' | 'light' | 'full',
            options?: { readonly measureHeap?: boolean },
          ): Promise<{ readonly ms: number; readonly heapDeltaBytes?: number; readonly decisionMs?: number }> => {
            gcIfAvailable()
            const heapBefore = options?.measureHeap ? heapUsed() : 0
            cached.clearLastConvergeDecision()

            const t0 = nowMs()
            await cached.runtime.runPromise(
              runConvergeTxnCommit(cached, dirtyRoots).pipe(
                Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, diagnosticsLevel),
              ) as any,
            )
            const t1 = nowMs()

            gcIfAvailable()
            const heapAfter = options?.measureHeap ? heapUsed() : 0

            const decision = convergeMode === 'auto' ? (cached.getLastConvergeDecision() as any) : undefined

            return {
              ms: t1 - t0,
              heapDeltaBytes: options?.measureHeap ? heapAfter - heapBefore : undefined,
              decisionMs: decision?.decisionDurationMs,
            }
          }

          const runMany = async (
            diagnosticsLevel: 'off' | 'light' | 'full',
            options?: { readonly measureHeap?: boolean },
          ): Promise<void> => {
            for (let runIndex = 0; runIndex < runs; runIndex++) {
              const elapsedMs = nowMs() - pointStartedAt
              const remainingMs = timeoutMs - elapsedMs

              if (remainingMs <= 0) {
                pointStatus = 'timeout'
                pointReason = `pointTimeoutMs=${timeoutMs}`
                break
              }

              const res = await withTimeout(remainingMs, () => runOnce(diagnosticsLevel, options))
              if (!res.ok) {
                pointStatus = 'timeout'
                pointReason = `pointTimeoutMs=${timeoutMs}`
                break
              }

              if (diagnosticsLevel === 'off') {
                const off = res.value
                if (Number.isFinite(off.ms)) msSamplesOff.push(off.ms)
                if (typeof off.heapDeltaBytes === 'number' && Number.isFinite(off.heapDeltaBytes)) {
                  heapDeltaSamples.push(off.heapDeltaBytes)
                }
                if (convergeMode === 'auto' && typeof off.decisionMs === 'number' && Number.isFinite(off.decisionMs)) {
                  decisionMsSamples.push(off.decisionMs)
                }
              } else if (diagnosticsLevel === 'light') {
                const light = res.value
                if (Number.isFinite(light.ms)) msSamplesLight.push(light.ms)
              } else {
                const full = res.value
                if (Number.isFinite(full.ms)) msSamplesFull.push(full.ms)
              }
            }
          }

          // IMPORTANT: Collect diagnostics=off first and in isolation.
          // light/full runs can allocate heavily (e.g. trait decision heavy details), which can skew later off runs via GC.
          await runMany('off', { measureHeap: true })
          if (pointStatus === 'ok') {
            await runMany('light')
          }
          if (pointStatus === 'ok') {
            await runMany('full')
          }

          if (pointStatus !== 'ok') {
            const reason = pointReason ?? pointStatus
            points.push({
              params: { convergeMode, steps, dirtyRootsRatio, dirtyRoots },
              status: pointStatus,
              reason,
              metrics: [
                {
                  name: 'runtime.txnCommitMs',
                  unit: 'ms',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
                {
                  name: 'runtime.decisionMs',
                  unit: 'ms',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
              ],
              evidence: [
                {
                  name: 'runtime.heapDeltaBytes.median',
                  unit: 'bytes',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
                {
                  name: 'runtime.heapDeltaBytes.p95',
                  unit: 'bytes',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
                {
                  name: 'budget.cutOffCount',
                  unit: 'count',
                  status: 'ok',
                  value: 0,
                },
                {
                  name: 'diagnostics.overhead.lightOverOff.txnCommitMs.p95Ratio',
                  unit: 'ratio',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
                {
                  name: 'diagnostics.overhead.fullOverOff.txnCommitMs.p95Ratio',
                  unit: 'ratio',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
                {
                  name: 'diagnostics.overhead.fullOverOff.txnCommitMs.p95DeltaMs',
                  unit: 'count',
                  status: 'unavailable',
                  unavailableReason: reason,
                },
              ],
            })
            continue
          }

          const trimmedOff = msSamplesOff.slice(Math.min(warmupDiscard, msSamplesOff.length))
          const trimmedLight = msSamplesLight.slice(Math.min(warmupDiscard, msSamplesLight.length))
          const trimmedFull = msSamplesFull.slice(Math.min(warmupDiscard, msSamplesFull.length))
          const trimmedHeap = heapDeltaSamples.slice(Math.min(warmupDiscard, heapDeltaSamples.length))
          const trimmedDecision = decisionMsSamples.slice(Math.min(warmupDiscard, decisionMsSamples.length))

          const offMsStats = trimmedOff.length > 0 ? summarizeMs(trimmedOff) : undefined
          const lightMsStats = trimmedLight.length > 0 ? summarizeMs(trimmedLight) : undefined
          const fullMsStats = trimmedFull.length > 0 ? summarizeMs(trimmedFull) : undefined

          const metrics: MetricResult[] = [
            offMsStats
              ? {
                  name: 'runtime.txnCommitMs',
                  unit: 'ms',
                  status: 'ok',
                  stats: offMsStats,
                }
              : {
                  name: 'runtime.txnCommitMs',
                  unit: 'ms',
                  status: 'unavailable',
                  unavailableReason: msSamplesOff.length === 0 ? 'noSamples' : 'insufficientSamples',
                },
            convergeMode !== 'auto'
              ? {
                  name: 'runtime.decisionMs',
                  unit: 'ms',
                  status: 'unavailable',
                  unavailableReason: 'notApplicable',
                }
              : trimmedDecision.length > 0
                ? {
                    name: 'runtime.decisionMs',
                    unit: 'ms',
                    status: 'ok',
                    stats: summarizeMs(trimmedDecision),
                  }
                : {
                    name: 'runtime.decisionMs',
                    unit: 'ms',
                    status: 'unavailable',
                    unavailableReason: 'decisionMissing',
                  },
          ]

          const evidence: EvidenceResult[] = []
          evidence.push({
            name: 'runtime.execVmMode',
            unit: 'string',
            status: 'ok',
            value: readExecVmModeForEvidence(),
          })

          if (trimmedHeap.length > 0) {
            const heapStats = summarizeBytes(trimmedHeap)
            evidence.push(
              {
                name: 'runtime.heapDeltaBytes.median',
                unit: 'bytes',
                status: 'ok',
                value: heapStats.median,
              },
              {
                name: 'runtime.heapDeltaBytes.p95',
                unit: 'bytes',
                status: 'ok',
                value: heapStats.p95,
              },
            )
          } else {
            evidence.push(
              {
                name: 'runtime.heapDeltaBytes.median',
                unit: 'bytes',
                status: 'unavailable',
                unavailableReason: heapDeltaSamples.length === 0 ? 'noSamples' : 'insufficientSamples',
              },
              {
                name: 'runtime.heapDeltaBytes.p95',
                unit: 'bytes',
                status: 'unavailable',
                unavailableReason: heapDeltaSamples.length === 0 ? 'noSamples' : 'insufficientSamples',
              },
            )
          }

          evidence.push({
            name: 'budget.cutOffCount',
            unit: 'count',
            status: 'ok',
            value: 0,
          })

          const pushOverheadRatio = (
            name: string,
            numerator: number | undefined,
            denominator: number | undefined,
            kind: 'ratio' | 'deltaRatio' | 'deltaMs',
          ): void => {
            if (typeof numerator !== 'number' || !Number.isFinite(numerator)) {
              evidence.push({
                name,
                unit: kind === 'deltaMs' ? 'count' : 'ratio',
                status: 'unavailable',
                unavailableReason: 'numeratorMissing',
              })
              return
            }
            if (typeof denominator !== 'number' || !Number.isFinite(denominator) || denominator <= 0) {
              evidence.push({
                name,
                unit: kind === 'deltaMs' ? 'count' : 'ratio',
                status: 'unavailable',
                unavailableReason: 'denominatorNonPositive',
              })
              return
            }

            const value =
              kind === 'ratio'
                ? numerator / denominator
                : kind === 'deltaRatio'
                  ? numerator / denominator - 1
                  : numerator - denominator

            evidence.push({
              name,
              unit: kind === 'deltaMs' ? 'count' : 'ratio',
              status: 'ok',
              value,
            })
          }

          pushOverheadRatio(
            'diagnostics.overhead.lightOverOff.txnCommitMs.medianRatio',
            lightMsStats?.medianMs,
            offMsStats?.medianMs,
            'ratio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.lightOverOff.txnCommitMs.medianDeltaRatio',
            lightMsStats?.medianMs,
            offMsStats?.medianMs,
            'deltaRatio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.fullOverOff.txnCommitMs.medianRatio',
            fullMsStats?.medianMs,
            offMsStats?.medianMs,
            'ratio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.fullOverOff.txnCommitMs.medianDeltaRatio',
            fullMsStats?.medianMs,
            offMsStats?.medianMs,
            'deltaRatio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.fullOverOff.txnCommitMs.medianDeltaMs',
            fullMsStats?.medianMs,
            offMsStats?.medianMs,
            'deltaMs',
          )
          pushOverheadRatio(
            'diagnostics.overhead.lightOverOff.txnCommitMs.p95Ratio',
            lightMsStats?.p95Ms,
            offMsStats?.p95Ms,
            'ratio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.lightOverOff.txnCommitMs.p95DeltaRatio',
            lightMsStats?.p95Ms,
            offMsStats?.p95Ms,
            'deltaRatio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.fullOverOff.txnCommitMs.p95Ratio',
            fullMsStats?.p95Ms,
            offMsStats?.p95Ms,
            'ratio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.fullOverOff.txnCommitMs.p95DeltaRatio',
            fullMsStats?.p95Ms,
            offMsStats?.p95Ms,
            'deltaRatio',
          )
          pushOverheadRatio(
            'diagnostics.overhead.fullOverOff.txnCommitMs.p95DeltaMs',
            fullMsStats?.p95Ms,
            offMsStats?.p95Ms,
            'deltaMs',
          )

          points.push({
            params: { convergeMode, steps, dirtyRootsRatio, dirtyRoots },
            status: 'ok',
            metrics,
            evidence,
          })
        }
      }
    }
  } finally {
    await Promise.allSettled(Array.from(runtimeByKey.values()).map((rt) => rt.runtime.dispose()))
  }

  const report: PerfReport = {
    schemaVersion: 1,
    meta: {
      createdAt: new Date().toISOString(),
      generator: '.codex/skills/logix-perf-evidence/scripts/bench.traitConverge.node.ts',
      matrixId: matrix.id,
      matrixUpdatedAt,
      matrixHash,
      git: readGitMeta(),
      config: {
        runs,
        warmupDiscard,
        timeoutMs,
        profile: profile ?? 'matrix.defaults',
        stability: matrix.defaults.stability,
        controlPlane,
      },
      env: {
        os: process.platform,
        arch: process.arch,
        node: process.version,
        pnpm: safeExec('pnpm', ['--version']) || undefined,
        vitest: safeExec('node', ['-e', "console.log(require('vitest/package.json').version)"]) || undefined,
        playwright: safeExec('node', ['-e', "console.log(require('playwright/package.json').version)"]) || undefined,
        browser: { name: 'node', headless: true },
      },
    },
    suites: [
      {
        id: suite.id,
        title: suite.title,
        priority: suite.priority,
        primaryAxis: suite.primaryAxis,
        budgets: suite.budgets,
        metricCategories: {
          'runtime.txnCommitMs': 'runtime',
          'runtime.decisionMs': 'runtime',
        },
        points,
      },
    ],
  }

  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${outFile}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
