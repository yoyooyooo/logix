import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as AppRuntimeImpl from '../../../src/internal/runtime/AppRuntime.js'

const EXPECTED_STAGE_ORDER = [
  'validate.modules',
  'validate.tags',
  'build.baseLayer',
  'build.baseEnv',
  'build.moduleEnvs',
  'merge.env',
  'rootContext.merge',
  'rootContext.ready',
  'process.install',
] as const

describe('AppRuntime assembly graph report', () => {
  it('produces a structured report on successful runtime boot', async () => {
    const Module = Logix.Module.make('AssemblyGraph.Success.Module', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    const app = AppRuntimeImpl.makeApp({
      layer: Layer.empty as Layer.Layer<never, never, never>,
      modules: [AppRuntimeImpl.provide(Module.tag, Module.live({ value: 1 }))],
      processes: [],
    })

    const runtime = app.makeRuntime()
    await runtime.runPromise(Effect.void)

    const report = AppRuntimeImpl.getAssemblyReport(app)
    expect(report).toBeDefined()
    if (!report) return

    expect(report.success).toBe(true)
    expect(report.failure).toBeUndefined()
    expect(report.nodes.map((node) => node.stageId)).toEqual(EXPECTED_STAGE_ORDER)
    expect(report.nodes.every((node) => node.status === 'succeeded')).toBe(true)
    expect(report.rootContextLifecycle.state).toBe('ready')
    expect(report.rootContextLifecycle.mergedAtStageSeq).toBeGreaterThan(0)
    expect(report.rootContextLifecycle.readyAtStageSeq).toBeGreaterThan(0)
  })

  it('resets assembly graph state between boots from the same app definition', async () => {
    const Module = Logix.Module.make('AssemblyGraph.ResetBetweenBoots.Module', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    let failOnce = true
    const flakyLayer = Layer.suspend(() => {
      if (failOnce) {
        failOnce = false
        return Layer.fail(new Error('boot once failure')) as unknown as Layer.Layer<never, never, never>
      }
      return Layer.empty as Layer.Layer<never, never, never>
    })

    const app = AppRuntimeImpl.makeApp({
      layer: flakyLayer,
      modules: [AppRuntimeImpl.provide(Module.tag, Module.live({ value: 1 }))],
      processes: [],
    })

    const runtimeFail = app.makeRuntime()
    await expect(runtimeFail.runPromise(Effect.void)).rejects.toBeDefined()

    const firstReport = AppRuntimeImpl.getAssemblyReport(app)
    expect(firstReport?.success).toBe(false)
    expect(firstReport?.failure).toBeDefined()

    const runtimeSuccess = app.makeRuntime()
    await runtimeSuccess.runPromise(Effect.void)

    const secondReport = AppRuntimeImpl.getAssemblyReport(app)
    expect(secondReport).toBeDefined()
    if (!secondReport) return

    expect(secondReport.success).toBe(true)
    expect(secondReport.failure).toBeUndefined()
    expect(secondReport.nodes.every((node) => node.status === 'succeeded')).toBe(true)
    expect(secondReport.rootContextLifecycle.state).toBe('ready')
  })
})
