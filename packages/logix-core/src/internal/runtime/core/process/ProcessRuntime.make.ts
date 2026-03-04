import {
  Cause,
  Context,
  Deferred,
  Effect,
  Fiber,
  FiberRef,
  Layer,
  Option,
  PubSub,
  Queue,
  Ref,
  Scope,
  Stream,
} from 'effect'
import * as Debug from '../DebugSink.js'
import { toSerializableErrorSummary } from '../errorSummary.js'
import * as TaskRunner from '../TaskRunner.js'
import { isDevEnv } from '../env.js'
import { getRuntimeInternals } from '../runtimeInternalsAccessor.js'
import * as Identity from './identity.js'
import * as ProcessConcurrency from './concurrency.js'
import * as ProcessEvents from './events.js'
import * as Meta from './meta.js'
import { resolveSchemaAst } from './selectorSchema.js'
import { compileProcessTriggerStartPlan, type ProcessTriggerStartPlan } from './triggerStartPlan.js'
import { makeNonPlatformTriggerStreamFactory } from './triggerStreams.js'
import type {
  ProcessControlRequest,
  ProcessDefinition,
  ProcessEvent,
  ProcessInstallation,
  ProcessInstanceIdentity,
  ProcessInstanceStatus,
  ProcessPlatformEvent,
  ProcessScope,
  ProcessTrigger,
  ProcessTriggerSpec,
  SerializableErrorSummary,
} from './protocol.js'
import * as Supervision from './supervision.js'

type InstallationKey = string
type ProcessInstanceId = string

type ProcessInstallMode = 'switch' | 'exhaust'

type PlatformEventTriggerSpec = Extract<ProcessTriggerSpec, { readonly kind: 'platformEvent' }>

type InstallationState = {
  readonly identity: {
    readonly processId: string
    readonly scope: ProcessScope
  }
  readonly scopeKey: string
  readonly definition: ProcessDefinition
  env: Context.Context<any>
  forkScope: Scope.Scope
  readonly process: Effect.Effect<void, any, unknown>
  readonly kind: Meta.ProcessMeta['kind']
  readonly platformEventTriggerIndex: ReadonlyMap<string, ReadonlyArray<PlatformEventTriggerSpec>>
  readonly platformEventNames: ReadonlyArray<string>
  readonly startPlan: ProcessTriggerStartPlan
  enabled: boolean
  installedAt?: string
  nextRunSeq: number
  supervision: Supervision.SupervisionState
  currentInstanceId?: ProcessInstanceId
  pendingStart?: { readonly forkScope: Scope.Scope }
}

type InstanceState = {
  readonly installationKey: InstallationKey
  readonly processInstanceId: ProcessInstanceId
  readonly identity: ProcessInstanceIdentity
  readonly processId: string
  readonly scope: ProcessScope
  readonly forkScope: Scope.Scope
  readonly platformTriggersQueue: Queue.Queue<ProcessTrigger>
  status: ProcessInstanceStatus
  nextEventSeq: number
  nextTriggerSeq: number
  fiber?: Fiber.RuntimeFiber<unknown, unknown>
}

export interface ProcessRuntime {
  readonly install: <E, R>(
    process: Effect.Effect<void, E, R>,
    options: {
      readonly scope: ProcessScope
      readonly enabled?: boolean
      readonly installedAt?: string
      readonly mode?: ProcessInstallMode
    },
  ) => Effect.Effect<ProcessInstallation | undefined, never, R>
  readonly listInstallations: (filter?: {
    readonly scopeType?: ProcessScope['type']
    readonly scopeKey?: string
  }) => Effect.Effect<ReadonlyArray<ProcessInstallation>>
  readonly getInstanceStatus: (processInstanceId: string) => Effect.Effect<ProcessInstanceStatus | undefined>
  readonly controlInstance: (processInstanceId: string, request: ProcessControlRequest) => Effect.Effect<void>
  readonly deliverPlatformEvent: (event: ProcessPlatformEvent) => Effect.Effect<void>
  readonly events: Stream.Stream<ProcessEvent>
  readonly getEventsSnapshot: () => Effect.Effect<ReadonlyArray<ProcessEvent>>
}

export class ProcessRuntimeTag extends Context.Tag('@logixjs/core/ProcessRuntime')<ProcessRuntimeTag, ProcessRuntime>() {}

const currentProcessTrigger = FiberRef.unsafeMake<ProcessTrigger | undefined>(undefined)
const currentProcessEventBudget = FiberRef.unsafeMake<Ref.Ref<ProcessEvents.ProcessRunEventBudgetState> | undefined>(
  undefined,
)
const RUNTIME_BOOT_EVENT = 'runtime:boot' as const
const PROCESS_EVENT_HISTORY_MAX_CAPACITY = 0xffff_fffe

const deriveDebugModuleId = (processId: string): string => `process:${processId}`

type ProcessDispatchPayload = NonNullable<ProcessEvent['dispatch']>

const deriveTxnAnchor = (event: ProcessEvent): { readonly txnSeq?: number; readonly txnId?: string } => {
  const trigger: any = event.trigger
  if (!trigger) return {}
  if (
    (trigger.kind === 'moduleAction' || trigger.kind === 'moduleStateChange') &&
    typeof trigger.instanceId === 'string' &&
    typeof trigger.txnSeq === 'number' &&
    Number.isFinite(trigger.txnSeq) &&
    trigger.txnSeq >= 1
  ) {
    const txnSeq = Math.floor(trigger.txnSeq)
    return {
      txnSeq,
      txnId: `${trigger.instanceId}::t${txnSeq}`,
    }
  }
  return {}
}

