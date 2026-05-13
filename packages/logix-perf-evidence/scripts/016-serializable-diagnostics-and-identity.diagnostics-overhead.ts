import { Effect, Layer } from 'effect'
import { performance } from 'node:perf_hooks'
import * as Logix from '@logixjs/core'

const now = () => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarizeQuantiles = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly p50: number; readonly p95: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
  }
}

const gcIfAvailable = (): void => {
  if (typeof (globalThis as any).gc === 'function') {
    ;(globalThis as any).gc()
  }
}

const heapUsed = (): number => process.memoryUsage().heapUsed

type Level = Logix.Debug.DiagnosticsLevel

const makeLayer = (level: Level, bufferSize: number): Layer.Layer<any, never, never> => {
  if (level === 'off') {
    return Logix.Debug.noopLayer as unknown as Layer.Layer<any, never, never>
  }
  return Logix.Debug.devtoolsHubLayer({
    bufferSize,
    diagnosticsLevel: level,
  }) as Layer.Layer<any, never, never>
}

const makeProgram = (params: {
  readonly moduleId: string
  readonly instanceCount: number
  readonly txnCount: number
  readonly eventsPerTxn: number
}): Effect.Effect<void> =>
  Effect.gen(function* () {
    const instances: ReadonlyArray<{ readonly instanceId: string }> = Array.from(
      { length: Math.max(0, params.instanceCount) },
      (_, i) => {
        const instanceId = `i${i + 1}`
        return { instanceId }
      },
    )

    for (const { instanceId } of instances) {
      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId: params.moduleId,
        instanceId,
      } as any)
    }

    for (const { instanceId } of instances) {
      for (let txnSeq = 1; txnSeq <= params.txnCount; txnSeq++) {
        const txnId = `${instanceId}::t${txnSeq}`

        // 事件 1：state:update（覆盖 JsonValue 投影/预算路径）
        yield* Logix.Debug.record({
          type: 'state:update',
          moduleId: params.moduleId,
          instanceId,
          txnSeq,
          txnId,
          state: { n: txnSeq },
          patchCount: 1,
          originKind: 'perf',
          originName: 'state:update',
        } as any)

        const extra = Math.max(0, params.eventsPerTxn - 1)
        for (let k = 0; k < extra; k++) {
          const opSeq = txnSeq * 100 + (k + 1)
          yield* Logix.Debug.record({
            type: 'trace:effectop',
            moduleId: params.moduleId,
            instanceId,
            txnSeq,
            data: {
              id: `${instanceId}::o${opSeq}`,
              kind: 'service',
              name: 'perf-op',
              payload: { n: txnSeq },
              meta: {
                moduleId: params.moduleId,
                instanceId,
                txnSeq,
                txnId,
                opSeq,
              },
            },
          } as any)
        }
      }
    }

    for (const { instanceId } of instances) {
      yield* Logix.Debug.record({
        type: 'module:destroy',
        moduleId: params.moduleId,
        instanceId,
      } as any)
    }
  })

const main = async (): Promise<void> => {
  const RUNS = Number.parseInt(process.env.RUNS ?? '30', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '5', 10)
  const INSTANCE_COUNT = Number.parseInt(process.env.INSTANCE_COUNT ?? '1', 10)
  const TXN_COUNT = Number.parseInt(process.env.TXN_COUNT ?? '10000', 10)
  const EVENTS_PER_TXN = Number.parseInt(process.env.EVENTS_PER_TXN ?? '1', 10)
  const BUFFER_SIZE = Number.parseInt(process.env.BUFFER_SIZE ?? '500', 10)

  const MODULE_ID = 'Perf016DiagnosticsOverhead'

  const levels: ReadonlyArray<Level> = ['off', 'light', 'full']

  const runLevel = async (
    level: Level,
  ): Promise<{
    readonly level: Level
    readonly runs: number
    readonly warmupDiscard: number
    readonly samplesMs: ReadonlyArray<number>
    readonly heapDeltaBytesSamples: ReadonlyArray<number>
    readonly timeMs: { readonly n: number; readonly p50: number; readonly p95: number }
    readonly heapDeltaBytes: { readonly p50: number; readonly p95: number }
  }> => {
    const layer = Layer.mergeAll(Logix.Debug.runtimeLabel('perf'), makeLayer(level, BUFFER_SIZE)) as Layer.Layer<
      any,
      never,
      never
    >

    const program = makeProgram({
      moduleId: MODULE_ID,
      instanceCount: INSTANCE_COUNT,
      txnCount: TXN_COUNT,
      eventsPerTxn: EVENTS_PER_TXN,
    })

    const samples: number[] = []
    const heaps: number[] = []

    for (let i = 0; i < RUNS; i++) {
      Logix.Debug.clearDevtoolsEvents()
      gcIfAvailable()
      const heapBefore = heapUsed()

      const start = now()
      await Effect.runPromise(program.pipe(Effect.provide(layer)))
      const end = now()

      gcIfAvailable()
      const heapAfter = heapUsed()

      samples.push(end - start)
      heaps.push(heapAfter - heapBefore)
    }

    const trimmedSamples = samples.slice(Math.min(WARMUP_DISCARD, samples.length))
    const trimmedHeaps = heaps.slice(Math.min(WARMUP_DISCARD, heaps.length))
    const timeStats = summarizeQuantiles(trimmedSamples)
    const heapStats = summarizeQuantiles(trimmedHeaps)

    return {
      level,
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      samplesMs: trimmedSamples,
      heapDeltaBytesSamples: trimmedHeaps,
      timeMs: timeStats,
      heapDeltaBytes: heapStats,
    }
  }

  const results = await Promise.all(levels.map(runLevel))

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        meta: {
          node: process.version,
          platform: `${process.platform}/${process.arch}`,
          runs: RUNS,
          warmupDiscard: WARMUP_DISCARD,
          instanceCount: INSTANCE_COUNT,
          txnCount: TXN_COUNT,
          eventsPerTxn: EVENTS_PER_TXN,
          bufferSize: BUFFER_SIZE,
          gc: typeof (globalThis as any).gc === 'function',
        },
        levels: results,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
