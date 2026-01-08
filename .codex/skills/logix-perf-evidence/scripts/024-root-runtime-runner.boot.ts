import { Effect, Schema } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logixjs/core'

type BenchResult =
  | {
      readonly ok: true
      readonly iterations: number
      readonly totalMs: number
      readonly nsPerOp: number
    }
  | {
      readonly ok: false
      readonly error: string
    }

const now = (): number => performance.now()

const parseOutFile = (argv: ReadonlyArray<string>): string | undefined => {
  const outFlagIndex = argv.lastIndexOf('--out')
  if (outFlagIndex < 0) return undefined

  const outFile = argv[outFlagIndex + 1]
  if (!outFile || outFile.startsWith('--')) {
    throw new Error('Missing value for --out')
  }

  return outFile
}

const bench = async (iterations: number, warmupDiscard: number, runOnce: () => Promise<void>): Promise<BenchResult> => {
  try {
    for (let i = 0; i < Math.min(warmupDiscard, iterations); i++) {
      await runOnce()
    }

    const start = now()
    for (let i = 0; i < iterations; i++) {
      await runOnce()
    }
    const end = now()

    const totalMs = end - start
    const nsPerOp = (totalMs * 1_000_000) / iterations

    return {
      ok: true,
      iterations,
      totalMs,
      nsPerOp,
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

  const iters = Number.parseInt(process.env.ITERS ?? '5000', 10)
  const warmupDiscard = Math.min(200, iters)

  const Root = Logix.Module.make('Perf.RootRuntimeRunner', {
    state: Schema.Struct({ ok: Schema.Boolean }),
    actions: { noop: Schema.Void },
  })

  const RootImpl = Root.implement({
    initial: { ok: true },
    logics: [],
  })

  const manualOnce = async (): Promise<void> => {
    const runtime = Logix.Runtime.make(RootImpl)
    try {
      const moduleRuntime = await runtime.runPromise(Root.tag as any)
      // 对齐 runProgram：manual baseline 也包含 `$`（Bound API）构造成本。
      void Logix.Bound.make(Root.shape as any, moduleRuntime as any)
    } finally {
      await runtime.dispose()
    }
  }

  const runProgramOnce = async (): Promise<void> => {
    await Logix.Runtime.runProgram(
      RootImpl,
      () => Effect.void,
      // 对齐 manual baseline：不安装进程信号监听器，避免把 SIGINT/SIGTERM 处理计入开销。
      { handleSignals: false },
    )
  }

  // NOTE: Run sequentially to avoid cross-interference between benches.
  const manual = await bench(iters, warmupDiscard, manualOnce)
  const runProgram = await bench(iters, warmupDiscard, runProgramOnce)

  const json = {
    meta: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      iters,
      warmupDiscard,
    },
    results: {
      manual,
      runProgram,
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
