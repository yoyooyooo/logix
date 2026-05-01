import { Effect, Layer, Option } from 'effect'
import type { ManagedRuntime } from 'effect'
import type { ImportsScope } from './runtime/core/RuntimeInternals.js'
import type { StateTransactionInstrumentation } from './runtime/core/env.js'
import {
  declarativeLinkRuntimeLayer,
  hostSchedulerLayer,
  hostSchedulerTestStubLayer,
  HostSchedulerTag,
  runtimeStoreLayer,
  RuntimeStoreTag,
  tickSchedulerLayer,
} from './runtime/core/env.js'
import type { StatePatchPath } from './runtime/core/StateTransaction.js'
import * as EffectOpCore from './runtime/core/EffectOpCore.js'
import {
  __unsafeSetGlobalHostSchedulerForTests,
  getGlobalHostScheduler,
  makeDeterministicHostScheduler as makeDeterministicHostSchedulerInternal,
  type DeterministicHostScheduler,
  type HostScheduler,
} from './runtime/core/HostScheduler.js'
import type { RuntimeStore } from './runtime/core/RuntimeStore.js'
import { getBoundInternals, getModuleFieldsProgram, getRuntimeInternals } from './runtime/core/runtimeInternalsAccessor.js'
import { installModuleFieldsExpertPath } from './runtime/core/moduleFieldsExpertPath.js'
import * as ProcessRuntime from './runtime/core/process/ProcessRuntime.js'
import * as BoundApiRuntime from './runtime/core/BoundApiRuntime.js'
import * as HotLifecycle from './runtime/core/hotLifecycle/index.js'
import type * as ProcessProtocol from './runtime/core/process/protocol.js'
import * as ProcessMeta from './runtime/core/process/meta.js'
import { currentExecVmMode, execVmModeLayer as execVmModeLayerInternal } from './field-kernel/exec-vm-mode.js'
import { FieldSourceRegistryTag, type FieldSourceRegistry } from './field-source-registry.js'
import type { PatchReason } from './field-path.js'
import { build as buildFieldProgramInternal } from './field-kernel/build.js'
import {
  computed as fieldComputedInternal,
  externalStore as fieldExternalStoreInternal,
  from as fieldFromInternal,
  link as fieldLinkInternal,
  list as fieldListInternal,
  node as fieldNodeInternal,
  source as fieldSourceInternal,
  $root as fieldRootInternal,
} from './field-kernel/dsl.js'
import type { StateAtPath, StateFieldPath } from './field-kernel/field-path.js'
import { exportStaticIr as exportFieldStaticIrInternal } from './field-kernel/ir.js'
import * as FieldRuntimeInternal from './field-runtime/index.js'
import { install as installFieldProgramInternal } from './field-kernel/install.js'
import type { StaticIr as FieldStaticIr } from './field-kernel/ir.js'
import type {
  CheckRule,
  FieldEntry,
  FieldGraph,
  FieldList,
  FieldNode,
  FieldPlan,
  FieldProgram,
  FieldSpec,
} from './field-kernel/model.js'
import type { FieldMeta } from './field-kernel/meta.js'
import type { CleanupRequest, ExecuteRequest, FieldRef, ValidateMode, ValidateRequest } from './field-runtime/model.js'
import type { TickSchedulerConfig } from './runtime/core/TickScheduler.js'