type ProcessTriggerChainKernel = {
  readonly assignTriggerSeq: (trigger: ProcessTrigger) => ProcessTrigger
  readonly run: (trigger: ProcessTrigger, fatal: Deferred.Deferred<Cause.Cause<any>>) => Effect.Effect<void>
  readonly onDrop: (trigger: ProcessTrigger) => Effect.Effect<void>
}

const makeProcessTriggerChainKernel = (args: {
  readonly shouldRecordChainEvents: boolean
  readonly nextTriggerSeq: () => number
  readonly makeBudgetState: (trigger: ProcessTrigger) => ProcessEvents.ProcessRunEventBudgetState
  readonly emitTriggerEvent: (trigger: ProcessTrigger, severity: ProcessEvent['severity']) => Effect.Effect<void>
  readonly runWithoutChainBudget: (
    trigger: ProcessTrigger,
    fatal: Deferred.Deferred<Cause.Cause<any>>,
  ) => Effect.Effect<void>
}): ProcessTriggerChainKernel => {
  const assignTriggerSeq = (trigger: ProcessTrigger): ProcessTrigger => {
    if (!args.shouldRecordChainEvents) {
      return trigger
    }
    return {
      ...trigger,
      triggerSeq: args.nextTriggerSeq(),
    }
  }

  const run = (trigger: ProcessTrigger, fatal: Deferred.Deferred<Cause.Cause<any>>): Effect.Effect<void> => {
    if (!args.shouldRecordChainEvents) {
      return args.runWithoutChainBudget(trigger, fatal)
    }

    return Effect.gen(function* () {
      const budgetRef = yield* Ref.make(args.makeBudgetState(trigger))
      return yield* Effect.locally(
        currentProcessEventBudget,
        budgetRef,
      )(args.emitTriggerEvent(trigger, 'info').pipe(Effect.zipRight(args.runWithoutChainBudget(trigger, fatal))))
    })
  }

  const onDrop = (trigger: ProcessTrigger): Effect.Effect<void> => args.emitTriggerEvent(trigger, 'warning')

  return {
    assignTriggerSeq,
    run,
    onDrop,
  }
}

const shouldNoopDueToSyncTxn = (scope: ProcessScope, kind: string): Effect.Effect<boolean> => {
  const moduleId = scope.type === 'moduleInstance' ? scope.moduleId : undefined
  const instanceId = scope.type === 'moduleInstance' ? scope.instanceId : undefined
  return TaskRunner.shouldNoopInSyncTransactionFiber({
    moduleId,
    instanceId,
    code: 'process::invalid_usage',
    severity: 'error',
    message:
      'ProcessRuntime scheduling is not allowed inside a synchronous StateTransaction body (it may deadlock the txnQueue).',
    hint:
      "Trigger/schedule Process outside the transaction window (e.g. in a watcher's run section or a separate fiber); " +
      'do not trigger Process directly inside a reducer / synchronous transaction body.',
    kind,
  })
}

const resolveRuntimeStateSchemaAst = (runtime: unknown): ReturnType<typeof resolveSchemaAst> => {
  try {
    const internals = getRuntimeInternals(runtime as any)
    return resolveSchemaAst(internals.stateSchema)
  } catch {
    return undefined
  }
}

const withModuleHint = (error: Error, moduleId: string): Error => {
  const hint = (error as any).hint
  if (typeof hint === 'string' && hint.length > 0) {
    if (!hint.includes('moduleId=')) {
      ;(error as any).hint = `moduleId=${moduleId}\n${hint}`
    }
    return error
  }
  ;(error as any).hint = `moduleId=${moduleId}`
  return error
}

const actionIdFromUnknown = (action: unknown): string | undefined => {
  if (!action || typeof action !== 'object') return undefined
  const anyAction = action as any
  if (typeof anyAction._tag === 'string' && anyAction._tag.length > 0) return anyAction._tag
  if (typeof anyAction.type === 'string' && anyAction.type.length > 0) return anyAction.type
  return undefined
}

const buildPlatformEventTriggerIndex = (
  definition: ProcessDefinition,
): ReadonlyMap<string, ReadonlyArray<PlatformEventTriggerSpec>> => {
  const index = new Map<string, PlatformEventTriggerSpec[]>()
  for (const trigger of definition.triggers) {
    if (trigger.kind !== 'platformEvent') continue
    const current = index.get(trigger.platformEvent)
    if (current) {
      current.push(trigger)
    } else {
      index.set(trigger.platformEvent, [trigger])
    }
  }
  return index
}

const syncPlatformEventInstallations = (options: {
  installationKey: InstallationKey,
  previousEventNames: ReadonlyArray<string>
  nextTriggerIndex: ReadonlyMap<string, ReadonlyArray<PlatformEventTriggerSpec>>
  installationsByEventName: Map<string, Set<InstallationKey>>
}): ReadonlyArray<string> => {
  for (const eventName of options.previousEventNames) {
    const current = options.installationsByEventName.get(eventName)
    if (!current) continue
    current.delete(options.installationKey)
    if (current.size === 0) {
      options.installationsByEventName.delete(eventName)
    }
  }

  const nextEventNames = Array.from(options.nextTriggerIndex.keys())
  for (const eventName of nextEventNames) {
    const current = options.installationsByEventName.get(eventName)
    if (current) {
      current.add(options.installationKey)
    } else {
      options.installationsByEventName.set(eventName, new Set([options.installationKey]))
    }
  }

  return nextEventNames
}

