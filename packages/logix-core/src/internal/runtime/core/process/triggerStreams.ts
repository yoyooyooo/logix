import { Context, Duration, Effect, Option, Ref, Stream } from 'effect'
import { isDevEnv } from '../env.js'
import * as ReadQuery from '../ReadQuery.js'
import { makeSchemaSelector } from './selectorSchema.js'
import {
  buildSelectorWarningHint,
  evaluateSelectorWarning,
  initialSelectorDiagnosticsState,
  makeSelectorDiagnosticsConfig,
  makeSelectorSamplingTracker,
} from './selectorDiagnostics.js'
import type { ProcessTrigger, ProcessTriggerSpec, SerializableErrorSummary } from './protocol.js'

export type NonPlatformTriggerSpec = Exclude<ProcessTriggerSpec, { readonly kind: 'platformEvent' }>
type TimerTriggerSpec = Extract<NonPlatformTriggerSpec, { readonly kind: 'timer' }>
type ModuleActionTriggerSpec = Extract<NonPlatformTriggerSpec, { readonly kind: 'moduleAction' }>
type ModuleStateChangeTriggerSpec = Extract<NonPlatformTriggerSpec, { readonly kind: 'moduleStateChange' }>
type SchemaAstLike = Parameters<typeof makeSchemaSelector>[1]
type CachedSchemaAstEntry = { readonly ast: SchemaAstLike }

type TriggerStreamFactoryOptions = {
  readonly baseEnv: Context.Context<any>
  readonly shouldRecordChainEvents: boolean
  readonly actionIdFromUnknown: (action: unknown) => string | undefined
  readonly resolveRuntimeStateSchemaAst: (runtime: unknown) => SchemaAstLike
  readonly withModuleHint: (error: Error, moduleId: string) => Error
  readonly emitSelectorWarning: (trigger: ProcessTrigger, warning: SerializableErrorSummary) => Effect.Effect<void>
}

const makeInvalidTriggerKindError = (spec: never): Error =>
  Object.assign(
    new Error(`[ProcessRuntime] unreachable non-platform trigger kind: ${String((spec as any)?.kind ?? 'unknown')}`),
    { code: 'process::invalid_trigger_kind' },
  )

const makeInvalidTimerIdError = (timerId: string): Error => {
  const err = new Error(`[ProcessRuntime] invalid timerId (expected DurationInput): ${timerId}`)
  ;(err as any).code = 'process::invalid_timer_id'
  ;(err as any).hint =
    "timerId must be a valid DurationInput string, e.g. '10 millis', '1 seconds', '5 minutes'."
  return err
}

const makeMissingActionStreamError = (moduleId: string): Error => {
  const err = new Error('ModuleRuntime does not provide actions$ (required for moduleAction trigger).')
  ;(err as any).code = 'process::missing_action_stream'
  ;(err as any).hint = `moduleId=${moduleId}`
  return err
}

const makeMissingActionMetaStreamError = (moduleId: string): Error => {
  const err = new Error('ModuleRuntime does not provide actionsWithMeta$ (required for moduleAction trigger).')
  ;(err as any).code = 'process::missing_action_meta_stream'
  ;(err as any).hint = `moduleId=${moduleId}`
  return err
}

const makeMissingChangesStreamError = (moduleId: string): Error => {
  const err = new Error('ModuleRuntime does not provide changesWithMeta (required for moduleStateChange trigger).')
  ;(err as any).code = 'process::missing_changes_stream'
  ;(err as any).hint = `moduleId=${moduleId}`
  return err
}

const nowMs = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

const isWeakMapKey = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const makeModuleStateChangeReadQuery = (args: {
  readonly moduleId: string
  readonly path: string
  readonly selector: (state: unknown) => unknown
}): ReadQuery.ReadQuery<unknown, unknown> =>
  ReadQuery.make({
    selectorId: `process:moduleStateChange:${args.moduleId}:${args.path}`,
    debugKey: `process.moduleStateChange:${args.moduleId}.${args.path}`,
    reads: [args.path],
    select: args.selector,
    equalsKind: 'objectIs',
  })

const dedupeConsecutiveByValue = <T extends { readonly value: unknown }>(
  prevRef: Ref.Ref<Option.Option<unknown>>,
  event: T,
): Effect.Effect<Option.Option<T>> =>
  Ref.modify(prevRef, (prev) => {
    if (Option.isSome(prev) && Object.is(prev.value, event.value)) {
      return [Option.none(), prev] as const
    }
    return [Option.some(event), Option.some(event.value)] as const
  })

