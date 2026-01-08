import { Effect, Layer, Schema } from 'effect'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { dirname } from 'node:path'
import * as Logix from '@logixjs/core'

const now = () => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarize = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly medianMs: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

type Scenario = {
  readonly name: string
  readonly initTasks: number
  readonly destroyTasks: number
}

type Mode = 'off' | 'on'

const makeLayer = (mode: Mode): Layer.Layer<any, never, never> => {
  if (mode === 'off') {
    return Logix.Debug.noopLayer as unknown as Layer.Layer<any, never, never>
  }

  return Layer.mergeAll(
    Logix.Debug.runtimeLabel('perf'),
    Logix.Debug.devtoolsHubLayer({
      bufferSize: 500,
      diagnosticsLevel: 'light',
    }),
  ) as Layer.Layer<any, never, never>
}

const makeModule = (scenario: Scenario) => {
  const M = Logix.Module.make(`Perf011Lifecycle:${scenario.name}`, {
    state: Schema.Struct({ n: Schema.Number }),
    actions: {},
  })

  const logic = M.logic(($) => {
    // setup-only 注册：真正执行由 Runtime 统一调度（ModuleRuntime 执行 init/destroy）。
    for (let i = 0; i < scenario.initTasks; i++) {
      $.lifecycle.onInitRequired($.state.update((s) => ({ ...s, n: s.n + 1 })))
    }

    for (let i = 0; i < scenario.destroyTasks; i++) {
      $.lifecycle.onDestroy(Effect.void)
    }

    return Effect.void
  })

  const impl = M.implement({
    initial: { n: 0 },
    logics: [logic],
  })

  return { M, impl }
}

type ScenarioResult = {
  readonly name: string
  readonly initTasks: number
  readonly destroyTasks: number
  readonly runs: number
  readonly warmupDiscard: number
  readonly createInitMs: {
    readonly samplesMs: ReadonlyArray<number>
    readonly stats: { readonly n: number; readonly medianMs: number; readonly p95Ms: number }
  }
  readonly destroyMs: {
    readonly samplesMs: ReadonlyArray<number>
    readonly stats: { readonly n: number; readonly medianMs: number; readonly p95Ms: number }
  }
}

type ModeResult = {
  readonly mode: Mode
  readonly scenarios: ReadonlyArray<ScenarioResult>
}