export const make = (options?: {
  readonly maxEventHistory?: number
}): Effect.Effect<ProcessRuntime, never, Scope.Scope> =>
  Effect.gen(function* () {
    const runtimeScope = yield* Effect.scope
    const requestedMaxEventHistory =
      typeof options?.maxEventHistory === 'number' &&
      Number.isFinite(options.maxEventHistory) &&
      options.maxEventHistory >= 0
        ? Math.floor(options.maxEventHistory)
        : 500
    const maxEventHistory = Math.min(requestedMaxEventHistory, PROCESS_EVENT_HISTORY_MAX_CAPACITY)

    const installations = new Map<InstallationKey, InstallationState>()
    const installationsByPlatformEvent = new Map<string, Set<InstallationKey>>()
    const instances = new Map<ProcessInstanceId, InstanceState>()
    const moduleRuntimeTagCache = new Map<string, Context.Tag<any, any>>()

    const resolveModuleRuntimeTag = (moduleId: string): Context.Tag<any, any> => {
      const cached = moduleRuntimeTagCache.get(moduleId)
      if (cached) return cached
      const created = Context.Tag(`@logixjs/Module/${moduleId}`)() as Context.Tag<any, any>
      moduleRuntimeTagCache.set(moduleId, created)
      return created
    }

    const eventHistoryCapacity = maxEventHistory > 0 ? maxEventHistory : 0
    const eventHistoryRing: ProcessEvent[] = []
    let eventHistoryStart = 0
    let eventHistorySize = 0
    const eventsHub = yield* PubSub.sliding<ProcessEvent>(Math.max(1, Math.min(2048, maxEventHistory)))

    const appendEventHistory = (event: ProcessEvent): void => {
      if (eventHistoryCapacity <= 0) {
        eventHistorySize = 0
        eventHistoryStart = 0
        return
      }

      if (eventHistorySize < eventHistoryCapacity) {
        const writeIndex = (eventHistoryStart + eventHistorySize) % eventHistoryCapacity
        if (writeIndex === eventHistoryRing.length) {
          eventHistoryRing.push(event)
        } else {
          eventHistoryRing[writeIndex] = event
        }
        eventHistorySize += 1
        return
      }

      eventHistoryRing[eventHistoryStart] = event
      eventHistoryStart = (eventHistoryStart + 1) % eventHistoryCapacity
    }

    const snapshotEventHistory = (): ReadonlyArray<ProcessEvent> => {
      if (eventHistoryCapacity <= 0 || eventHistorySize === 0) {
        return []
      }

      const snapshot = new Array<ProcessEvent>(eventHistorySize)
      for (let index = 0; index < eventHistorySize; index += 1) {
        const ringIndex = (eventHistoryStart + index) % eventHistoryCapacity
        snapshot[index] = eventHistoryRing[ringIndex] as ProcessEvent
      }
      return snapshot
    }

    const recordDebugEvent = (event: ProcessEvent): Effect.Effect<void> =>
      Effect.gen(function* () {
        const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)

        // diagnostics=off: avoid entering Debug sinks (near-zero cost); error cases are exposed via diagnostic events.
        if (diagnosticsLevel === 'off') {
          return
        }

        const processId = event.identity.identity.processId
        const processInstanceId = Identity.processInstanceIdFromIdentity(event.identity)
        const moduleId = deriveDebugModuleId(processId)
        const { txnSeq, txnId } = deriveTxnAnchor(event)

        yield* Debug.record({
          type: event.type,
          moduleId,
          instanceId: processInstanceId,
          identity: event.identity,
          severity: event.severity,
          eventSeq: event.eventSeq,
          timestampMs: event.timestampMs,
          trigger: event.trigger,
          dispatch: event.dispatch,
          error: event.error,
          budgetEnvelope: (event as any).budgetEnvelope,
          degrade: (event as any).degrade,
          txnSeq,
          txnId,
        } as any)
      })

    const publishEvent = (event: ProcessEvent): Effect.Effect<void> =>
      Effect.gen(function* () {
        appendEventHistory(event)
        yield* PubSub.publish(eventsHub, event)
        yield* recordDebugEvent(event)
      })

    const emit = (event: ProcessEvent): Effect.Effect<void> =>
      Effect.gen(function* () {
        const budgetRef = yield* FiberRef.get(currentProcessEventBudget)
        if (budgetRef) {
          const decision = yield* Ref.modify(budgetRef, (state) => {
            const [nextDecision, nextState] = ProcessEvents.applyProcessRunEventBudget(state, event)
            return [nextDecision, nextState] as const
          })

          if (decision._tag === 'emit' || decision._tag === 'emitSummary') {
            yield* publishEvent(decision.event)
          }
          return
        }

        const enforced = ProcessEvents.enforceProcessEventMaxBytes(event)
        yield* publishEvent(enforced.event)
      })

    const emitErrorDiagnostic = (
      scope: ProcessScope,
      processId: string,
      code: string,
      message: string,
      hint?: string,
    ): Effect.Effect<void> => {
      if (!isDevEnv()) {
        return Effect.void
      }
      const moduleId = scope.type === 'moduleInstance' ? scope.moduleId : undefined
      const instanceId = scope.type === 'moduleInstance' ? scope.instanceId : undefined
      return Debug.record({
        type: 'diagnostic',
        moduleId,
        instanceId,
        code,
        severity: 'error',
        message,
        hint,
        actionTag: processId,
        kind: 'process_runtime',
      })
    }

    const resolveMissingDependencies = (installation: InstallationState): ReadonlyArray<string> => {
      const requires = installation.startPlan.dependencyModuleIds
      if (requires.length === 0) return []

      const missing: string[] = []
      for (const dep of requires) {
        if (typeof dep !== 'string' || dep.length === 0) continue

        const tag = resolveModuleRuntimeTag(dep)
        const found = Context.getOption(installation.env, tag)
        if (Option.isNone(found)) {
          missing.push(dep)
        }
      }
      return missing
    }

    const buildModuleRuntimeRegistry = (
      installation: InstallationState,
      env: Context.Context<any>,
    ): ReadonlyMap<string, unknown> => {
      const registry = new Map<string, unknown>()
      for (const moduleId of installation.startPlan.dependencyModuleIds) {
        if (typeof moduleId !== 'string' || moduleId.length === 0 || registry.has(moduleId)) continue
        const tag = resolveModuleRuntimeTag(moduleId)
        const found = Context.getOption(env, tag)
        if (Option.isSome(found)) {
          registry.set(moduleId, found.value)
        }
      }
      return registry
    }

    const stopInstance = (
      instance: InstanceState,
      reason: ProcessInstanceStatus['stoppedReason'],
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        if (
          instance.status.status === 'stopped' ||
          instance.status.status === 'failed' ||
          instance.status.status === 'stopping'
        ) {
          return
        }

        const fiber = instance.fiber
        instance.status = {
          ...instance.status,
          status: 'stopping',
          stoppedReason: reason,
        }

        if (fiber) {
          yield* Fiber.interrupt(fiber)
        }

        yield* Queue.shutdown(instance.platformTriggersQueue)

        instance.status = {
          ...instance.status,
          status: 'stopped',
          stoppedReason: reason,
        }
        instance.fiber = undefined

        const evt: ProcessEvent = {
          type: 'process:stop',
          identity: instance.identity,
          severity: 'info',
          eventSeq: instance.nextEventSeq++,
          timestampMs: Date.now(),
        }
        yield* emit(evt)

        const installation = installations.get(instance.installationKey)
        if (installation?.pendingStart) {
          installation.pendingStart = undefined
          yield* startInstallation(instance.installationKey)
        }
      })

    const startInstallation: (installationKey: InstallationKey) => Effect.Effect<void> = (installationKey) =>
      Effect.gen(function* () {
        const installation = installations.get(installationKey)
        if (!installation) return
        installation.pendingStart = undefined

        const noop = yield* shouldNoopDueToSyncTxn(installation.identity.scope, 'process_start_in_transaction')
        if (noop) return

        // Do not start again if an active instance already exists.
        const currentId = installation.currentInstanceId
        if (currentId) {
          const current = instances.get(currentId)
          if (current && (current.status.status === 'running' || current.status.status === 'starting')) {
            return
          }
        }

        const runSeq = installation.nextRunSeq++
        const identity: ProcessInstanceIdentity = {
          identity: installation.identity,
          runSeq,
        }
        const processInstanceId = Identity.processInstanceIdFromIdentity(identity)

        const platformTriggersQueue = yield* Queue.sliding<ProcessTrigger>(64)

        const instanceState: InstanceState = {
          installationKey,
          processInstanceId,
          identity,
          processId: installation.identity.processId,
          scope: installation.identity.scope,
          forkScope: installation.forkScope,
          platformTriggersQueue,
          status: {
            identity,
            status: 'starting',
          },
          nextEventSeq: 1,
          nextTriggerSeq: 1,
        }

        instances.set(processInstanceId, instanceState)
        installation.currentInstanceId = processInstanceId

        // When forkScope is disposed (e.g. uiSubtree unmount), ensure the instance transitions to stopped and emits a stop event.
        // - Do not rely on unstable "whether interruption reaches catchAllCause" behavior.
        // - Do not double-register on runtimeScope; the runtime finalizer already stops all instances.
        if (installation.forkScope !== runtimeScope) {
          yield* Scope.addFinalizer(
            installation.forkScope as Scope.CloseableScope,
            Effect.suspend(() => {
              const status = instanceState.status.status
              if (status === 'stopped' || status === 'failed' || status === 'stopping') {
                return Effect.void
              }
              return stopInstance(instanceState, 'scopeDisposed')
            }).pipe(Effect.catchAllCause(() => Effect.void)),
          )
        }

        // start event: indicates the instance has entered the start flow (fiber has been forked).
        yield* emit({
          type: 'process:start',
          identity,
          severity: 'info',
          eventSeq: instanceState.nextEventSeq++,
          timestampMs: Date.now(),
        })

        const missing = resolveMissingDependencies(installation)
        if (missing.length > 0) {
          const hint = isDevEnv()
            ? [
                'Strict scope dependency resolution: missing required modules in the current scope.',
                `missing: ${missing.join(', ')}`,
                '',
                'fix:',
                '- Provide the missing module implementation(s) in the same scope via imports.',
                `  Example: RootModule.implement({ imports: [${missing[0]}.implement(...).impl], processes: [...] })`,
                '- Do not rely on cross-scope fallbacks / guessing instances.',
              ].join('\n')
            : undefined

          const error: SerializableErrorSummary = {
            message: `Missing dependencies in scope: ${missing.join(', ')}`,
            code: 'process::missing_dependency',
            hint,
          }

          instanceState.status = {
            ...instanceState.status,
            status: 'failed',
            stoppedReason: 'failed',
            lastError: error,
          }

          yield* emit({
            type: 'process:error',
            identity,
            severity: 'error',
            eventSeq: instanceState.nextEventSeq++,
            timestampMs: Date.now(),
            error,
          })

          yield* emitErrorDiagnostic(
            installation.identity.scope,
            installation.identity.processId,
            'process::missing_dependency',
            error.message,
            hint,
          )
          return
        }

        const shouldRecordChainEvents = installation.definition.diagnosticsLevel !== 'off'

        const baseEnv = installation.env
        const moduleRuntimeRegistry = buildModuleRuntimeRegistry(installation, baseEnv)

        const makeWrappedEnv = (): Context.Context<any> => {
          if (!shouldRecordChainEvents) {
            return baseEnv
          }

          const requires = installation.startPlan.dispatchTracingModuleIds
          if (requires.length === 0) {
            return baseEnv
          }

            let nextEnv = baseEnv

            for (const moduleId of requires) {
              if (typeof moduleId !== 'string' || moduleId.length === 0) continue
            const tag = resolveModuleRuntimeTag(moduleId)
            const found = Context.getOption(baseEnv, tag)
            if (Option.isNone(found)) continue
            const runtime = found.value as any

            const recordDispatch = (action: unknown) =>
              Effect.gen(function* () {
                const trigger = yield* FiberRef.get(currentProcessTrigger)
                if (!trigger) return

                const actionId = actionIdFromUnknown(action) ?? 'unknown'
                const dispatchModuleId = typeof runtime.moduleId === 'string' ? runtime.moduleId : moduleId
                const dispatchInstanceId = typeof runtime.instanceId === 'string' ? runtime.instanceId : 'unknown'

                yield* emit(
                  makeDispatchEvent(trigger, {
                    moduleId: dispatchModuleId,
                    instanceId: dispatchInstanceId,
                    actionId,
                  }),
                )
              })

            const wrapped = {
              ...runtime,
              dispatch: (action: unknown) => runtime.dispatch(action).pipe(Effect.tap(() => recordDispatch(action))),
              dispatchLowPriority: (action: unknown) =>
                runtime.dispatchLowPriority(action).pipe(Effect.tap(() => recordDispatch(action))),
              dispatchBatch: (actions: ReadonlyArray<unknown>) =>
                runtime
                  .dispatchBatch(actions)
                  .pipe(Effect.tap(() => Effect.forEach(actions, recordDispatch, { discard: true }))),
            }

            nextEnv = Context.add(tag, wrapped)(nextEnv)
          }

          return nextEnv
        }

        const wrappedEnv = makeWrappedEnv()
        const providedProcess = Effect.provide(installation.process, wrappedEnv)

        const nextProcessEventMeta = () => ({
          identity,
          eventSeq: instanceState.nextEventSeq++,
          timestampMs: Date.now(),
        })

        const makeDispatchEvent = (
          trigger: ProcessTrigger,
          dispatch: ProcessDispatchPayload,
        ): ProcessEvent => ({
          type: 'process:dispatch',
          trigger,
          dispatch,
          severity: 'info',
          ...nextProcessEventMeta(),
        })

        const makeTriggerEvent = (
          trigger: ProcessTrigger,
          severity: ProcessEvent['severity'],
          error?: SerializableErrorSummary,
        ): ProcessEvent => ({
          type: 'process:trigger',
          trigger,
          severity,
          ...(error ? { error } : null),
          ...nextProcessEventMeta(),
        })

        const makeTriggerStream = makeNonPlatformTriggerStreamFactory({
          moduleRuntimeRegistry,
          shouldRecordChainEvents,
          actionIdFromUnknown,
          resolveRuntimeStateSchemaAst,
          withModuleHint,
          emitSelectorWarning: (trigger, warning) => emit(makeTriggerEvent(trigger, 'warning', warning)),
        })

        const makeRun = (trigger: ProcessTrigger, fatal: Deferred.Deferred<Cause.Cause<any>>): Effect.Effect<void> =>
          Effect.locally(
            currentProcessTrigger,
            trigger,
          )(
            providedProcess.pipe(
              Effect.catchAllCause((cause) => {
                if (Cause.isInterruptedOnly(cause)) {
                  return Effect.void
                }
                return Deferred.succeed(fatal, cause).pipe(
                  Effect.asVoid,
                  Effect.catchAll(() => Effect.void),
                )
              }),
            ),
          )

        const emitTriggerEvent = (trigger: ProcessTrigger, severity: ProcessEvent['severity']): Effect.Effect<void> => {
          if (!shouldRecordChainEvents) {
            return Effect.void
          }

          return emit(makeTriggerEvent(trigger, severity))
        }
        const triggerChainKernel = makeProcessTriggerChainKernel({
          shouldRecordChainEvents,
          nextTriggerSeq: () => instanceState.nextTriggerSeq++,
          makeBudgetState: (trigger) =>
            ProcessEvents.makeProcessRunEventBudgetState({
              runId: ProcessEvents.makeProcessRunBudgetRunId(identity, trigger),
            }),
          emitTriggerEvent,
          runWithoutChainBudget: makeRun,
        })

        const policy = installation.definition.concurrency
        const bootTrigger = installation.startPlan.bootTrigger

        const streamReady = yield* Deferred.make<void>()
        const markStreamReady: Effect.Effect<void> = Deferred.succeed(streamReady, undefined).pipe(Effect.asVoid)

        const instanceProgram = Effect.gen(function* () {
          const fatal = yield* Deferred.make<Cause.Cause<any>>()

          const platformEventStream: Stream.Stream<ProcessTrigger> = Stream.fromQueue(
            instanceState.platformTriggersQueue,
          )

          const nonPlatformTriggers = installation.startPlan.nonPlatformTriggers

          const streams = yield* Effect.forEach(nonPlatformTriggers, makeTriggerStream)

          const triggerStream = Stream.mergeAll([platformEventStream, ...streams], {
            concurrency: 'unbounded',
          })

          const reportQueueOverflow = (
            info: ProcessConcurrency.ProcessTriggerQueueOverflowInfo,
          ): Effect.Effect<void> => {
            const err = new Error('Process trigger queue overflow (serial maxQueue guard).')
            ;(err as any).code = 'process::serial_queue_overflow'
            ;(err as any).hint = [
              `mode=${info.mode}`,
              `queue: current=${info.currentLength} peak=${info.peak}`,
              `maxQueue: configured=${info.limit.configured} guard=${info.limit.guard}`,
              `policy: ${JSON.stringify(info.policy)}`,
              '',
              'fix:',
              '- Configure concurrency.maxQueue (serial) to a finite value, or switch to mode=latest/drop to avoid unbounded backlog.',
            ].join('\n')
            return Deferred.succeed(fatal, Cause.fail(err)).pipe(
              Effect.asVoid,
              Effect.catchAll(() => Effect.void),
            )
          }

          const runnerFiber = yield* Effect.forkScoped(
            ProcessConcurrency.runProcessTriggerStream({
              stream: triggerStream,
              policy,
              assignTriggerSeq: triggerChainKernel.assignTriggerSeq,
              run: (trigger) => triggerChainKernel.run(trigger, fatal),
              onDrop: triggerChainKernel.onDrop,
              onQueueOverflow: reportQueueOverflow,
            }),
          )

          // Ensure the trigger stream fiber has started pulling, otherwise moduleAction/moduleStateChange events
          // may be published before any subscriber exists (PubSub streams drop events without subscribers).
          //
          // We rely on the fiber reaching "Suspended" (typically blocked on a queue take) as a proxy that the
          // subscription has been established.
          for (let i = 0; i < 64; i++) {
            const status = yield* Fiber.status(runnerFiber)
            if (status._tag === 'Suspended' || status._tag === 'Done') {
              break
            }
            yield* Effect.yieldNow()
          }
          yield* markStreamReady

          if (bootTrigger) {
            yield* Queue.offer(instanceState.platformTriggersQueue, bootTrigger)
          }

          const cause = yield* Deferred.await(fatal)
          yield* Fiber.interrupt(runnerFiber)
          return yield* Effect.failCause(cause)
        })

        const fiber = yield* Effect.forkIn(installation.forkScope)(
          Effect.locally(TaskRunner.inSyncTransactionFiber, false)(
            Effect.scoped(instanceProgram).pipe(
              // If the instance fails early (e.g. invalid trigger spec), still unblock install/start.
              Effect.ensuring(markStreamReady),
              Effect.catchAllCause((cause) =>
                Effect.gen(function* () {
                // Interruptions (typically from scope dispose / manual stop) should not be treated as process failures.
                // Otherwise we emit process:error/diagnostic during scope shutdown and may deadlock disposal.
                if (Cause.isInterruptedOnly(cause)) {
                  // If stopInstance already advanced the status to stopping, stopInstance owns the stop event and final state.
                  if (instanceState.status.status === 'stopping') {
                    return
                  }

                  // Otherwise treat as a natural stop due to scope disposal (e.g. moduleInstance scope closing).
                  instanceState.status = {
                    ...instanceState.status,
                    status: 'stopped',
                    stoppedReason: 'scopeDisposed',
                  }
                  instanceState.fiber = undefined

                  yield* Effect.uninterruptible(
                    emit({
                      type: 'process:stop',
                      identity,
                      severity: 'info',
                      eventSeq: instanceState.nextEventSeq++,
                      timestampMs: Date.now(),
                    }),
                  )

                  const installation = installations.get(installationKey)
                  if (installation?.pendingStart) {
                    installation.pendingStart = undefined
                    yield* startInstallation(installationKey)
                  }
                  return
                }

                const primary = Option.getOrElse(Cause.failureOption(cause), () =>
                  Option.getOrElse(Cause.dieOption(cause), () => cause),
                )
                const summary = toSerializableErrorSummary(primary)
                const error: SerializableErrorSummary = summary.errorSummary as any

                instanceState.status = {
                  ...instanceState.status,
                  status: 'failed',
                  stoppedReason: 'failed',
                  lastError: error,
                }

                yield* emit({
                  type: 'process:error',
                  identity,
                  severity: 'error',
                  eventSeq: instanceState.nextEventSeq++,
                  timestampMs: Date.now(),
                  error,
                })

                const decision = Supervision.onFailure(
                  installation.definition.errorPolicy,
                  installation.supervision,
                  Date.now(),
                )
                installation.supervision = decision.nextState

                if (decision.decision === 'restart') {
                  // supervise: controlled restart (runSeq increments) and emit a restart event.
                  yield* emit({
                    type: 'process:restart',
                    identity,
                    severity: 'warning',
                    eventSeq: instanceState.nextEventSeq++,
                    timestampMs: Date.now(),
                    error,
                  })
                  yield* startInstallation(installationKey)
                } else {
                  yield* emitErrorDiagnostic(
                    installation.identity.scope,
                    installation.identity.processId,
                    'process::failed_stop',
                    'Process failed and stopped (failStop / restart limit reached).',
                    `processId=${installation.identity.processId} scopeKey=${installation.scopeKey} failures=${decision.withinWindowFailures} maxRestarts=${decision.maxRestarts}`,
                  )
                }
                }),
              ),
            ),
          ),
        )

        instanceState.fiber = fiber as Fiber.RuntimeFiber<unknown, unknown>
        instanceState.status = {
          ...instanceState.status,
          status: 'running',
        }

        // Hard guarantee: block until trigger subscriptions are acquired (or the instance fiber failed early).
        yield* Deferred.await(streamReady)
      })

    const install = <E, R>(
      process: Effect.Effect<void, E, R>,
      options: {
        readonly scope: ProcessScope
        readonly enabled?: boolean
        readonly installedAt?: string
        readonly mode?: ProcessInstallMode
      },
    ): Effect.Effect<ProcessInstallation | undefined, never, R> =>
      Effect.gen(function* () {
        const meta = Meta.getMeta(process)
        if (!meta) {
          return undefined
        }

        const env = yield* Effect.context<R>()
        const forkScopeOpt = yield* Effect.serviceOption(Scope.Scope)
        const forkScope = Option.isSome(forkScopeOpt) ? forkScopeOpt.value : runtimeScope

        const scopeKey = Identity.scopeKeyFromScope(options.scope)
        const identity = {
          processId: meta.definition.processId,
          scope: options.scope,
        } as const

        const installationKey = Identity.installationKeyFromIdentity(identity)
        const derived = Effect.suspend(() => process)
        Meta.attachMeta(derived, {
          ...meta,
          installationScope: options.scope,
        })

        const nextPlatformEventTriggerIndex = buildPlatformEventTriggerIndex(meta.definition)
        const nextStartPlan = compileProcessTriggerStartPlan(meta.definition)
        const existing = installations.get(installationKey)
        if (existing) {
          const updated: InstallationState = {
            ...existing,
            definition: meta.definition,
            env: env as Context.Context<any>,
            forkScope,
            process: derived as unknown as Effect.Effect<void, any, unknown>,
            kind: meta.kind ?? 'process',
            platformEventTriggerIndex: nextPlatformEventTriggerIndex,
            platformEventNames: syncPlatformEventInstallations({
              installationKey,
              previousEventNames: existing.platformEventNames,
              nextTriggerIndex: nextPlatformEventTriggerIndex,
              installationsByEventName: installationsByPlatformEvent,
            }),
            startPlan: nextStartPlan,
            enabled: options.enabled ?? existing.enabled,
            installedAt: options.installedAt ?? existing.installedAt,
          }
          installations.set(installationKey, updated)

          if (!updated.enabled) {
            updated.pendingStart = undefined
            return {
              identity,
              enabled: updated.enabled,
              installedAt: updated.installedAt,
            } satisfies ProcessInstallation
          }

          const currentId = updated.currentInstanceId
          const current = currentId ? instances.get(currentId) : undefined
          const status = current?.status.status

          if (status === 'running' || status === 'starting') {
            const mode: ProcessInstallMode = options.mode ?? 'switch'
            if (mode === 'switch' && current && current.forkScope !== forkScope) {
              updated.pendingStart = { forkScope }
              yield* Scope.addFinalizer(
                forkScope,
                Effect.sync(() => {
                  const installation = installations.get(installationKey)
                  if (!installation) return
                  if (installation.pendingStart?.forkScope === forkScope) {
                    installation.pendingStart = undefined
                  }
                }),
              )
            } else {
              updated.pendingStart = undefined
            }
            return {
              identity,
              enabled: updated.enabled,
              installedAt: updated.installedAt,
            } satisfies ProcessInstallation
          }

          if (status === 'stopping') {
            const mode: ProcessInstallMode = options.mode ?? 'switch'
            if (mode === 'switch') {
              updated.pendingStart = { forkScope }
              yield* Scope.addFinalizer(
                forkScope,
                Effect.sync(() => {
                  const installation = installations.get(installationKey)
                  if (!installation) return
                  if (installation.pendingStart?.forkScope === forkScope) {
                    installation.pendingStart = undefined
                  }
                }),
              )
            } else {
              updated.pendingStart = undefined
            }
            return {
              identity,
              enabled: updated.enabled,
              installedAt: updated.installedAt,
            } satisfies ProcessInstallation
          }

          updated.pendingStart = undefined
          yield* startInstallation(installationKey)
          return {
            identity,
            enabled: updated.enabled,
            installedAt: updated.installedAt,
          } satisfies ProcessInstallation
        }

        const nextPlatformEventNames = syncPlatformEventInstallations({
          installationKey,
          previousEventNames: [],
          nextTriggerIndex: nextPlatformEventTriggerIndex,
          installationsByEventName: installationsByPlatformEvent,
        })

        const installation: InstallationState = {
          identity,
          scopeKey,
          definition: meta.definition,
          env: env as Context.Context<any>,
          forkScope,
          process: derived as unknown as Effect.Effect<void, any, unknown>,
          kind: meta.kind ?? 'process',
          platformEventTriggerIndex: nextPlatformEventTriggerIndex,
          platformEventNames: nextPlatformEventNames,
          startPlan: nextStartPlan,
          enabled: options.enabled ?? true,
          installedAt: options.installedAt,
          nextRunSeq: 1,
          supervision: Supervision.initialState(),
          pendingStart: undefined,
        }

        installations.set(installationKey, installation)

        if (installation.enabled) {
          yield* startInstallation(installationKey)
        }

        return {
          identity,
          enabled: installation.enabled,
          installedAt: installation.installedAt,
        } satisfies ProcessInstallation
      })

    const listInstallations: ProcessRuntime['listInstallations'] = (filter) =>
      Effect.sync(() => {
        const scopeType = filter?.scopeType
        const scopeKey = filter?.scopeKey
        const out: ProcessInstallation[] = []
        for (const installation of installations.values()) {
          if (scopeType && installation.identity.scope.type !== scopeType) continue
          if (scopeKey && installation.scopeKey !== scopeKey) continue
          out.push({
            identity: installation.identity,
            enabled: installation.enabled,
            installedAt: installation.installedAt,
          })
        }
        return out
      })

    const getInstanceStatus: ProcessRuntime['getInstanceStatus'] = (processInstanceId) =>
      Effect.sync(() => instances.get(processInstanceId)?.status)

    const controlInstance: ProcessRuntime['controlInstance'] = (processInstanceId, request) =>
      Effect.suspend(() => {
        const instance = instances.get(processInstanceId)
        if (!instance) {
          return Effect.void
        }

        return shouldNoopDueToSyncTxn(instance.scope, 'process_control_in_transaction').pipe(
          Effect.flatMap((noop) => {
            if (noop) {
              return Effect.void
            }

            if (request.action === 'stop') {
              return stopInstance(instance, 'manualStop')
            }

            if (request.action === 'restart') {
              return stopInstance(instance, 'manualStop').pipe(
                Effect.flatMap(() => {
                  const installation = installations.get(instance.installationKey)
                  if (!installation) {
                    return Effect.void
                  }
                  installation.currentInstanceId = undefined
                  return startInstallation(instance.installationKey)
                }),
              )
            }

            // start: only applies to stopped instances; reuses current runSeq without incrementing.
            if (request.action === 'start') {
              if (instance.status.status === 'running' || instance.status.status === 'starting') {
                return Effect.void
              }

              const installation = installations.get(instance.installationKey)
              if (!installation) {
                return Effect.void
              }
              installation.currentInstanceId = undefined
              return startInstallation(instance.installationKey)
            }

            return Effect.void
          }),
        )
      })

    const deliverPlatformEvent: ProcessRuntime['deliverPlatformEvent'] = (event) =>
      Effect.gen(function* () {
        const noop = yield* TaskRunner.shouldNoopInSyncTransactionFiber({
          code: 'process::invalid_usage',
          severity: 'error',
          message:
            'ProcessRuntime platform events are not allowed inside a synchronous StateTransaction body (it may deadlock the txnQueue).',
          hint: 'Deliver platformEvent outside the transaction window.',
          kind: 'process_platform_event_in_transaction',
        })
        if (noop) return

        const eventName = event.eventName
        const installationKeys = installationsByPlatformEvent.get(eventName)
        if (!installationKeys || installationKeys.size === 0) {
          return
        }

        yield* Effect.forEach(
          installationKeys,
          (installationKey) =>
            Effect.suspend(() => {
              const installation = installations.get(installationKey)
              if (!installation) {
                return Effect.void
              }

              const currentInstanceId = installation.currentInstanceId
              if (!currentInstanceId) {
                return Effect.void
              }

              const instance = instances.get(currentInstanceId)
              if (!instance) {
                return Effect.void
              }

              if (instance.status.status !== 'starting' && instance.status.status !== 'running') {
                return Effect.void
              }

              const specs = installation.platformEventTriggerIndex.get(eventName)
              if (!specs || specs.length === 0) {
                return Effect.void
              }

              return Effect.forEach(
                specs,
                (spec) =>
                  Queue.offer(instance.platformTriggersQueue, {
                    kind: 'platformEvent',
                    name: spec.name,
                    platformEvent: spec.platformEvent,
                  } satisfies ProcessTrigger),
                { discard: true },
              )
            }),
          { discard: true },
        )
      })

    const eventsStream: ProcessRuntime['events'] = Stream.fromPubSub(eventsHub)

    const getEventsSnapshot: ProcessRuntime['getEventsSnapshot'] = () => Effect.sync(snapshotEventHistory)

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        for (const installation of installations.values()) {
          installation.pendingStart = undefined
        }
        for (const instance of instances.values()) {
          if (instance.fiber) {
            yield* stopInstance(instance, 'scopeDisposed')
          }
        }
      }).pipe(
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            // Finalizers must not throw; best-effort logging only.
            if (isDevEnv()) {
              // eslint-disable-next-line no-console
              console.warn('[ProcessRuntime] finalizer failed', Cause.pretty(cause))
            }
          }),
        ),
      ),
    )

    return {
      install,
      listInstallations,
      getInstanceStatus,
      controlInstance,
      deliverPlatformEvent,
      events: eventsStream,
      getEventsSnapshot,
    } satisfies ProcessRuntime
  })

export const layer = (options?: { readonly maxEventHistory?: number }): Layer.Layer<ProcessRuntimeTag, never, never> =>
  Layer.scoped(ProcessRuntimeTag, make(options))