export * as BuildEnv from './platform/BuildEnv.js'
export * as RuntimeHost from './platform/RuntimeHost.js'
export * as ConstructionGuard from './platform/ConstructionGuard.js'
export { normalizeFieldPath } from './field-path.js'
export type { DirtyAllReason, DirtySet, FieldPath, FieldPathId } from './field-path.js'
export type { FieldSourceRegistry }
export { makeEnqueueTransaction } from './runtime/core/ModuleRuntime.txnQueue.js'
export {
  createHotLifecycleOwner,
  createHotLifecycleResourceRegistry,
  makeHotLifecycleEvidence,
  makeHotLifecycleObservationEnvelope,
  makeHotLifecycleEventId,
  makeHotLifecycleCleanupId,
  runtimeHotLifecycleOwnerLayer,
  getCurrentRuntimeHotLifecycleOwner,
  makeRuntimeHotLifecycleContext,
  normalizeHotLifecycleDecision,
} from './runtime/core/hotLifecycle/index.js'
export type {
  HostBindingCleanupCategory,
  HostBindingCleanupSummary,
  HotLifecycleDecision,
  HotLifecycleEvidence,
  HotLifecycleReason,
  HotLifecycleResourceRegistry,
  RuntimeHotLifecycleOwner,
  RuntimeHotLifecycleContext,
  RuntimeHotLifecycleTransition,
  RuntimeResourceCategory,
  RuntimeResourceRef,
  RuntimeResourceSummary,
} from './runtime/core/hotLifecycle/index.js'
export { FieldSourceRegistryTag }
export * as ReplayLog from './runtime/core/ReplayLog.js'
export type {
  CheckRule,
  FieldEntry,
  FieldGraph,
  FieldList,
  FieldMeta,
  FieldNode,
  FieldPlan,
  FieldProgram,
  FieldRef,
  FieldSpec,
  FieldStaticIr,
  StateAtPath,
  StateFieldPath,
  CleanupRequest as FieldCleanupRequest,
  ExecuteRequest as FieldExecuteRequest,
  ValidateMode as FieldValidateMode,
  ValidateRequest as FieldValidateRequest,
}

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

const RUNTIME_HOT_LIFECYCLE_OWNER_CACHE = new WeakMap<object, HotLifecycle.RuntimeHotLifecycleOwner>()

export const getOrCreateRuntimeHotLifecycleOwner = (
  runtime: object,
  options: {
    readonly ownerId: string
    readonly runtimeInstanceId?: string
    readonly cleanup?: () => Effect.Effect<void, never, never>
  },
): HotLifecycle.RuntimeHotLifecycleOwner => {
  const cached = RUNTIME_HOT_LIFECYCLE_OWNER_CACHE.get(runtime)
  if (cached) return cached

  const owner = HotLifecycle.createHotLifecycleOwner({
    ownerId: options.ownerId,
    runtimeInstanceId: options.runtimeInstanceId ?? options.ownerId,
    cleanup: options.cleanup,
  })
  RUNTIME_HOT_LIFECYCLE_OWNER_CACHE.set(runtime, owner)
  return owner
}

export const bindRuntimeHotLifecycleOwner = (
  runtime: object,
  owner: HotLifecycle.RuntimeHotLifecycleOwner,
): void => {
  RUNTIME_HOT_LIFECYCLE_OWNER_CACHE.set(runtime, owner)
}

export const provideRuntimeHotLifecycleOwner = HotLifecycle.runtimeHotLifecycleOwnerLayer

const RUNTIME_STORE_CACHE = new WeakMap<object, RuntimeStore>()

export const getRuntimeStore = (runtime: ManagedRuntime.ManagedRuntime<any, any>): RuntimeStore => {
  const key = runtime as unknown as object
  const cached = RUNTIME_STORE_CACHE.get(key)
  if (cached) return cached

  const storeOpt = runtime.runSync(Effect.serviceOption(RuntimeStoreTag) as any) as Option.Option<unknown>
  if (!Option.isSome(storeOpt)) {
    throw new Error('[Logix][InternalContracts] RuntimeStoreTag is not available on the provided runtime')
  }

  const store = storeOpt.value as RuntimeStore
  RUNTIME_STORE_CACHE.set(key, store)
  return store
}

const HOST_SCHEDULER_CACHE = new WeakMap<object, HostScheduler>()

