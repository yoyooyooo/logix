import { Effect, Stream } from 'effect'
import { SandboxDef } from './SandboxModule'
import { SandboxClientTag, type MockManifest, type RunResult, type SandboxErrorInfo } from '@logixjs/sandbox'
import type { SpecFeature, SpecScenario, SpecStep } from '../types/spec'

const LOGIX_AUTO_IMPORT_SNIPPET = `import * as Logix from "@logixjs/core"\n`

const shouldInjectLogixAutoImport = (code: string): boolean => {
  if (!/\bLogix\b/.test(code)) return false
  const hasLogixBinding =
    /(^|\n)\s*import\s+[^;]*\bLogix\b/.test(code) ||
    /(^|\n)\s*(const|let|var|function|class|type|interface|enum)\s+Logix\b/.test(code)
  return !hasLogixBinding
}

const withLogixAutoImport = (code: string): string => {
  if (!shouldInjectLogixAutoImport(code)) return code
  return `${LOGIX_AUTO_IMPORT_SNIPPET}\n${code}`
}

export const SandboxLogic = SandboxDef.logic(($) => {
  // Two-phase Logic: setup (synchronous, no Env) + run (async, Env available)
  return {
    setup: Effect.void, // No setup needed for this module

    run: Effect.gen(function* () {
      yield* Effect.log('[SandboxLogic] Logic run phase started')

      // Get the SandboxClient service
      const client = yield* $.use(SandboxClientTag)
      yield* Effect.log('[SandboxLogic] SandboxClientTag resolved')

      // ==========================================================================
      // syncFlow: subscribe to client events and update Logix state
      // ==========================================================================
      const syncFlow = Effect.gen(function* () {
        yield* Stream.runForEach(client.events, (remote) =>
          $.state.update((prev) => {
            return {
              ...prev,
              status: remote.status,
              logs: remote.logs,
              traces: remote.traces,
              uiIntents: remote.uiIntents,
              error: remote.error ?? prev.error,
            }
          }),
        )
      })

      // ==========================================================================
      // Fork all async action handlers to run in parallel
      // ==========================================================================
      yield* Effect.all(
        [
          // Init Flow
          $.onAction('init').run(() =>
            Effect.gen(function* () {
              yield* Effect.log('[SandboxLogic] init action received')
              yield* $.dispatchers.setStatus('initializing')
              // Start syncing state (fork daemon)
              yield* syncFlow.pipe(Effect.fork)
              yield* Effect.log('[SandboxLogic] syncFlow forked')

              const { kernels, defaultKernelId } = yield* client.listKernels()
              yield* $.dispatchers.setKernelCatalog({
                kernels: kernels as any,
                defaultKernelId: defaultKernelId as any,
              })
              const currentKernelId = (yield* $.state.read).kernelId
              const hasCurrentKernelId = kernels.some((k) => k.kernelId === currentKernelId)
              if (!hasCurrentKernelId) {
                const nextKernelId = defaultKernelId ?? kernels[0]?.kernelId
                if (nextKernelId) {
                  yield* $.dispatchers.setKernelId(nextKernelId)
                }
              }

              yield* client.init()
              yield* Effect.log('[SandboxLogic] client.init() completed')
              yield* $.dispatchers.setStatus('ready')
              yield* Effect.log('[SandboxLogic] status set to ready')
            }),
          ),

          // Run Flow
          $.onAction('run').runLatest(() =>
            Effect.gen(function* () {
              yield* Effect.log('[SandboxLogic] run action received')
              const state = yield* $.state.read
              const code = state.code
              const manifestSource = state.mockManifestSource
              const kernelId = state.kernelId
              const strict = state.strict
              const allowFallback = state.allowFallback
              const autoImportLogix = state.autoImportLogix

              if (!code) {
                yield* Effect.log('[SandboxLogic] run: no code, returning')
                return
              }

              // 先清掉旧错误，并立即进入 running：
              // - 避免“上一次编译失败”的提示在本次 run 过程中闪一下
              // - 避免 initializing/ready/running 的多次切换导致 UI 闪烁
              yield* $.state.update((prev) => ({
                ...prev,
                error: null,
                status: 'running',
              }))

              // 1. Compile
              yield* Effect.log('[SandboxLogic] run: compiling...')
              // 解析 PM/用户填写的 MockManifest
              let manifest: MockManifest | undefined = undefined
              if (manifestSource) {
                try {
                  manifest = JSON.parse(manifestSource) as MockManifest
                } catch (parseErr) {
                  const error: SandboxErrorInfo = {
                    code: 'RUNTIME_ERROR',
                    message: 'Mock 配置解析失败：' + String(parseErr),
                  }
                  yield* $.state.update((prev) => ({
                    ...prev,
                    status: 'ready',
                    error,
                  }))
                  return
                }
              }

              const compileResult = yield* client.compile(
                autoImportLogix ? withLogixAutoImport(code) : code,
                'playground.tsx',
                manifest,
                {
                  kernelId,
                  strict,
                  allowFallback,
                },
              )
              yield* Effect.log('[SandboxLogic] run: compile result', compileResult.success)
              if (!compileResult.success) {
                const error: SandboxErrorInfo = {
                  code: 'RUNTIME_ERROR',
                  message: compileResult.errors?.join('\n') || 'Unknown compile error',
                }
                yield* $.state.update((prev) => ({
                  ...prev,
                  status: 'ready',
                  error,
                }))
                return
              }

              // 2. Run
              yield* Effect.log('[SandboxLogic] run: executing...')
              const result: RunResult = yield* client.run({
                useCompiledCode: true,
                kernelId,
                strict,
                allowFallback,
              })
              yield* Effect.log('[SandboxLogic] run: execution completed')

              yield* $.dispatchers.setResult(result as any)
              yield* $.state.update((prev) => ({
                ...prev,
                uiIntents: result.uiIntents ?? [],
              }))
            }),
          ),

          // UI Callback Flow: bridge Mock UI interactions back to sandbox worker
          $.onAction('uiCallbackFromMockUi').run((action) =>
            Effect.gen(function* () {
              const payload: unknown = action.payload

              if (!payload || typeof payload !== 'object') {
                return
              }

              const packet = payload as {
                id?: unknown
                callbacks?: ReadonlyArray<unknown>
                props?: Record<string, unknown>
              }

              if (!packet.id) {
                return
              }

              const callbackName: string =
                Array.isArray(packet.callbacks) && packet.callbacks.length > 0 ? String(packet.callbacks[0]) : 'onClick'

              const data = packet.props ?? {}

              yield* Effect.log('[SandboxLogic] uiCallbackFromMockUi', {
                intentId: packet.id,
                callback: callbackName,
              })

              // 当前版本仅将 Mock UI 交互映射为 UI_CALLBACK 命令，让 Worker 侧记录 TRACE/log。
              // runId 暂使用固定占位符，后续可与真实 RunResult 绑定。
              yield* client.uiCallback({
                runId: 'mock-ui',
                intentId: String(packet.id),
                callback: callbackName,
                data,
              })
            }),
          ),

          // Spec Selection Flow (Sync Spec -> Runtime)
          $.onAction('setSpecSelection').run((action) => {
            const { featureId, storyId, scenarioId } = action.payload
            return Effect.gen(function* () {
              if (!featureId || !storyId || !scenarioId) return

              const state = yield* $.state.read
              const features = state.specFeatures as readonly SpecFeature[]
              const feature = features.find((f) => f.id === featureId)
              const story = feature?.stories.find((s) => s.id === storyId)
              const foundScenario = story?.scenarios.find((s) => s.id === scenarioId) as SpecScenario | undefined

              if (foundScenario) {
                const steps = foundScenario.steps as readonly SpecStep[]
                const fullScript = steps.map((s) => s.intentScript || '').join('\n')
                yield* $.dispatchers.setIntentScript(fullScript)

                const mappedSteps = steps.map((s) => ({
                  stepId: s.id,
                  label: s.label,
                }))
                yield* $.dispatchers.setScenarioSteps(mappedSteps)

                yield* $.dispatchers.setScenarioId(foundScenario.id)
              }
            })
          }),
        ],
        { concurrency: 'unbounded' },
      )
    }),
  }
})
