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
})