export const getHostScheduler = (runtime: ManagedRuntime.ManagedRuntime<any, any>): HostScheduler => {
  const key = runtime as unknown as object
  const cached = HOST_SCHEDULER_CACHE.get(key)
  if (cached) return cached

  const resolved = runtime.runSync(Effect.serviceOption(HostSchedulerTag) as any) as Option.Option<unknown>
  const scheduler = Option.isSome(resolved) ? (resolved.value as HostScheduler) : getGlobalHostScheduler()
  HOST_SCHEDULER_CACHE.set(key, scheduler)
  return scheduler
}

export type { HostScheduler, DeterministicHostScheduler, TickSchedulerConfig }

export const makeDeterministicHostScheduler = (): DeterministicHostScheduler => makeDeterministicHostSchedulerInternal()

export const hostSchedulerTestLayer = (scheduler: HostScheduler): Layer.Layer<any, never, never> =>
  hostSchedulerTestStubLayer(scheduler as any)

export const tickSchedulerTestLayer = (config?: TickSchedulerConfig): Layer.Layer<any, never, never> => tickSchedulerLayer(config)

export const __unsafeSetGlobalHostScheduler = (next: HostScheduler | undefined): void => {
  __unsafeSetGlobalHostSchedulerForTests(next)
}

export const tickServicesLayer: Layer.Layer<any, never, never> = Layer.provideMerge(hostSchedulerLayer)(
  Layer.provideMerge(runtimeStoreLayer)(Layer.provideMerge(declarativeLinkRuntimeLayer)(tickSchedulerLayer())),
)

export const getStateTransactionInstrumentation = (runtime: object): StateTransactionInstrumentation =>
  getRuntimeInternals(runtime).txn.instrumentation

export const getRowIdStore = (runtime: object): unknown => getRuntimeInternals(runtime).fields.rowIdStore

export const getFieldListConfigs = (runtime: object): ReadonlyArray<unknown> =>
  getRuntimeInternals(runtime).fields.getListConfigs()

export const fieldRoot = fieldRootInternal
export const fieldFrom = fieldFromInternal
export const fieldNode = fieldNodeInternal
export const fieldList = fieldListInternal
export const fieldComputed = fieldComputedInternal
export const fieldSource = fieldSourceInternal
export const fieldExternalStore = fieldExternalStoreInternal
export const fieldLink = fieldLinkInternal
export const buildFieldProgram = buildFieldProgramInternal
export const installFieldProgram = installFieldProgramInternal
export const exportFieldStaticIr = (
  programOrArgs:
    | FieldProgram<any>
    | {
        readonly program: FieldProgram<any>
        readonly moduleId: string
        readonly version?: string
      },
  moduleId?: string,
  options?: {
    readonly version?: string
  },
): FieldStaticIr => {
  if (moduleId === undefined && typeof programOrArgs === 'object' && programOrArgs !== null && 'program' in programOrArgs) {
    return exportFieldStaticIrInternal(programOrArgs as {
      readonly program: FieldProgram<any>
      readonly moduleId: string
      readonly version?: string
    })
  }

  return exportFieldStaticIrInternal({
    program: programOrArgs as FieldProgram<any>,
    moduleId: moduleId as string,
    version: options?.version,
  })
}

export const fieldRef = FieldRuntimeInternal.Ref
export const fieldScopedValidate = FieldRuntimeInternal.scopedValidate
export const fieldScopedExecute = FieldRuntimeInternal.scopedExecute
export const fieldCleanup = FieldRuntimeInternal.cleanup
export const makeFieldSourceWiring = FieldRuntimeInternal.makeSourceWiring
export const makeBound = BoundApiRuntime.make

export const withModuleFieldDeclarations = <M extends { readonly id: string; readonly tag: any; readonly stateSchema: any }>(
  module: M,
  fields: unknown,
): M => {
  if (!fields || typeof fields !== 'object') {
    return module
  }

  installModuleFieldsExpertPath({
    id: module.id,
    moduleTag: module.tag,
    stateSchema: module.stateSchema,
    fields: fields as any,
  })

  return module
}

