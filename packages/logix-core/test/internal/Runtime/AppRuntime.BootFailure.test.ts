import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as AppRuntimeImpl from '../../../src/internal/runtime/AppRuntime.js'

describe('AppRuntime boot failure report', () => {
  it('locates the failed stage and reason code when base env build fails', async () => {
    const Module = Logix.Module.make('AssemblyGraph.Failure.Module', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    const app = AppRuntimeImpl.makeApp({
      layer: Layer.fail(new Error('injected base-layer failure')) as unknown as Layer.Layer<never, never, never>,
      modules: [AppRuntimeImpl.provide(Module.tag, Module.live({ value: 1 }))],
      processes: [],
    })

    const runtime = app.makeRuntime()
    await expect(runtime.runPromise(Effect.void)).rejects.toBeDefined()

    const report = AppRuntimeImpl.getAssemblyReport(app)
    expect(report).toBeDefined()
    if (!report) return

    expect(report.success).toBe(false)
    expect(report.failure).toBeDefined()
    expect(report.failure?.stageId).toBe('build.baseEnv')
    expect(report.failure?.reasonCode).toBe('boot::base_layer_build_failed')
    expect(report.failure?.upstreamStages).toEqual(['build.baseLayer'])
    expect(report.rootContextLifecycle.state).toBe('uninitialized')

    const mergeStage = report.nodes.find((node) => node.stageId === 'rootContext.merge')
    const readyStage = report.nodes.find((node) => node.stageId === 'rootContext.ready')
    expect(mergeStage?.status).toBe('skipped')
    expect(readyStage?.status).toBe('skipped')
  })
})