export const makeNonPlatformTriggerStreamFactory = (options: TriggerStreamFactoryOptions) => {
  const moduleRuntimeTagCache = new Map<string, Context.Tag<any, any>>()
  const moduleRuntimeCache = new Map<string, any>()
  const runtimeSchemaAstCache = new WeakMap<object, CachedSchemaAstEntry>()

  const resolveModuleRuntimeTag = (moduleId: string): Context.Tag<any, any> => {
    const cached = moduleRuntimeTagCache.get(moduleId)
    if (cached) {
      return cached
    }
    const created = Context.Tag(`@logixjs/Module/${moduleId}`)() as Context.Tag<any, any>
    moduleRuntimeTagCache.set(moduleId, created)
    return created
  }

  const resolveModuleRuntime = (moduleId: string): Effect.Effect<any, Error> =>
    Effect.gen(function* () {
      if (moduleRuntimeCache.has(moduleId)) {
        return moduleRuntimeCache.get(moduleId)
      }

      const tag = resolveModuleRuntimeTag(moduleId)
      const found = Context.getOption(options.baseEnv, tag)
      if (Option.isNone(found)) {
        return yield* Effect.fail(new Error(`Missing module runtime in scope: ${moduleId}`))
      }

      const runtime = found.value as any
      moduleRuntimeCache.set(moduleId, runtime)
      return runtime
    })

  const resolveRuntimeStateSchemaAst = (runtime: unknown): SchemaAstLike => {
    if (!isWeakMapKey(runtime)) {
      return options.resolveRuntimeStateSchemaAst(runtime)
    }

    const cached = runtimeSchemaAstCache.get(runtime)
    if (cached) {
      return cached.ast
    }

    const ast = options.resolveRuntimeStateSchemaAst(runtime)
    runtimeSchemaAstCache.set(runtime, { ast })
    return ast
  }

  const makeTimerTriggerStream = (spec: TimerTriggerSpec): Effect.Effect<Stream.Stream<ProcessTrigger>, Error> =>
    Effect.gen(function* () {
      const interval = Duration.decodeUnknown(spec.timerId)
      if (Option.isNone(interval)) {
        return yield* Effect.fail(makeInvalidTimerIdError(spec.timerId))
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
    })

  const makeModuleActionTriggerStream = (
    spec: ModuleActionTriggerSpec,
  ): Effect.Effect<Stream.Stream<ProcessTrigger>, Error> =>
    Effect.gen(function* () {
      const runtime = yield* resolveModuleRuntime(spec.moduleId)
      const buildModuleActionTrigger = (txnSeq: number): ProcessTrigger => ({
        kind: 'moduleAction',
        name: spec.name,
        moduleId: spec.moduleId,
        instanceId: runtime.instanceId as string,
        actionId: spec.actionId,
        txnSeq,
      })

      if (!options.shouldRecordChainEvents) {
        const stream = runtime.actions$ as Stream.Stream<any> | undefined
        if (!stream) {
          return yield* Effect.fail(makeMissingActionStreamError(spec.moduleId))
        }

        return stream.pipe(
          Stream.filter((action: any) => options.actionIdFromUnknown(action) === spec.actionId),
          Stream.map(() => buildModuleActionTrigger(1)),
        )
      }

      const stream = runtime.actionsWithMeta$ as Stream.Stream<any> | undefined
      if (!stream) {
        return yield* Effect.fail(makeMissingActionMetaStreamError(spec.moduleId))
      }

      return stream.pipe(
        Stream.filter((evt: any) => options.actionIdFromUnknown(evt.value) === spec.actionId),
        Stream.map((evt: any) => {
          const txnSeq = evt?.meta?.txnSeq
          return buildModuleActionTrigger(typeof txnSeq === 'number' ? txnSeq : 1)
        }),
      )
    })

  const makeModuleStateChangeTriggerStream = (
    spec: ModuleStateChangeTriggerSpec,
  ): Effect.Effect<Stream.Stream<ProcessTrigger>, Error> =>
    Effect.gen(function* () {
      const runtime = yield* resolveModuleRuntime(spec.moduleId)
      const schemaAst = resolveRuntimeStateSchemaAst(runtime)
      const selectorResult = makeSchemaSelector(spec.path, schemaAst)
      if (!selectorResult.ok) {
        return yield* Effect.fail(options.withModuleHint(selectorResult.error, spec.moduleId))
      }

      const selectorBase = selectorResult.selector
      const buildModuleStateChangeTrigger = (txnSeq: unknown): ProcessTrigger => ({
        kind: 'moduleStateChange',
        name: spec.name,
        moduleId: spec.moduleId,
        instanceId: runtime.instanceId as string,
        path: spec.path,
        txnSeq: typeof txnSeq === 'number' ? txnSeq : 1,
      })

      const buildModuleStateChangeBaseStream = (
        selector: (state: unknown) => unknown,
      ): Effect.Effect<Stream.Stream<ProcessTrigger>, Error> =>
        Effect.gen(function* () {
          const readQuery = makeModuleStateChangeReadQuery({
            moduleId: spec.moduleId,
            path: spec.path,
            selector,
          })
          const changesReadQueryWithMeta = runtime.changesReadQueryWithMeta as
            | ((input: ReadQuery.ReadQueryInput<unknown, unknown>) => Stream.Stream<any>)
            | undefined

          if (typeof changesReadQueryWithMeta === 'function') {
            return changesReadQueryWithMeta(readQuery).pipe(
              Stream.map((evt: any) => buildModuleStateChangeTrigger(evt?.meta?.txnSeq)),
            )
          }

          const changesWithMeta = runtime.changesWithMeta as ((selector: (state: unknown) => unknown) => Stream.Stream<any>) | undefined
          if (typeof changesWithMeta !== 'function') {
            return yield* Effect.fail(makeMissingChangesStreamError(spec.moduleId))
          }

          const prevRef = yield* Ref.make<Option.Option<unknown>>(Option.none())
          return changesWithMeta(selector).pipe(
            Stream.mapEffect((evt: any) => dedupeConsecutiveByValue(prevRef, evt)),
            Stream.filterMap((opt) => opt),
            Stream.map((evt: any) => buildModuleStateChangeTrigger(evt?.meta?.txnSeq)),
          )
        })

      if (!options.shouldRecordChainEvents) {
        return yield* buildModuleStateChangeBaseStream(selectorBase)
      }

      const selectorDiagnosticsConfig = makeSelectorDiagnosticsConfig(isDevEnv())
      const selectorDiagnosticsRef = yield* Ref.make(initialSelectorDiagnosticsState(Date.now()))
      const selectorSampling = makeSelectorSamplingTracker(selectorDiagnosticsConfig)

      const selector = (state: unknown): unknown => {
        if (!selectorSampling.onSelectorCall()) {
          return selectorBase(state)
        }

        const t0 = nowMs()
        const value = selectorBase(state)
        const dt = nowMs() - t0

        selectorSampling.recordSample(dt)
        return value
      }

      const maybeWarnSelector = (trigger: ProcessTrigger): Effect.Effect<void> => {
        return Effect.gen(function* () {
          const now = Date.now()
          const sampling = selectorSampling.snapshot()

          const decision = yield* Ref.modify(selectorDiagnosticsRef, (state) =>
            evaluateSelectorWarning(state, now, {
              config: selectorDiagnosticsConfig,
              sampling: {
                sampled: sampling.sampled,
                maxSampleMs: sampling.maxSampleMs,
              },
            }),
          )

          if (!decision.shouldWarn) {
            return
          }

          const code = decision.tooFrequent ? 'process::selector_high_frequency' : 'process::selector_slow'
          const hint = buildSelectorWarningHint({
            moduleId: spec.moduleId,
            path: spec.path,
            decision,
            config: selectorDiagnosticsConfig,
            sampling,
          })
          selectorSampling.resetSampling()

          yield* options.emitSelectorWarning(trigger, {
            message: 'moduleStateChange selector diagnostics warning',
            code,
            hint,
          })
        })
      }

      const baseStream = yield* buildModuleStateChangeBaseStream(selector)

      return baseStream.pipe(Stream.tap(maybeWarnSelector))
    })

  return (spec: NonPlatformTriggerSpec): Effect.Effect<Stream.Stream<ProcessTrigger>, Error> =>
    Effect.gen(function* () {
      switch (spec.kind) {
        case 'timer':
          return yield* makeTimerTriggerStream(spec)
        case 'moduleAction':
          return yield* makeModuleActionTriggerStream(spec)
        case 'moduleStateChange':
          return yield* makeModuleStateChangeTriggerStream(spec)
        default:
          return yield* Effect.fail(makeInvalidTriggerKindError(spec))
      }
    })
}