export const registerFieldProgram = (
  runtime: object,
  program: unknown,
  registerOptions?: { readonly bumpReason?: unknown },
): void => {
  getRuntimeInternals(runtime).fields.registerFieldProgram(program, registerOptions as any)
}

export const recordStatePatch = (
  runtime: object,
  path: StatePatchPath,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  fieldNodeId?: string,
  stepId?: number,
): void => {
  getRuntimeInternals(runtime).txn.recordStatePatch(path, reason, from, to, fieldNodeId, stepId)
}

export const runWithStateTransaction = <E, R>(
  runtime: object,
  origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
  body: () => Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> =>
  getRuntimeInternals(runtime).txn.runWithStateTransaction(origin as any, body as any) as any

export const runWithBoundStateTransaction = <E, R>(
  bound: object,
  origin: { readonly kind: string; readonly name?: string; readonly details?: unknown },
  body: () => Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> =>
  getBoundInternals(bound).txn.runWithStateTransaction(origin as any, body as any) as any

export const registerBoundStart = (
  bound: object,
  effect: Effect.Effect<void, never, any>,
  options?: { readonly name?: string; readonly fatalOnFailure?: boolean },
): void => {
  getBoundInternals(bound).lifecycle.registerStart(effect, options)
}

export { getModuleFieldsProgram }

export const applyTransactionSnapshot = (
  runtime: object,
  txnId: string,
  mode: 'before' | 'after',
): Effect.Effect<void, never, any> => getRuntimeInternals(runtime).txn.applyTransactionSnapshot(txnId, mode)

export const withCurrentLinkId = <A, E, R>(effect: Effect.Effect<A, E, R>, linkId: string): Effect.Effect<A, E, R> =>
  Effect.provideService(effect, EffectOpCore.currentLinkId, linkId)

/** 049: Exec VM experimental switch: enable the Exec VM hot path within the current Effect scope. */
export const withExecVmMode = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.provideService(effect, currentExecVmMode, true)

/** 049: Exec VM experimental switch: enable/disable the Exec VM hot path within the current runtime scope. */
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
    const rt = yield* Effect.service(ProcessRuntime.ProcessRuntimeTag)
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
    const rt = yield* Effect.service(ProcessRuntime.ProcessRuntimeTag)
    return yield* rt.getInstanceStatus(processInstanceId)
  })

export const controlProcessInstance = (
  processInstanceId: string,
  request: import('./runtime/core/process/protocol.js').ProcessControlRequest,
): Effect.Effect<void, never, ProcessRuntime.ProcessRuntimeTag> =>
  Effect.gen(function* () {
    const rt = yield* Effect.service(ProcessRuntime.ProcessRuntimeTag)
    yield* rt.controlInstance(processInstanceId, request)
  })

export const deliverProcessPlatformEvent = (
  event: import('./runtime/core/process/protocol.js').ProcessPlatformEvent,
): Effect.Effect<void, never, ProcessRuntime.ProcessRuntimeTag> =>
  Effect.gen(function* () {
    const rt = yield* Effect.service(ProcessRuntime.ProcessRuntimeTag)
    yield* rt.deliverPlatformEvent(event)
  })

export const getProcessEvents = (): Effect.Effect<
  ReadonlyArray<import('./runtime/core/process/protocol.js').ProcessEvent>,
  never,
  ProcessRuntime.ProcessRuntimeTag
> =>
  Effect.gen(function* () {
    const rt = yield* Effect.service(ProcessRuntime.ProcessRuntimeTag)
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
    const rt = yield* Effect.service(ProcessRuntime.ProcessRuntimeTag)
    return yield* rt.install(process, options)
  })

export const makeProcess = <E, R>(
  definition: ProcessProtocol.ProcessDefinition,
  effect: Effect.Effect<void, E, R>,
): Effect.Effect<void, E, R> =>
  ProcessMeta.attachMeta(effect, {
    definition,
    kind: 'process',
  })
