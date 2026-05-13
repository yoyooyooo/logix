import { Effect, Layer } from 'effect'
import type { ManagedRuntime } from 'effect'
import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import {
  createLiveBindingRegistry,
  createFieldRuntimeInspectModel,
  createLiveOperationLedgerStore,
  admitLiveOperation,
  makeFieldLedgerWatermarkRef,
  makeLiveManifestBindingRef,
  makeLiveSummaryInspectArtifact,
  makeLiveTimelineInspectArtifact,
  type FieldConvergenceCauseSummary,
  type FieldRuntimeInspectEventMetadata,
  type FieldRuntimeInspectModel,
  type LiveAdmissionResult,
  type LiveManifestBindingRef,
  type LiveInspectArtifact,
  type RuntimeReflectionManifest,
  type LiveBudgetProfile,
  type LiveLedgerEventEnvelope,
  type LiveLedgerRecordOperationInput,
  type LiveLedgerWatermark,
  type LiveOperationLedgerStore,
  type LiveOperationWindow,
  type LiveOperationRequest,
  type LiveOperationWindowRequest,
  type LiveTargetDescriptor,
} from '@logixjs/core/repo-internal/live-bridge-api'
import {
  disposeHostBindingsForRuntime,
  getReactRuntimeInstanceId,
} from '../provider/runtimeHotLifecycle.js'
import {
  clearDevLifecycleRuntimeHostBinder,
  installDevLifecycleRuntimeHostBinder,
} from '../provider/runtimeDevLifecycleBridge.js'

export type LogixDevLifecycleHostKind = 'react' | 'vite' | 'vitest' | (string & {})
export type LogixDevLifecycleRuntimeOwnership = 'borrowed' | 'owned'

export interface LogixDevLifecycleCarrierOptions {
  readonly carrierId?: string
  readonly hostKind?: LogixDevLifecycleHostKind
}

export type LogixDevLifecycleReflectionManifest = RuntimeReflectionManifest

export interface LogixDevLifecycleReflectionBinding {
  readonly manifestDigest: string
  readonly bindingRef: LiveManifestBindingRef
}

export interface LogixDevLifecycleFieldInspectSource {
  readonly getSnapshot: () => unknown | undefined
  readonly getGraph?: () => unknown | undefined
  readonly getChangedFieldCount?: () => number | undefined
  readonly getDegradedReasonCounts?: () => Readonly<Record<string, number>> | undefined
  readonly getConvergenceCauses?: () => ReadonlyArray<FieldConvergenceCauseSummary>
  readonly getLatestLedgerWatermark?: () => LiveLedgerWatermark | undefined
}

export interface LogixDevLifecycleRuntimeArgs {
  readonly ownerId: string
  readonly runtimeInstanceId?: string
  readonly reflectionManifest?: LogixDevLifecycleReflectionManifest
  readonly moduleRuntime?: {
    readonly getState: Effect.Effect<unknown, unknown, any>
    readonly dispatch: (action: unknown) => Effect.Effect<void, unknown, any>
  }
  readonly fieldInspect?: LogixDevLifecycleFieldInspectSource
  readonly cleanup?: () => Effect.Effect<void, never, never>
}

export interface LogixDevLifecycleBindRuntimeArgs extends LogixDevLifecycleRuntimeArgs {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly runtimeOwnership?: LogixDevLifecycleRuntimeOwnership
}

export interface LogixDevLifecycleResetArgs {
  readonly ownerId: string
  readonly nextRuntime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly nextRuntimeInstanceId?: string
  readonly reason?: RuntimeContracts.HotLifecycleReason
  readonly hostCleanupSummary?: RuntimeContracts.HostBindingCleanupSummary
}

export interface LogixDevLifecycleDisposeArgs {
  readonly ownerId: string
  readonly reason?: RuntimeContracts.HotLifecycleReason
  readonly hostCleanupSummary?: RuntimeContracts.HostBindingCleanupSummary
}

