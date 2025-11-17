import { Effect, Schema } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logix/core'

type DiagnosticsLevel = 'off' | 'light' | 'full'

type BenchResult =
  | {
      readonly ok: true
      readonly iterations: number
      readonly totalMs: number
      readonly nsPerOp: number
      readonly okCount: number
      readonly avgEventCount: number
      readonly avgReportBytes: number
    }
  | {
      readonly ok: false
      readonly error: string
    }

const now = (): number => performance.now()

const utf8ByteLength = (value: unknown): number => {
  const json = JSON.stringify(value)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length
  }
  return json.length
}

const parseOutFile = (argv: ReadonlyArray<string>): string | undefined => {
  const outFlagIndex = argv.lastIndexOf('--out')
  if (outFlagIndex < 0) return undefined

  const outFile = argv[outFlagIndex + 1]
  if (!outFile || outFile.startsWith('--')) {
    throw new Error('Missing value for --out')
  }

  return outFile
}

const parseDiagnosticsLevel = (value: string | undefined): DiagnosticsLevel => {
  if (!value) return 'light'
  if (value === 'off' || value === 'light' || value === 'full') return value
  throw new Error(`Invalid DIAGNOSTICS_LEVEL: ${value} (expected off|light|full)`)
}

const bench = async (
  iterations: number,
  warmupDiscard: number,
  runOnce: (i: number) => Promise<{ readonly ok: boolean; readonly eventCount: number; readonly reportBytes: number }>,
): Promise<BenchResult> => {
  try {
    for (let i = 0; i < Math.min(warmupDiscard, iterations); i++) {
      await runOnce(-1 - i)
    }

    let okCount = 0
    let eventCountSum = 0
    let reportBytesSum = 0

    const start = now()
    for (let i = 0; i < iterations; i++) {
      const r = await runOnce(i)
      if (r.ok) okCount += 1
      eventCountSum += r.eventCount
      reportBytesSum += r.reportBytes
    }
    const end = now()

    const totalMs = end - start
    const nsPerOp = (totalMs * 1_000_000) / iterations

    return {
      ok: true,
      iterations,
      totalMs,
      nsPerOp,
      okCount,
      avgEventCount: eventCountSum / iterations,
      avgReportBytes: reportBytesSum / iterations,
    }
  } catch (error) {
    return {
      ok: false,
      error: String(error),
    }
  }
}

const main = async (): Promise<unknown> => {
  const argv = process.argv.slice(2)
  const outFile = parseOutFile(argv)

  const iters = Number.parseInt(process.env.ITERS ?? '200', 10)
  const warmupDiscard = Math.min(20, iters)

  const diagnosticsLevel = parseDiagnosticsLevel(process.env.DIAGNOSTICS_LEVEL)
  const maxEvents = Number.parseInt(process.env.MAX_EVENTS ?? '200', 10)
  const trialRunTimeoutMs = Number.parseInt(process.env.TRIAL_RUN_TIMEOUT_MS ?? '3000', 10)
  const closeScopeTimeout = Number.parseInt(process.env.CLOSE_SCOPE_TIMEOUT ?? '1000', 10)
  const reportMaxBytes = Number.parseInt(process.env.REPORT_MAX_BYTES ?? '500000', 10)

  const Root = Logix.Module.make('Perf.IRReflectionLoader.TrialRun', {
    state: Schema.Struct({ ok: Schema.Boolean }),
    actions: { noop: Schema.Void },
  })

  const RootImpl = Root.implement({
    initial: { ok: true },
    logics: [],
  })

  const runOnce = async (
    i: number,
  ): Promise<{
    readonly ok: boolean
    readonly eventCount: number
    readonly reportBytes: number
  }> => {
    const report = await Effect.runPromise(
      Logix.Observability.trialRunModule(RootImpl, {
        runId: `run:perf:025:${i}`,
        source: { host: 'node', label: 'perf:025:trialRunModule' },
        diagnosticsLevel,
        maxEvents,
        trialRunTimeoutMs,
        closeScopeTimeout,
        budgets: { maxBytes: reportMaxBytes },
      }),
    )

    const eventCount = (report as any)?.evidence?.events?.length
    return {
      ok: report.ok,
      eventCount: typeof eventCount === 'number' ? eventCount : 0,
      reportBytes: utf8ByteLength(report),
    }
  }

  const trialRunModule = await bench(iters, warmupDiscard, runOnce)

  const json = {
    meta: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      iters,
      warmupDiscard,
      config: {
        diagnosticsLevel,
        maxEvents,
        trialRunTimeoutMs,
        closeScopeTimeout,
        reportMaxBytes,
      },
    },
    results: {
      trialRunModule,
    },
  }

  if (outFile) {
    await fs.mkdir(path.dirname(outFile), { recursive: true })
    await fs.writeFile(outFile, JSON.stringify(json, null, 2), 'utf8')
  }

  return json
}

main()
  .then((json) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(json, null, 2))
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exitCode = 1
  })
