import {
  Cause,
  Context,
  Deferred,
  Duration,
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
import { makeSchemaSelector, resolveSchemaAst } from './selectorSchema.js'
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

export class ProcessRuntimeTag extends Context.Tag('@logix/core/ProcessRuntime')<ProcessRuntimeTag, ProcessRuntime>() {}

const currentProcessTrigger = FiberRef.unsafeMake<ProcessTrigger | undefined>(undefined)
const currentProcessEventBudget = FiberRef.unsafeMake<Ref.Ref<ProcessEvents.ProcessRunEventBudgetState> | undefined>(
  undefined,
)
const RUNTIME_BOOT_EVENT = 'runtime:boot' as const

const deriveDebugModuleId = (processId: string): string => `process:${processId}`

type NonPlatformTriggerSpec = Exclude<ProcessTriggerSpec, { readonly kind: 'platformEvent' }>

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

export const make = (options?: {
  readonly maxEventHistory?: number
}): Effect.Effect<ProcessRuntime, never, Scope.Scope> =>
  Effect.gen(function* () {
    const runtimeScope = yield* Effect.scope
    const maxEventHistory =
      typeof options?.maxEventHistory === 'number' &&
      Number.isFinite(options.maxEventHistory) &&
      options.maxEventHistory >= 0
        ? Math.floor(options.maxEventHistory)
        : 500

    const installations = new Map<InstallationKey, InstallationState>()
    const instances = new Map<ProcessInstanceId, InstanceState>()

    const eventsBuffer: ProcessEvent[] = []
    const eventsHub = yield* PubSub.sliding<ProcessEvent>(Math.max(1, Math.min(2048, maxEventHistory)))

    const trimEvents = () => {
      if (maxEventHistory <= 0) {
        eventsBuffer.length = 0
        return
      }
      if (eventsBuffer.length <= maxEventHistory) return
      const excess = eventsBuffer.length - maxEventHistory
      eventsBuffer.splice(0, excess)
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
          txnSeq,
          txnId,
        } as any)
      })

    const publishEvent = (event: ProcessEvent): Effect.Effect<void> =>
      Effect.gen(function* () {
        eventsBuffer.push(event)
        trimEvents()
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
      const declared = installation.definition.requires ?? []
      const implicitFromTriggers: string[] = []
      for (const trigger of installation.definition.triggers) {
        if (trigger.kind === 'moduleAction' || trigger.kind === 'moduleStateChange') {
          implicitFromTriggers.push(trigger.moduleId)
        }
      }

      const requires = Array.from(new Set([...declared, ...implicitFromTriggers]))
      if (requires.length === 0) return []

      const missing: string[] = []
      for (const dep of requires) {
        if (typeof dep !== 'string' || dep.length === 0) continue

        // ModuleTag key convention: `@logix/Module/${id}`; Tag identity is derived from the key, so we can construct it on demand.
        const tag = Context.Tag(`@logix/Module/${dep}`)() as Context.Tag<any, any>
        const found = Context.getOption(installation.env, tag)
        if (Option.isNone(found)) {
          missing.push(dep)
        }
      }
      return missing
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

        const makeWrappedEnv = (): Context.Context<any> => {
          if (!shouldRecordChainEvents) {
            return baseEnv
          }

          const requires = installation.definition.requires ?? []
          if (requires.length === 0) {
            return baseEnv
          }

          const ids = Array.from(new Set(requires))
          let nextEnv = baseEnv

          for (const moduleId of ids) {
            if (typeof moduleId !== 'string' || moduleId.length === 0) continue
            const tag = Context.Tag(`@logix/Module/${moduleId}`)() as Context.Tag<any, any>
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

                const evt: ProcessEvent = {
                  type: 'process:dispatch',
                  identity,
                  trigger,
                  dispatch: {
                    moduleId: dispatchModuleId,
                    instanceId: dispatchInstanceId,
                    actionId,
                  },
                  severity: 'info',
                  eventSeq: instanceState.nextEventSeq++,
                  timestampMs: Date.now(),
                }

                yield* emit(evt)
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

        const makeTriggerStream = (spec: NonPlatformTriggerSpec): Effect.Effect<Stream.Stream<ProcessTrigger>, Error> =>
          Effect.gen(function* () {
            if (spec.kind === 'timer') {
              const interval = Duration.decodeUnknown(spec.timerId)
              if (Option.isNone(interval)) {
                const err = new Error(`[ProcessRuntime] invalid timerId (expected DurationInput): ${spec.timerId}`)
                ;(err as any).code = 'process::invalid_timer_id'
                ;(err as any).hint =
                  "timerId must be a valid DurationInput string, e.g. '10 millis', '1 seconds', '5 minutes'."
                return yield* Effect.fail(err)
              }

              return Stream.tick(interval.value).pipe(
                Stream.map(
                  () =>
                    ({
                      kind: 'timer',
                      name: spec.name,
                      timerId: spec.timerId,
                    }) satisfies ProcessTrigger,
                ),
              )
            }

            if (spec.kind === 'moduleAction') {
              const tag = Context.Tag(`@logix/Module/${spec.moduleId}`)() as Context.Tag<any, any>
              const found = Context.getOption(baseEnv, tag)
              if (Option.isNone(found)) {
                return yield* Effect.fail(new Error(`Missing module runtime in scope: ${spec.moduleId}`))
              }

              const runtime = found.value as any

              // perf: when diagnostics=off, avoid subscribing to actionsWithMeta$ (published inside txns; more subscribers hurt hot paths).
              // diagnostics=light/full needs txnSeq/txnId anchors, so only use actionsWithMeta$ when chain events are enabled.
              if (!shouldRecordChainEvents) {
                const stream = runtime.actions$ as Stream.Stream<any> | undefined
                if (!stream) {
                  const err = new Error('ModuleRuntime does not provide actions$ (required for moduleAction trigger).')
                  ;(err as any).code = 'process::missing_action_stream'
                  ;(err as any).hint = `moduleId=${spec.moduleId}`
                  return yield* Effect.fail(err)
                }

                return stream.pipe(
                  Stream.filter((action: any) => actionIdFromUnknown(action) === spec.actionId),
                  Stream.map(
                    () =>
                      ({
                        kind: 'moduleAction',
                        name: spec.name,
                        moduleId: spec.moduleId,
                        instanceId: runtime.instanceId as string,
                        actionId: spec.actionId,
                        txnSeq: 1,
                      }) satisfies ProcessTrigger,
                  ),
                )
              }

              const stream = runtime.actionsWithMeta$ as Stream.Stream<any> | undefined
              if (!stream) {
                const err = new Error(
                  'ModuleRuntime does not provide actionsWithMeta$ (required for moduleAction trigger).',
                )
                ;(err as any).code = 'process::missing_action_meta_stream'
                ;(err as any).hint = `moduleId=${spec.moduleId}`
                return yield* Effect.fail(err)
              }

              return stream.pipe(
                Stream.filter((evt: any) => actionIdFromUnknown(evt.value) === spec.actionId),
                Stream.map((evt: any) => {
                  const txnSeq = evt?.meta?.txnSeq
                  return {
                    kind: 'moduleAction',
                    name: spec.name,
                    moduleId: spec.moduleId,
                    instanceId: runtime.instanceId as string,
                    actionId: spec.actionId,
                    txnSeq: typeof txnSeq === 'number' ? txnSeq : 1,
                  } satisfies ProcessTrigger
                }),
              )
            }

            // moduleStateChange
            const tag = Context.Tag(`@logix/Module/${spec.moduleId}`)() as Context.Tag<any, any>
            const found = Context.getOption(baseEnv, tag)
            if (Option.isNone(found)) {
              return yield* Effect.fail(new Error(`Missing module runtime in scope: ${spec.moduleId}`))
            }

            const runtime = found.value as any
            const schemaAst = resolveRuntimeStateSchemaAst(runtime)
            const selectorResult = makeSchemaSelector(spec.path, schemaAst)
            if (!selectorResult.ok) {
              return yield* Effect.fail(withModuleHint(selectorResult.error, spec.moduleId))
            }
            const selectorBase = selectorResult.selector
            const prevRef = yield* Ref.make<Option.Option<unknown>>(Option.none())

            const enableSelectorDiagnostics = shouldRecordChainEvents

            const selectorDiagnosticsRef = enableSelectorDiagnostics
              ? yield* Ref.make({
                  windowStartedMs: Date.now(),
                  triggersInWindow: 0,
                  lastWarningAtMs: 0,
                })
              : undefined

            const sampleEveryMask = 0x7f // sample every 128 calls
            const slowSampleThresholdMs = 4
            const triggerWindowMs = 1000
            const triggerWarningThreshold = isDevEnv() ? 20 : 200
            const warningCooldownMs = 30_000

            let selectorCalls = 0
            let selectorSamples = 0
            let selectorSlowSamples = 0
            let selectorMaxSampleMs = 0

            const nowMs = (): number => {
              if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
                return performance.now()
              }
              return Date.now()
            }

            const selector = enableSelectorDiagnostics
              ? (state: unknown): unknown => {
                  selectorCalls += 1
                  if ((selectorCalls & sampleEveryMask) !== 0) {
                    return selectorBase(state)
                  }

                  const t0 = nowMs()
                  const value = selectorBase(state)
                  const dt = nowMs() - t0

                  selectorSamples += 1
                  if (dt >= slowSampleThresholdMs) {
                    selectorSlowSamples += 1
                  }
                  if (dt > selectorMaxSampleMs) {
                    selectorMaxSampleMs = dt
                  }

                  return value
                }
              : selectorBase

            const maybeWarnSelector = (trigger: ProcessTrigger): Effect.Effect<void> => {
              if (!selectorDiagnosticsRef) {
                return Effect.void
              }

              return Effect.gen(function* () {
                const now = Date.now()

                const decision = yield* Ref.modify(selectorDiagnosticsRef, (s) => {
                  const windowExpired = now - s.windowStartedMs >= triggerWindowMs
                  const windowStartedMs = windowExpired ? now : s.windowStartedMs
                  const triggersInWindow = windowExpired ? 1 : s.triggersInWindow + 1

                  const shouldCooldown = now - s.lastWarningAtMs < warningCooldownMs
                  const tooFrequent = triggersInWindow >= triggerWarningThreshold
                  const tooSlow = selectorMaxSampleMs >= slowSampleThresholdMs && selectorSamples > 0
                  const shouldWarn = !shouldCooldown && (tooFrequent || tooSlow)

                  const next = shouldWarn
                    ? {
                        windowStartedMs: now,
                        triggersInWindow: 0,
                        lastWarningAtMs: now,
                      }
                    : {
                        ...s,
                        windowStartedMs,
                        triggersInWindow,
                      }

                  return [
                    {
                      shouldWarn,
                      tooFrequent,
                      tooSlow,
                      triggersInWindow,
                    },
                    next,
                  ] as const
                })

                if (!decision.shouldWarn) {
                  return
                }

                const code = decision.tooFrequent ? 'process::selector_high_frequency' : 'process::selector_slow'

                const hint = [
                  `moduleId=${spec.moduleId}`,
                  `path=${spec.path}`,
                  `windowMs=${triggerWindowMs}`,
                  `triggersInWindow=${decision.triggersInWindow}`,
                  `threshold=${triggerWarningThreshold}`,
                  `cooldownMs=${warningCooldownMs}`,
                  '',
                  'selector sampling:',
                  `calls=${selectorCalls}`,
                  `sampled=${selectorSamples}`,
                  `slowSamples(>=${slowSampleThresholdMs}ms)=${selectorSlowSamples}`,
                  `maxSampleMs=${selectorMaxSampleMs.toFixed(2)}`,
                  '',
                  'notes:',
                  '- Ensure the selected value is stable (prefer primitive/tuple; avoid returning fresh objects).',
                  '- Narrow the path to reduce change frequency; avoid selecting large objects.',
                ].join('\n')

                selectorSamples = 0
                selectorSlowSamples = 0
                selectorMaxSampleMs = 0

                yield* emit({
                  type: 'process:trigger',
                  identity,
                  trigger,
                  severity: 'warning',
                  eventSeq: instanceState.nextEventSeq++,
                  timestampMs: Date.now(),
                  error: {
                    message: 'moduleStateChange selector diagnostics warning',
                    code,
                    hint,
                  },
                } satisfies ProcessEvent)
              })
            }

            const baseStream = (runtime.changesWithMeta(selector) as Stream.Stream<any>).pipe(
              Stream.mapEffect((evt: any) =>
                Ref.get(prevRef).pipe(
                  Effect.flatMap((prev) => {
                    if (Option.isSome(prev) && Object.is(prev.value, evt.value)) {
                      return Effect.succeed(Option.none())
                    }
                    return Ref.set(prevRef, Option.some(evt.value)).pipe(Effect.as(Option.some(evt)))
                  }),
                ),
              ),
              Stream.filterMap((opt) => opt),
              Stream.map((evt: any) => {
                const txnSeq = evt?.meta?.txnSeq
                return {
                  kind: 'moduleStateChange',
                  name: spec.name,
                  moduleId: spec.moduleId,
                  instanceId: runtime.instanceId as string,
                  path: spec.path,
                  txnSeq: typeof txnSeq === 'number' ? txnSeq : 1,
                } satisfies ProcessTrigger
              }),
            )

            return enableSelectorDiagnostics ? baseStream.pipe(Stream.tap(maybeWarnSelector)) : baseStream
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

        const makeChainRun = (
          trigger: ProcessTrigger,
          fatal: Deferred.Deferred<Cause.Cause<any>>,
        ): Effect.Effect<void> => {
          if (!shouldRecordChainEvents) {
            return makeRun(trigger, fatal)
          }

          return Effect.gen(function* () {
            const budgetRef = yield* Ref.make(ProcessEvents.makeProcessRunEventBudgetState())
            return yield* Effect.locally(
              currentProcessEventBudget,
              budgetRef,
            )(emitTriggerEvent(trigger, 'info').pipe(Effect.zipRight(makeRun(trigger, fatal))))
          })
        }

        const assignTriggerSeq = (trigger: ProcessTrigger): ProcessTrigger => {
          if (!shouldRecordChainEvents) {
            return trigger
          }

          return {
            ...trigger,
            triggerSeq: instanceState.nextTriggerSeq++,
          }
        }

        const emitTriggerEvent = (trigger: ProcessTrigger, severity: ProcessEvent['severity']): Effect.Effect<void> => {
          if (!shouldRecordChainEvents) {
            return Effect.void
          }

          const evt: ProcessEvent = {
            type: 'process:trigger',
            identity,
            trigger,
            severity,
            eventSeq: instanceState.nextEventSeq++,
            timestampMs: Date.now(),
          }
          return emit(evt)
        }

        const policy = installation.definition.concurrency
        const autoStart = installation.definition.triggers.some(
          (t) => t.kind === 'platformEvent' && t.platformEvent === RUNTIME_BOOT_EVENT,
        )
        const bootTriggerSpec = installation.definition.triggers.find(
          (t): t is Extract<ProcessTriggerSpec, { readonly kind: 'platformEvent' }> =>
            t.kind === 'platformEvent' && t.platformEvent === RUNTIME_BOOT_EVENT,
        )

        const instanceProgram = Effect.gen(function* () {
          const fatal = yield* Deferred.make<Cause.Cause<any>>()

          const platformEventStream: Stream.Stream<ProcessTrigger> = Stream.fromQueue(
            instanceState.platformTriggersQueue,
          )

          const nonPlatformTriggers = installation.definition.triggers.filter(
            (t): t is NonPlatformTriggerSpec => t.kind !== 'platformEvent',
          )

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
              assignTriggerSeq,
              run: (trigger) => makeChainRun(trigger, fatal),
              onDrop: (trigger) => emitTriggerEvent(trigger, 'warning'),
              onQueueOverflow: reportQueueOverflow,
            }),
          )

          if (autoStart) {
            yield* Queue.offer(instanceState.platformTriggersQueue, {
              kind: 'platformEvent',
              name: bootTriggerSpec?.name,
              platformEvent: RUNTIME_BOOT_EVENT,
            })
          }

          const cause = yield* Deferred.await(fatal)
          yield* Fiber.interrupt(runnerFiber)
          return yield* Effect.failCause(cause)
        })

        const fiber = yield* Effect.forkIn(installation.forkScope)(
          Effect.scoped(instanceProgram).pipe(
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
        )

        instanceState.fiber = fiber as Fiber.RuntimeFiber<unknown, unknown>
        instanceState.status = {
          ...instanceState.status,
          status: 'running',
        }

        // Best-effort: ensure the instance fiber starts subscribing to trigger streams before install/start returns,
        // avoiding lost moduleAction/moduleStateChange triggers right after env is built and dispatch happens.
        yield* Effect.yieldNow()
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
        const existing = installations.get(installationKey)
        if (existing) {
          existing.env = env as Context.Context<any>
          existing.forkScope = forkScope
          existing.enabled = options.enabled ?? true
          existing.installedAt = options.installedAt ?? existing.installedAt
          if (!existing.enabled) {
            existing.pendingStart = undefined
            return {
              identity,
              enabled: existing.enabled,
              installedAt: existing.installedAt,
            } satisfies ProcessInstallation
          }

          const currentId = existing.currentInstanceId
          const current = currentId ? instances.get(currentId) : undefined
          const status = current?.status.status

          if (status === 'running' || status === 'starting') {
            const mode: ProcessInstallMode = options.mode ?? 'switch'
            if (mode === 'switch' && current && current.forkScope !== forkScope) {
              existing.pendingStart = { forkScope }
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
              existing.pendingStart = undefined
            }
            return {
              identity,
              enabled: existing.enabled,
              installedAt: existing.installedAt,
            } satisfies ProcessInstallation
          }

          if (status === 'stopping') {
            const mode: ProcessInstallMode = options.mode ?? 'switch'
            if (mode === 'switch') {
              existing.pendingStart = { forkScope }
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
              existing.pendingStart = undefined
            }
            return {
              identity,
              enabled: existing.enabled,
              installedAt: existing.installedAt,
            } satisfies ProcessInstallation
          }

          existing.pendingStart = undefined
          yield* startInstallation(installationKey)
          return {
            identity,
            enabled: existing.enabled,
            installedAt: existing.installedAt,
          } satisfies ProcessInstallation
        }

        // Derive an effect for this installation to avoid overwriting meta on the original Effect (reused across scopes).
        // Note: do not provide env eagerly; we may need to layer additional context per-trigger execution (e.g. dispatch chain diagnostics).
        const derived = Effect.suspend(() => process)
        Meta.attachMeta(derived, {
          ...meta,
          installationScope: options.scope,
        })

        const installation: InstallationState = {
          identity,
          scopeKey,
          definition: meta.definition,
          env: env as Context.Context<any>,
          forkScope,
          process: derived as unknown as Effect.Effect<void, any, unknown>,
          kind: meta.kind ?? 'process',
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

        const targets = Array.from(instances.values())
        const eventName = event.eventName

        yield* Effect.forEach(
          targets,
          (instance) =>
            Effect.suspend(() => {
              if (instance.status.status !== 'starting' && instance.status.status !== 'running') {
                return Effect.void
              }

              const installation = installations.get(instance.installationKey)
              if (!installation) {
                return Effect.void
              }

              const specs = installation.definition.triggers.filter(
                (t): t is Extract<ProcessTriggerSpec, { readonly kind: 'platformEvent' }> =>
                  t.kind === 'platformEvent' && t.platformEvent === eventName,
              )
              if (specs.length === 0) {
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

    const getEventsSnapshot: ProcessRuntime['getEventsSnapshot'] = () => Effect.sync(() => eventsBuffer.slice())

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