export interface LogixDevLifecycleRuntimeBinding {
  readonly ownerId: string
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly runtimeInstanceId: string
  readonly owner: RuntimeContracts.RuntimeHotLifecycleOwner
  readonly layer: Layer.Layer<any, never, never>
  readonly reset: (
    args: Omit<LogixDevLifecycleResetArgs, 'ownerId'>,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition, never, never>
  readonly dispose: (
    args?: Omit<LogixDevLifecycleDisposeArgs, 'ownerId'>,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition, never, never>
}

export interface LogixDevLifecycleRuntimeBindingSnapshot {
  readonly ownerId: string
  readonly runtimeInstanceId: string
  readonly carrierId: string
  readonly hostKind: LogixDevLifecycleHostKind
  readonly runtimeLabel?: string
  readonly reflectionBinding?: LogixDevLifecycleReflectionBinding
  readonly targetCoordinate: {
    readonly runtimeId: string
    readonly moduleId: string
    readonly instanceId: string
  }
}

export interface LogixDevLifecycleResolvedRuntimeBinding {
  readonly ownerId: string
  readonly runtimeInstanceId: string
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly moduleRuntime?: {
    readonly getState: Effect.Effect<unknown, unknown, any>
    readonly dispatch: (action: unknown) => Effect.Effect<void, unknown, any>
  }
  readonly carrierId: string
  readonly hostKind: LogixDevLifecycleHostKind
  readonly targetCoordinate: LogixDevLifecycleRuntimeBindingSnapshot['targetCoordinate']
  readonly runtimeLabel?: string
  readonly reflectionBinding?: LogixDevLifecycleReflectionBinding
  readonly projectActions: (input: {
    readonly target: LiveTargetDescriptor
    readonly producer: string
    readonly maxActions?: number
  }) => LiveInspectArtifact<'actions'> | undefined
  readonly projectFinalFields: (input: {
    readonly target: LiveTargetDescriptor
    readonly producer: string
    readonly budget?: LiveBudgetProfile
  }) => LiveInspectArtifact<'fields'>
  readonly projectFieldGraph: (input: {
    readonly target: LiveTargetDescriptor
    readonly producer: string
    readonly budget?: LiveBudgetProfile
  }) => LiveInspectArtifact<'field-graph'>
  readonly projectFieldSummary: (input: {
    readonly target: LiveTargetDescriptor
    readonly producer: string
    readonly budget?: LiveBudgetProfile
  }) => LiveInspectArtifact<'field-summary'>
  readonly projectTimeline: (input: {
    readonly target: LiveTargetDescriptor
    readonly producer: string
    readonly operationWindow: LiveOperationWindow
    readonly fieldFilter?: { readonly fieldPath: string }
    readonly fieldEventMetadata?: ReadonlyArray<FieldRuntimeInspectEventMetadata>
    readonly budget?: LiveBudgetProfile
  }) => LiveInspectArtifact<'timeline'>
  readonly projectSummary: (input: {
    readonly target: LiveTargetDescriptor
    readonly producer: string
    readonly operationWindow: LiveOperationWindow
    readonly budget?: LiveBudgetProfile
  }) => LiveInspectArtifact<'summary'>
  readonly readOperationWindow: (request: LiveOperationWindowRequest) => LiveOperationWindow
  readonly recordOperationEvent: (input: LiveLedgerRecordOperationInput) => LiveLedgerEventEnvelope | undefined
  readonly admitDispatch: (request: LiveOperationRequest) => LiveAdmissionResult
}

export interface LogixDevLifecycleCarrier {
  readonly carrierId: string
  readonly hostKind: LogixDevLifecycleHostKind
  readonly layerForRuntime: (args: LogixDevLifecycleRuntimeArgs) => Layer.Layer<any, never, never>
  readonly bindRuntime: (args: LogixDevLifecycleBindRuntimeArgs) => LogixDevLifecycleRuntimeBinding
  readonly reset: (
    args: LogixDevLifecycleResetArgs,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition | undefined, never, never>
  readonly dispose: (
    args: LogixDevLifecycleDisposeArgs,
  ) => Effect.Effect<RuntimeContracts.RuntimeHotLifecycleTransition | undefined, never, never>
  readonly getOwner: (ownerId: string) => RuntimeContracts.RuntimeHotLifecycleOwner | undefined
  readonly listRuntimeBindings: () => ReadonlyArray<LogixDevLifecycleRuntimeBindingSnapshot>
  readonly resolveRuntimeBinding: (
    target: LogixDevLifecycleRuntimeBindingSnapshot['targetCoordinate'],
  ) => LogixDevLifecycleResolvedRuntimeBinding | undefined
}

interface OwnerRecord {
  readonly ownerId: string
  readonly runtime?: ManagedRuntime.ManagedRuntime<any, any>
  readonly runtimeOwnership: LogixDevLifecycleRuntimeOwnership
  readonly owner: RuntimeContracts.RuntimeHotLifecycleOwner
  readonly layer: Layer.Layer<any, never, never>
  readonly runtimeInstanceId: string
  readonly runtimeLabel?: string
  readonly reflectionManifest?: LogixDevLifecycleReflectionManifest
  readonly moduleRuntime?: LogixDevLifecycleResolvedRuntimeBinding['moduleRuntime']
  readonly fieldInspect?: LogixDevLifecycleFieldInspectSource
  readonly setRuntime: (runtime: ManagedRuntime.ManagedRuntime<any, any>) => void
  readonly setRuntimeOwnership: (ownership: LogixDevLifecycleRuntimeOwnership) => void
  readonly setModuleRuntime: (runtime: LogixDevLifecycleResolvedRuntimeBinding['moduleRuntime']) => void
  readonly setReflectionManifest: (manifest: LogixDevLifecycleReflectionManifest | undefined) => void
  readonly setFieldInspect: (source: LogixDevLifecycleFieldInspectSource | undefined) => void
  readonly setCleanup: (cleanup: (() => Effect.Effect<void, never, never>) | undefined) => void
}

const GLOBAL_CARRIER_KEY = Symbol.for('@logixjs/react/dev-lifecycle-carrier')

let runtimeInstanceSeq = 0

const nextRuntimeInstanceId = (ownerId: string): string => {
  runtimeInstanceSeq += 1
  return `${ownerId}::runtime:${runtimeInstanceSeq}`
}

const normalizeTargetCoordinate = (args: {
  readonly ownerId: string
  readonly runtimeInstanceId: string
  readonly runtimeLabel?: string
}): LogixDevLifecycleRuntimeBindingSnapshot['targetCoordinate'] => {
  const runtimeId = args.runtimeLabel ?? args.runtimeInstanceId
  return {
    runtimeId,
    moduleId: args.ownerId,
    instanceId: 'default',
  }
}

const isDebugSourceBridgeEvent = (event: CoreDebug.Event): boolean => {
  const type = event.type
  return type === 'diagnostic' || (typeof type === 'string' && type.startsWith('process:'))
}

const getGlobalStore = (): Record<PropertyKey, unknown> => globalThis as unknown as Record<PropertyKey, unknown>

const notifyDevLifecycleBindingsChanged = (): void => {
  const eventTarget = typeof window !== 'undefined' ? window : undefined
  eventTarget?.dispatchEvent(new Event('logix:dev-lifecycle-bindings-changed'))
}

export const getInstalledLogixDevLifecycleCarrier = (): LogixDevLifecycleCarrier | undefined => {
  const value = getGlobalStore()[GLOBAL_CARRIER_KEY]
  return value && typeof value === 'object' ? (value as LogixDevLifecycleCarrier) : undefined
}

export const installLogixDevLifecycleCarrier = (
  carrierOrOptions: LogixDevLifecycleCarrier | LogixDevLifecycleCarrierOptions = {},
): LogixDevLifecycleCarrier => {
  const installed = getInstalledLogixDevLifecycleCarrier()
  if (!('layerForRuntime' in carrierOrOptions) && installed) {
    installDevLifecycleRuntimeHostBinder()
    return installed
  }

  const carrier =
    'layerForRuntime' in carrierOrOptions
      ? carrierOrOptions
      : createLogixDevLifecycleCarrier(carrierOrOptions)

  getGlobalStore()[GLOBAL_CARRIER_KEY] = carrier
  installDevLifecycleRuntimeHostBinder()
  return carrier
}

export const clearInstalledLogixDevLifecycleCarrier = (): void => {
  delete getGlobalStore()[GLOBAL_CARRIER_KEY]
  clearDevLifecycleRuntimeHostBinder()
}

export const createLogixDevLifecycleCarrier = (
  options: LogixDevLifecycleCarrierOptions = {},
): LogixDevLifecycleCarrier => {
  const records = new Map<string, OwnerRecord>()
  const bindingRegistry = createLiveBindingRegistry()
  const fieldInspectModels = new Map<string, FieldRuntimeInspectModel>()
  const operationLedgerStore: LiveOperationLedgerStore = createLiveOperationLedgerStore({ enabled: true })
  const carrierId = options.carrierId ?? '@logixjs/react:dev-lifecycle'
  const hostKind = options.hostKind ?? 'react'

  const getFieldInspectModel = (producer: string): FieldRuntimeInspectModel => {
    const cached = fieldInspectModels.get(producer)
    if (cached) return cached
    const model = createFieldRuntimeInspectModel({ enabled: true, producer })
    fieldInspectModels.set(producer, model)
    return model
  }

  const cleanupFieldInspectTarget = (
    target: LogixDevLifecycleRuntimeBindingSnapshot['targetCoordinate'],
  ): void => {
    for (const model of fieldInspectModels.values()) {
      model.cleanupTarget(target)
    }
  }

  const cleanupTarget = (
    target: LogixDevLifecycleRuntimeBindingSnapshot['targetCoordinate'],
  ): void => {
    cleanupFieldInspectTarget(target)
    operationLedgerStore.cleanupTarget(target)
  }

  const makeDebugSourceBridgeLayer = (
    target: LogixDevLifecycleRuntimeBindingSnapshot['targetCoordinate'],
  ): Layer.Layer<any, never, never> => {
    const sink: CoreDebug.Sink = {
      record: (event) => {
        if (!isDebugSourceBridgeEvent(event)) {
          return Effect.void
        }
        return Effect.gen(function* () {
          const diagnosticsLevel = yield* Effect.service(CoreDebug.internal.currentDiagnosticsLevel)
          if (diagnosticsLevel === 'off') {
            return
          }
          const materialization = yield* Effect.service(CoreDebug.internal.currentDiagnosticsMaterialization)
          const ref = CoreDebug.toRuntimeDebugEventRef(event, {
            diagnosticsLevel,
            materialization,
          })
          if (ref) {
            operationLedgerStore.addRuntimeDebugEventRef(ref, target)
          }
        })
      },
    }

    return CoreDebug.appendSinks([sink]) as Layer.Layer<any, never, never>
  }

  const createRecord = (args: LogixDevLifecycleRuntimeArgs): OwnerRecord => {
    const existing = records.get(args.ownerId)
    const runtimeInstanceId = args.runtimeInstanceId ?? nextRuntimeInstanceId(args.ownerId)
    if (existing && existing.runtimeInstanceId === runtimeInstanceId) {
      return existing
    }

    let currentRuntime: ManagedRuntime.ManagedRuntime<any, any> | undefined
    let currentRuntimeOwnership: LogixDevLifecycleRuntimeOwnership = 'borrowed'
    let currentModuleRuntime = args.moduleRuntime
    let currentReflectionManifest = args.reflectionManifest
    let currentFieldInspect = args.fieldInspect
    let currentCleanup = args.cleanup
    const owner = RuntimeContracts.createHotLifecycleOwner({
      ownerId: args.ownerId,
      runtimeInstanceId,
      cleanup: () =>
        Effect.gen(function* () {
          if (currentCleanup) {
            yield* currentCleanup()
          }
          if (currentRuntime && currentRuntimeOwnership === 'owned') {
            yield* Effect.tryPromise(() => currentRuntime!.dispose()).pipe(Effect.catchCause(() => Effect.void))
          }
        }) as Effect.Effect<void, never, never>,
    })
    const targetCoordinate = normalizeTargetCoordinate({
      ownerId: args.ownerId,
      runtimeInstanceId,
      runtimeLabel: args.runtimeInstanceId,
    })
    if (args.reflectionManifest) {
      bindingRegistry.bindTarget({ target: targetCoordinate, manifest: args.reflectionManifest })
    }

    const record: OwnerRecord = {
      ownerId: args.ownerId,
      owner,
      layer: Layer.mergeAll(
        RuntimeContracts.provideRuntimeHotLifecycleOwner(owner),
        makeDebugSourceBridgeLayer(targetCoordinate),
      ) as Layer.Layer<any, never, never>,
      runtimeInstanceId,
      runtimeLabel: args.runtimeInstanceId,
      get runtimeOwnership() {
        return currentRuntimeOwnership
      },
      get reflectionManifest() {
        return currentReflectionManifest
      },
      get runtime() {
        return currentRuntime
      },
      get moduleRuntime() {
        return currentModuleRuntime
      },
      get fieldInspect() {
        return currentFieldInspect
      },
      setRuntime: (runtime) => {
        currentRuntime = runtime
      },
      setRuntimeOwnership: (ownership) => {
        currentRuntimeOwnership = ownership
      },
      setModuleRuntime: (runtime) => {
        currentModuleRuntime = runtime
      },
      setReflectionManifest: (manifest) => {
        const target = normalizeTargetCoordinate({
          ownerId: args.ownerId,
          runtimeInstanceId,
          runtimeLabel: args.runtimeInstanceId,
        })
        if (manifest) {
          bindingRegistry.bindTarget({ target, manifest })
        } else {
          bindingRegistry.unbindTarget(target)
        }
        currentReflectionManifest = manifest
      },
      setFieldInspect: (source) => {
        currentFieldInspect = source
      },
      setCleanup: (cleanup) => {
        currentCleanup = cleanup
      },
    }
    records.set(args.ownerId, record)

    if (existing && existing.owner !== owner) {
      cleanupTarget(
        normalizeTargetCoordinate({
          ownerId: existing.ownerId,
          runtimeInstanceId: existing.runtimeInstanceId,
          runtimeLabel: existing.runtimeLabel,
        }),
      )
      Effect.runCallback(
        existing.owner.reset({
          nextRuntimeInstanceId: runtimeInstanceId,
          reason: 'hot-update',
          hostCleanupSummary: existing.runtime ? disposeHostBindingsForRuntime(existing.runtime) : undefined,
        }),
        { onExit: () => undefined },
      )
    }

    return record
  }

  const ensureRecord = (args: LogixDevLifecycleRuntimeArgs): OwnerRecord => {
    const existing = records.get(args.ownerId)
    if (existing && (args.runtimeInstanceId === undefined || existing.runtimeInstanceId === args.runtimeInstanceId)) {
      return existing
    }
    return createRecord(args)
  }

  const bindRuntime = (args: LogixDevLifecycleBindRuntimeArgs): LogixDevLifecycleRuntimeBinding => {
    const existing = records.get(args.ownerId)
    const record =
      existing && existing.runtime && existing.runtime !== args.runtime && args.runtimeInstanceId === undefined
        ? createRecord(args)
        : ensureRecord(args)
    const runtimeChanged = record.runtime !== args.runtime
    RuntimeContracts.bindRuntimeHotLifecycleOwner(args.runtime as unknown as object, record.owner)
    getReactRuntimeInstanceId(args.runtime, record.runtimeInstanceId)

    record.setRuntime(args.runtime)
    if (args.runtimeOwnership !== undefined || runtimeChanged) {
      record.setRuntimeOwnership(args.runtimeOwnership ?? 'borrowed')
    }
    record.setModuleRuntime(args.moduleRuntime)
    record.setReflectionManifest(args.reflectionManifest)
    record.setFieldInspect(args.fieldInspect)
    record.setCleanup(args.cleanup)
    records.set(args.ownerId, record)
    notifyDevLifecycleBindingsChanged()

    return {
      ownerId: args.ownerId,
      runtime: args.runtime,
      runtimeInstanceId: record.runtimeInstanceId,
      owner: record.owner,
      layer: record.layer,
      reset: (resetArgs) => {
        const targetRuntimeInstanceId = resetArgs.nextRuntime
          ? getReactRuntimeInstanceId(
              resetArgs.nextRuntime,
              resetArgs.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId),
            )
          : (resetArgs.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId))
        if (resetArgs.nextRuntime) {
          RuntimeContracts.bindRuntimeHotLifecycleOwner(resetArgs.nextRuntime as unknown as object, record.owner)
        }
        return record.owner.reset({
          nextRuntimeInstanceId: targetRuntimeInstanceId,
          reason: resetArgs.reason ?? 'hot-update',
          hostCleanupSummary: resetArgs.hostCleanupSummary ?? disposeHostBindingsForRuntime(args.runtime),
        })
      },
      dispose: (disposeArgs) =>
        record.owner.dispose({
          reason: disposeArgs?.reason ?? 'dispose-without-successor',
          hostCleanupSummary: disposeArgs?.hostCleanupSummary ?? disposeHostBindingsForRuntime(args.runtime),
        }),
    }
  }

  const carrier: LogixDevLifecycleCarrier = {
    carrierId,
    hostKind,
    layerForRuntime: (args) => createRecord(args).layer,
    bindRuntime,
    reset: (args) => {
      const record = records.get(args.ownerId)
      if (!record) return Effect.succeed(undefined)
      const targetRuntimeInstanceId = args.nextRuntime
        ? getReactRuntimeInstanceId(args.nextRuntime, args.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId))
        : (args.nextRuntimeInstanceId ?? nextRuntimeInstanceId(args.ownerId))
      if (args.nextRuntime) {
        RuntimeContracts.bindRuntimeHotLifecycleOwner(args.nextRuntime as unknown as object, record.owner)
      }
      cleanupTarget(
        normalizeTargetCoordinate({
          ownerId: record.ownerId,
          runtimeInstanceId: record.runtimeInstanceId,
          runtimeLabel: record.runtimeLabel,
        }),
      )
      notifyDevLifecycleBindingsChanged()
      return record.owner.reset({
        nextRuntimeInstanceId: targetRuntimeInstanceId,
        reason: args.reason ?? 'hot-update',
        hostCleanupSummary:
          args.hostCleanupSummary ?? (record.runtime ? disposeHostBindingsForRuntime(record.runtime) : undefined),
      })
    },
    dispose: (args) => {
      const record = records.get(args.ownerId)
      if (!record) return Effect.succeed(undefined)
      return record.owner
        .dispose({
          reason: args.reason ?? 'dispose-without-successor',
          hostCleanupSummary:
            args.hostCleanupSummary ?? (record.runtime ? disposeHostBindingsForRuntime(record.runtime) : undefined),
        })
        .pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              const target = normalizeTargetCoordinate({
                ownerId: record.ownerId,
                runtimeInstanceId: record.runtimeInstanceId,
                runtimeLabel: record.runtimeLabel,
              })
              bindingRegistry.unbindTarget(target)
              cleanupTarget(target)
              records.delete(args.ownerId)
              notifyDevLifecycleBindingsChanged()
            }),
          ),
        )
    },
    getOwner: (ownerId) => records.get(ownerId)?.owner,
    listRuntimeBindings: () =>
      Array.from(records.values()).map((record) => ({
        ownerId: record.ownerId,
        runtimeInstanceId: record.runtimeInstanceId,
        carrierId,
        hostKind,
        ...(record.runtimeLabel ? { runtimeLabel: record.runtimeLabel } : null),
        ...(record.reflectionManifest
          ? {
              reflectionBinding: {
                manifestDigest: record.reflectionManifest.digest,
                bindingRef: makeLiveManifestBindingRef({
                  target: {
                    ...normalizeTargetCoordinate({
                      ownerId: record.ownerId,
                      runtimeInstanceId: record.runtimeInstanceId,
                      runtimeLabel: record.runtimeLabel,
                    }),
                    attachmentId: carrierId,
                    adapterKind: 'browser-dev',
                  },
                  manifestDigest: record.reflectionManifest.digest,
                  bindingStatus: 'matched',
                  actionManifestRef: {
                    outputKey: 'runtime-reflection-manifest',
                    kind: 'RuntimeReflectionManifest',
                    digest: record.reflectionManifest.digest,
                  },
                }),
              },
            }
          : null),
        targetCoordinate: normalizeTargetCoordinate({
          ownerId: record.ownerId,
          runtimeInstanceId: record.runtimeInstanceId,
          runtimeLabel: record.runtimeLabel,
        }),
      })),
    resolveRuntimeBinding: (target) => {
      for (const record of records.values()) {
        if (!record.runtime) continue
        const targetCoordinate = normalizeTargetCoordinate({
          ownerId: record.ownerId,
          runtimeInstanceId: record.runtimeInstanceId,
          runtimeLabel: record.runtimeLabel,
        })
        if (
          targetCoordinate.runtimeId === target.runtimeId &&
          targetCoordinate.moduleId === target.moduleId &&
          targetCoordinate.instanceId === target.instanceId
        ) {
          return {
            ownerId: record.ownerId,
            runtimeInstanceId: record.runtimeInstanceId,
            runtime: record.runtime,
            ...(record.moduleRuntime ? { moduleRuntime: record.moduleRuntime } : null),
            carrierId,
            hostKind,
            targetCoordinate,
            ...(record.runtimeLabel ? { runtimeLabel: record.runtimeLabel } : null),
            ...(record.reflectionManifest
              ? {
                  reflectionBinding: {
                    manifestDigest: record.reflectionManifest.digest,
                    bindingRef: makeLiveManifestBindingRef({
                      target: { ...targetCoordinate, attachmentId: carrierId, adapterKind: 'browser-dev' },
                      manifestDigest: record.reflectionManifest.digest,
                      bindingStatus: 'matched',
                      actionManifestRef: {
                        outputKey: 'runtime-reflection-manifest',
                        kind: 'RuntimeReflectionManifest',
                        digest: record.reflectionManifest.digest,
                      },
                    }),
                  },
                }
              : null),
            projectActions: (input) =>
              bindingRegistry.resolveTarget(input.target) ? bindingRegistry.projectActions(input) : undefined,
            projectFinalFields: (input) => {
              const model = getFieldInspectModel(input.producer)
              return model.readFinalFields({
                target: input.target,
                snapshot: record.fieldInspect?.getSnapshot?.() as any,
                ...(input.budget ? { budget: input.budget } : null),
              })
            },
            projectFieldGraph: (input) => {
              const model = getFieldInspectModel(input.producer)
              return model.readSemanticAdjacency({
                target: input.target,
                snapshot: record.fieldInspect?.getSnapshot?.() as any,
                graph: record.fieldInspect?.getGraph?.() as any,
                ...(input.budget ? { budget: input.budget } : null),
              })
            },
            projectFieldSummary: (input) => {
              const model = getFieldInspectModel(input.producer)
              const latestLedgerWatermark = record.fieldInspect?.getLatestLedgerWatermark?.()
              return model.readFieldSummary({
                target: input.target,
                snapshot: record.fieldInspect?.getSnapshot?.() as any,
                ...(record.fieldInspect?.getChangedFieldCount
                  ? { changedFieldCount: record.fieldInspect.getChangedFieldCount() }
                  : null),
                ...(record.fieldInspect?.getDegradedReasonCounts
                  ? { degradedReasonCounts: record.fieldInspect.getDegradedReasonCounts() }
                  : null),
                ...(record.fieldInspect?.getConvergenceCauses
                  ? { convergenceCauses: record.fieldInspect.getConvergenceCauses() }
                  : null),
                ...(latestLedgerWatermark ? { latestLedgerWatermarkRef: makeFieldLedgerWatermarkRef(latestLedgerWatermark) } : null),
                ...(input.budget ? { budget: input.budget } : null),
              })
            },
            projectTimeline: (input) =>
              makeLiveTimelineInspectArtifact({
                target: input.target,
                producer: input.producer,
                operationWindow: input.operationWindow,
                ...(input.fieldFilter ? { fieldFilter: input.fieldFilter } : null),
                ...(input.fieldEventMetadata ? { fieldEventMetadata: input.fieldEventMetadata } : null),
                ...(input.budget ? { budget: input.budget } : null),
              }),
            projectSummary: (input) => {
              const model = getFieldInspectModel(input.producer)
              const latestLedgerWatermark = record.fieldInspect?.getLatestLedgerWatermark?.()
              const fieldSummaryArtifact = model.readFieldSummary({
                target: input.target,
                snapshot: record.fieldInspect?.getSnapshot?.() as any,
                ...(record.fieldInspect?.getChangedFieldCount
                  ? { changedFieldCount: record.fieldInspect.getChangedFieldCount() }
                  : null),
                ...(record.fieldInspect?.getDegradedReasonCounts
                  ? { degradedReasonCounts: record.fieldInspect.getDegradedReasonCounts() }
                  : null),
                ...(record.fieldInspect?.getConvergenceCauses
                  ? { convergenceCauses: record.fieldInspect.getConvergenceCauses() }
                  : null),
                ...(latestLedgerWatermark ? { latestLedgerWatermarkRef: makeFieldLedgerWatermarkRef(latestLedgerWatermark) } : null),
                ...(input.budget ? { budget: input.budget } : null),
              })
              return makeLiveSummaryInspectArtifact({
                target: input.target,
                producer: input.producer,
                operationWindow: input.operationWindow,
                fieldSummaryArtifact,
                ...(input.budget ? { budget: input.budget } : null),
              })
            },
            readOperationWindow: (request) => operationLedgerStore.readWindow(request),
            recordOperationEvent: (input) => operationLedgerStore.recordOperationEvent(input),
            admitDispatch: (request) =>
              admitLiveOperation(request, {
                authorizedTargets: [targetCoordinate],
                ...(record.reflectionManifest ? { reflectionManifest: record.reflectionManifest } : null),
                ...(bindingRegistry.resolveTarget(targetCoordinate)?.actionIndex
                  ? { actionIndex: bindingRegistry.resolveTarget(targetCoordinate)?.actionIndex }
                  : null),
              }),
          }
        }
      }
      return undefined
    },
  }

  return carrier
}
