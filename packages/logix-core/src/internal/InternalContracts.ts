import { Effect, Layer } from 'effect'
import type { ManagedRuntime } from 'effect'
import type { ImportsScope } from './runtime/core/RuntimeInternals.js'
import type { StateTransactionInstrumentation } from './runtime/core/env.js'
import { declarativeLinkRuntimeLayer, runtimeStoreLayer, RuntimeStoreTag, tickSchedulerLayer } from './runtime/core/env.js'
import type { StatePatchPath } from './runtime/core/StateTransaction.js'
import * as EffectOpCore from './runtime/core/EffectOpCore.js'
import type { RuntimeStore } from './runtime/core/RuntimeStore.js'
import { getRuntimeInternals } from './runtime/core/runtimeInternalsAccessor.js'
import * as ProcessRuntime from './runtime/core/process/ProcessRuntime.js'
import type * as ProcessProtocol from './runtime/core/process/protocol.js'
import { currentExecVmMode, execVmModeLayer as execVmModeLayerInternal } from './state-trait/exec-vm-mode.js'
import type { PatchReason } from './field-path.js'

export * as BuildEnv from './platform/BuildEnv.js'
export * as RuntimeHost from './platform/RuntimeHost.js'
export * as ConstructionGuard from './platform/ConstructionGuard.js'
export { normalizeFieldPath } from './field-path.js'
export type { DirtyAllReason, DirtySet, FieldPath, FieldPathId } from './field-path.js'
export { makeEnqueueTransaction } from './runtime/ModuleRuntime.txnQueue.js'
export * as ReplayLog from './runtime/core/ReplayLog.js'

/**
 * InternalContracts: the internal contract access entrypoint for in-repo integrators.
 *
 * Notes:
 * - This module replaces direct reads of `runtime.__*` magic fields.
 * - Public API/behavior remains unchanged, and business code is not required to use this by default.
 * - Exposes only minimal capabilities (ISP) to avoid leaking RuntimeInternals as a public dependency.
 */
export const getImportsScope = (runtime: object): ImportsScope => {
  return getRuntimeInternals(runtime).imports
}

const RUNTIME_STORE_CACHE = new WeakMap<object, RuntimeStore>()

export const getRuntimeStore = (runtime: ManagedRuntime.ManagedRuntime<any, any>): RuntimeStore => {
  const key = runtime as unknown as object
  const cached = RUNTIME_STORE_CACHE.get(key)
  if (cached) return cached

  const store = runtime.runSync(Effect.serviceOptional(RuntimeStoreTag) as any) as RuntimeStore
  RUNTIME_STORE_CACHE.set(key, store)
  return store
}

export const tickServicesLayer: Layer.Layer<any, never, never> = Layer.provideMerge(runtimeStoreLayer)(
  Layer.provideMerge(declarativeLinkRuntimeLayer)(tickSchedulerLayer()),
)

export const getStateTransactionInstrumentation = (runtime: object): StateTransactionInstrumentation =>
  getRuntimeInternals(runtime).txn.instrumentation

export const getRowIdStore = (runtime: object): unknown => getRuntimeInternals(runtime).traits.rowIdStore

export const getStateTraitListConfigs = (runtime: object): ReadonlyArray<unknown> =>
  getRuntimeInternals(runtime).traits.getListConfigs()

export const registerStateTraitProgram = (
  runtime: object,
  program: unknown,
  registerOptions?: { readonly bumpReason?: unknown },
): void => {
  getRuntimeInternals(runtime).traits.registerStateTraitProgram(program, registerOptions as any)
}

export const recordStatePatch = (
  runtime: object,
  path: StatePatchPath,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  traitNodeId?: string,
  stepId?: number,
): void => {
  getRuntimeInternals(runtime).txn.recordStatePatch(path, reason, from, to, traitNodeId, stepId)
}

export const runWithStateTransaction = <E, R>(
  runtime: object,
  origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
  body: () => Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> =>
  getRuntimeInternals(runtime).txn.runWithStateTransaction(origin as any, body as any) as any

export const applyTransactionSnapshot = (
  runtime: object,
  txnId: string,
  mode: 'before' | 'after',
): Effect.Effect<void, never, any> => getRuntimeInternals(runtime).txn.applyTransactionSnapshot(txnId, mode)

export const withCurrentLinkId = (linkId: string) => Effect.locally(EffectOpCore.currentLinkId, linkId)

/** 049: Exec VM (core-ng) switch: enable the Exec VM hot path within the current Effect scope. */
export const withExecVmMode = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.locally(currentExecVmMode, true)(effect)

/** 049: Exec VM (core-ng) switch: enable/disable the Exec VM hot path within the current runtime scope. */
export const execVmModeLayer = (enabled: boolean): Layer.Layer<any, never, never> =>
  execVmModeLayerInternal(enabled) as Layer.Layer<any, never, never>

export const getProcessInstallations = (options?: {
  readonly scopeType?: import('./runtime/core/process/protocol.js').ProcessScope['type']
  readonly scopeKey?: string
}): Effect.Effect<
  ReadonlyArray<import('./runtime/core/process/protocol.js').ProcessInstallation>,
  never,
  ProcessRuntime.ProcessRuntimeTag
> =>
  Effect.gen(function* () {
    const rt = yield* ProcessRuntime.ProcessRuntimeTag
    return yield* rt.listInstallations(options)
  })

export const getProcessInstanceStatus = (
  processInstanceId: string,
): Effect.Effect<
  import('./runtime/core/process/protocol.js').ProcessInstanceStatus | undefined,
  never,
  ProcessRuntime.ProcessRuntimeTag
> =>
  Effect.gen(function* () {
    const rt = yield* ProcessRuntime.ProcessRuntimeTag
    return yield* rt.getInstanceStatus(processInstanceId)
  })

export const controlProcessInstance = (
  processInstanceId: string,
  request: import('./runtime/core/process/protocol.js').ProcessControlRequest,
): Effect.Effect<void, never, ProcessRuntime.ProcessRuntimeTag> =>
  Effect.gen(function* () {
    const rt = yield* ProcessRuntime.ProcessRuntimeTag
    yield* rt.controlInstance(processInstanceId, request)
  })

export const deliverProcessPlatformEvent = (
  event: import('./runtime/core/process/protocol.js').ProcessPlatformEvent,
): Effect.Effect<void, never, ProcessRuntime.ProcessRuntimeTag> =>
  Effect.gen(function* () {
    const rt = yield* ProcessRuntime.ProcessRuntimeTag
    yield* rt.deliverPlatformEvent(event)
  })

export const getProcessEvents = (): Effect.Effect<
  ReadonlyArray<import('./runtime/core/process/protocol.js').ProcessEvent>,
  never,
  ProcessRuntime.ProcessRuntimeTag
> =>
  Effect.gen(function* () {
    const rt = yield* ProcessRuntime.ProcessRuntimeTag
    return yield* rt.getEventsSnapshot()
  })

export const installProcess = <E, R>(
  process: Effect.Effect<void, E, R>,
  options: {
    readonly scope: ProcessProtocol.ProcessScope
    readonly enabled?: boolean
    readonly installedAt?: string
    readonly mode?: 'switch' | 'exhaust'
  },
): Effect.Effect<ProcessProtocol.ProcessInstallation | undefined, never, ProcessRuntime.ProcessRuntimeTag | R> =>
  Effect.gen(function* () {
    const rt = yield* ProcessRuntime.ProcessRuntimeTag
    return yield* rt.install(process, options)
  })