const main = async (): Promise<void> => {
  const RUNS = Number.parseInt(process.env.RUNS ?? '50', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '10', 10)
  const OUT_FILE = process.env.OUT_FILE ?? 'specs/011-upgrade-lifecycle/perf/after.local.json'

  const OFF_CREATE_INIT_P95_MAX_MS = Number.parseFloat(process.env.OFF_CREATE_INIT_P95_MAX_MS ?? '15')
  const OFF_DESTROY_P95_MAX_MS = Number.parseFloat(process.env.OFF_DESTROY_P95_MAX_MS ?? '15')
  const ON_CREATE_INIT_P95_MAX_MS = Number.parseFloat(process.env.ON_CREATE_INIT_P95_MAX_MS ?? '30')
  const ON_DESTROY_P95_MAX_MS = Number.parseFloat(process.env.ON_DESTROY_P95_MAX_MS ?? '30')
  const ON_OVER_OFF_P95_RATIO_MAX = Number.parseFloat(process.env.ON_OVER_OFF_P95_RATIO_MAX ?? '2')

  const scenarios: ReadonlyArray<Scenario> = [
    { name: 'empty', initTasks: 0, destroyTasks: 0 },
    { name: 'init+destroy(light)', initTasks: 3, destroyTasks: 3 },
    { name: 'init+destroy(medium)', initTasks: 10, destroyTasks: 10 },
  ]

  const runScenario = async (mode: Mode, scenario: Scenario): Promise<ScenarioResult> => {
    const { M, impl } = makeModule(scenario)

    const createInitSamples: number[] = []
    const destroySamples: number[] = []

    for (let i = 0; i < RUNS; i++) {
      if (mode === 'on') {
        Logix.Debug.clearDevtoolsEvents()
      }

      const runtime = Logix.Runtime.make(impl, {
        layer: makeLayer(mode),
      })

      const startCreate = now()
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* M.tag
        }) as Effect.Effect<void, never, any>,
      )
      const endCreate = now()

      await runtime.dispose()
      const endDestroy = now()

      createInitSamples.push(endCreate - startCreate)
      destroySamples.push(endDestroy - endCreate)
    }

    const trimmedCreate = createInitSamples.slice(Math.min(WARMUP_DISCARD, createInitSamples.length))
    const trimmedDestroy = destroySamples.slice(Math.min(WARMUP_DISCARD, destroySamples.length))

    return {
      ...scenario,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      createInitMs: {
        samplesMs: trimmedCreate,
        stats: summarize(trimmedCreate),
      },
      destroyMs: {
        samplesMs: trimmedDestroy,
        stats: summarize(trimmedDestroy),
      },
    }
  }

  const modes: ReadonlyArray<Mode> = ['off', 'on']

  const results: ReadonlyArray<ModeResult> = await Promise.all(
    modes.map(async (mode) => ({
      mode,
      scenarios: await Promise.all(scenarios.map((scenario) => runScenario(mode, scenario))),
    })),
  )

  const violations: Array<{
    readonly mode: Mode
    readonly scenario: string
    readonly metric: 'createInit.p95Ms' | 'destroy.p95Ms'
    readonly valueMs: number
    readonly maxMs: number
  }> = []

  const ratioViolations: Array<{
    readonly scenario: string
    readonly metric: 'createInit.p95Ms' | 'destroy.p95Ms'
    readonly offMs: number
    readonly onMs: number
    readonly ratio: number
    readonly maxRatio: number
  }> = []

  const off = results.find((r) => r.mode === 'off')
  const on = results.find((r) => r.mode === 'on')

  if (off) {
    for (const s of off.scenarios) {
      if (s.createInitMs.stats.p95Ms > OFF_CREATE_INIT_P95_MAX_MS) {
        violations.push({
          mode: 'off',
          scenario: s.name,
          metric: 'createInit.p95Ms',
          valueMs: s.createInitMs.stats.p95Ms,
          maxMs: OFF_CREATE_INIT_P95_MAX_MS,
        })
      }
      if (s.destroyMs.stats.p95Ms > OFF_DESTROY_P95_MAX_MS) {
        violations.push({
          mode: 'off',
          scenario: s.name,
          metric: 'destroy.p95Ms',
          valueMs: s.destroyMs.stats.p95Ms,
          maxMs: OFF_DESTROY_P95_MAX_MS,
        })
      }
    }
  }

  if (on) {
    for (const s of on.scenarios) {
      if (s.createInitMs.stats.p95Ms > ON_CREATE_INIT_P95_MAX_MS) {
        violations.push({
          mode: 'on',
          scenario: s.name,
          metric: 'createInit.p95Ms',
          valueMs: s.createInitMs.stats.p95Ms,
          maxMs: ON_CREATE_INIT_P95_MAX_MS,
        })
      }
      if (s.destroyMs.stats.p95Ms > ON_DESTROY_P95_MAX_MS) {
        violations.push({
          mode: 'on',
          scenario: s.name,
          metric: 'destroy.p95Ms',
          valueMs: s.destroyMs.stats.p95Ms,
          maxMs: ON_DESTROY_P95_MAX_MS,
        })
      }
    }
  }

  if (off && on) {
    for (const offScenario of off.scenarios) {
      const onScenario = on.scenarios.find((s) => s.name === offScenario.name)
      if (!onScenario) continue

      const pairs = [
        {
          metric: 'createInit.p95Ms' as const,
          offMs: offScenario.createInitMs.stats.p95Ms,
          onMs: onScenario.createInitMs.stats.p95Ms,
        },
        {
          metric: 'destroy.p95Ms' as const,
          offMs: offScenario.destroyMs.stats.p95Ms,
          onMs: onScenario.destroyMs.stats.p95Ms,
        },
      ]

      for (const { metric, offMs, onMs } of pairs) {
        const ratio = offMs === 0 ? Number.POSITIVE_INFINITY : onMs / offMs
        if (ratio > ON_OVER_OFF_P95_RATIO_MAX) {
          ratioViolations.push({
            scenario: offScenario.name,
            metric,
            offMs,
            onMs,
            ratio,
            maxRatio: ON_OVER_OFF_P95_RATIO_MAX,
          })
        }
      }
    }
  }

  const payload = {
    meta: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      budgets: {
        off: {
          createInitP95MaxMs: OFF_CREATE_INIT_P95_MAX_MS,
          destroyP95MaxMs: OFF_DESTROY_P95_MAX_MS,
        },
        on: {
          createInitP95MaxMs: ON_CREATE_INIT_P95_MAX_MS,
          destroyP95MaxMs: ON_DESTROY_P95_MAX_MS,
        },
        onOverOffP95RatioMax: ON_OVER_OFF_P95_RATIO_MAX,
      },
    },
    modes: results,
    gate: {
      ok: violations.length === 0 && ratioViolations.length === 0,
      violations: violations.length > 0 ? violations : undefined,
      ratioViolations: ratioViolations.length > 0 ? ratioViolations : undefined,
    },
  } as const

  await mkdir(dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)

  if (!payload.gate.ok) {
    throw new Error(
      `[perf][011-upgrade-lifecycle] gate failed: ` +
        `${violations.length} violations, ${ratioViolations.length} ratio violations. ` +
        `See ${OUT_FILE}.`,
    )
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
