import { Cause, Context, Deferred, Effect, Option } from 'effect'
import type { LogicPlan, ModuleRuntime as PublicModuleRuntime } from './module.js'
import * as Lifecycle from './Lifecycle.js'
import * as ReducerDiagnostics from './ReducerDiagnostics.js'
import * as LifecycleDiagnostics from './LifecycleDiagnostics.js'
import * as LogicDiagnostics from './LogicDiagnostics.js'
import * as LogicUnitMeta from './LogicUnitMeta.js'
import * as Platform from './Platform.js'
import * as LogicPlanMarker from './LogicPlanMarker.js'
import { RootContextTag, type RootContext } from './RootContext.js'

type PhaseRef = LogicPlanMarker.PhaseRef

const createPhaseRef = (): PhaseRef => ({ current: 'run' })

export const runModuleLogics = <S, A, R>(args: {
  readonly tag: Context.Tag<any, PublicModuleRuntime<S, A>>
  readonly logics: ReadonlyArray<Effect.Effect<any, any, R> | LogicPlan<any, R, any>>
  readonly runtime: PublicModuleRuntime<S, A>
  readonly lifecycle: Lifecycle.LifecycleManager
  readonly moduleId: string
  readonly instanceId: string
}): Effect.Effect<void, unknown, any> => {
  const { tag, logics, runtime, lifecycle, moduleId, instanceId } = args
  const moduleIdForLogs = moduleId

  return Effect.gen(function* () {
    const withRuntimeAndLifecycle = <R2, E2, A2>(
      eff: Effect.Effect<A2, E2, R2>,
      phaseRef?: PhaseRef,
      logicUnit?: LogicDiagnostics.LogicUnitService,
    ) => {
      const withServices = Effect.provideService(
        Effect.provideService(eff, Lifecycle.LifecycleContext, lifecycle),
        tag,
        runtime,
      )

      // Annotate logs produced inside Logic effects (moduleId, etc.) so the Logger layer can correlate them to a Module.
      const annotated = Effect.annotateLogs({
        'logix.moduleId': moduleIdForLogs,
      })(withServices as Effect.Effect<A2, E2, any>) as Effect.Effect<A2, E2, R2>

      const withLogicUnit = logicUnit
        ? Effect.provideService(annotated, LogicDiagnostics.LogicUnitServiceTag, logicUnit)
        : annotated

      if (!phaseRef) {
        return withLogicUnit
      }

      const phaseService: LogicDiagnostics.LogicPhaseService = {
        get current() {
          return phaseRef.current
        },
      }

      return Effect.provideService(withLogicUnit, LogicDiagnostics.LogicPhaseServiceTag, phaseService)
    }

    const withRootEnvIfAvailable = <A2, E2, R2>(eff: Effect.Effect<A2, E2, R2>): Effect.Effect<A2, E2, R2> =>
      Effect.gen(function* () {
        const rootOpt = yield* Effect.serviceOption(RootContextTag)
        if (Option.isNone(rootOpt)) {
          return yield* eff
        }
        const root = rootOpt.value as RootContext
        const rootEnv = root.context ?? (yield* Deferred.await(root.ready))

        // IMPORTANT:
        // - rootEnv contains the fully-assembled app Env (all modules/services), preventing "missing service due to early Env capture".
        // - currentEnv contains Provider overlays (e.g. React RuntimeProvider.layer / useRuntime layers) and module-local overrides.
        // Merge order: currentEnv overrides rootEnv for overlapping tags.
        const currentEnv = (yield* Effect.context<R2>()) as Context.Context<any>
        const mergedEnv = Context.merge(rootEnv as Context.Context<any>, currentEnv)

        return yield* Effect.provide(eff as any, mergedEnv as any)
      }) as any

    const formatSource = (source?: {
      readonly file: string
      readonly line: number
      readonly column: number
    }): string | undefined => (source ? `${source.file}:${source.line}:${source.column}` : undefined)

    const resolveLogicUnitService = (rawLogic: unknown, index: number): LogicDiagnostics.LogicUnitService => {
      const meta = LogicUnitMeta.getLogicUnitMeta(rawLogic)

      const logicUnitId = meta?.resolvedId ?? meta?.id ?? `logic#${index + 1}`

      const logicUnitIdKind = meta?.resolvedIdKind ?? (meta?.id ? 'explicit' : 'derived')

      const labelBase = meta?.resolvedName ?? meta?.name ?? logicUnitId

      const kind = meta?.resolvedKind ?? meta?.kind
      const kindPrefix = kind && kind.length > 0 ? `${kind}:` : ''

      const source = meta?.resolvedSource ?? meta?.source

      return {
        logicUnitId,
        logicUnitIdKind,
        logicUnitLabel: `logicUnit:${kindPrefix}${labelBase}`,
        path: formatSource(source),
      }
    }

    const handleLogicFailure = (cause: any) => {
      if (Cause.isInterrupted(cause)) {
        return Effect.failCause(cause)
      }

      const phaseErrorMarker = [...Cause.failures(cause), ...Cause.defects(cause)].some(
        (err) => (err as any)?._tag === 'LogicPhaseError',
      )

      const base = lifecycle
        .notifyError(cause, {
          phase: 'run',
          hook: 'unknown',
          moduleId,
          instanceId,
          origin: 'logic.fork',
        })
        .pipe(
          Effect.tap(() => LifecycleDiagnostics.emitMissingOnErrorDiagnosticIfNeeded(lifecycle, moduleId)),
          Effect.tap(() => LifecycleDiagnostics.emitAssemblyFailureDiagnosticIfNeeded(cause, moduleId)),
          Effect.tap(() => ReducerDiagnostics.emitDiagnosticsFromCause(cause, moduleId)),
          Effect.tap(() => LogicDiagnostics.emitEnvServiceNotFoundDiagnosticIfNeeded(cause, moduleId)),
          Effect.tap(() => LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded(cause, moduleId)),
      )

      // For LogicPhaseError: emit diagnostics only and avoid failing ModuleRuntime construction,
      // so runSync paths are not interrupted by AsyncFiberException.
      if (phaseErrorMarker) {
        return base
      }

      return base.pipe(Effect.flatMap(() => Effect.failCause(cause)))
    }

    const handleInitFailure = (cause: Cause.Cause<unknown>) =>
      Cause.isInterrupted(cause)
        ? Effect.failCause(cause)
        : Effect.void.pipe(
            Effect.tap(() => LifecycleDiagnostics.emitMissingOnErrorDiagnosticIfNeeded(lifecycle, moduleId)),
            Effect.tap(() => LifecycleDiagnostics.emitAssemblyFailureDiagnosticIfNeeded(cause, moduleId)),
            Effect.tap(() => ReducerDiagnostics.emitDiagnosticsFromCause(cause, moduleId)),
            Effect.tap(() => LogicDiagnostics.emitEnvServiceNotFoundDiagnosticIfNeeded(cause, moduleId)),
            Effect.tap(() => LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded(cause, moduleId)),
            Effect.zipRight(Effect.failCause(cause)),
          )

    const isLogicPlan = (value: unknown): value is LogicPlan<any, any, any> =>
      Boolean(value && typeof value === 'object' && 'run' in (value as any) && 'setup' in (value as any))

    const hasLogicPhaseError = (cause: Cause.Cause<unknown>): boolean =>
      [...Cause.failures(cause), ...Cause.defects(cause)].some((err) => (err as any)?._tag === 'LogicPhaseError')

    const normalizeToPlan = (value: unknown, defaultPhaseRef?: PhaseRef): LogicPlan<any, any, any> => {
      const phaseRef = LogicPlanMarker.getPhaseRef(value) ?? defaultPhaseRef ?? createPhaseRef()

      if (isLogicPlan(value)) {
        const plan = value as LogicPlan<any, any, any>
        if (!LogicPlanMarker.getPhaseRef(plan)) {
          LogicPlanMarker.attachPhaseRef(plan as any, phaseRef)
        }
        return plan
      }

      const plan: LogicPlan<any, any, any> = {
        setup: Effect.void,
        run: value as Effect.Effect<any, any, any>,
      }
      LogicPlanMarker.attachPhaseRef(plan as any, phaseRef)
      return plan
    }

    const makeNoopPlan = (phaseRef: PhaseRef): LogicPlan<any, any, any> => {
      const plan: LogicPlan<any, any, any> = {
        setup: Effect.void,
        run: Effect.void,
      }
      LogicPlanMarker.attachPhaseRef(plan as any, phaseRef)
      LogicPlanMarker.markSkipRun(plan as any)
      return plan
    }

    const executeResolvedPlanImmediately = (
      plan: LogicPlan<any, any, any>,
      logicUnit: LogicDiagnostics.LogicUnitService,
      defaultPhaseRef?: PhaseRef,
    ): Effect.Effect<void, unknown, any> => {
      const hadPhaseRef = Boolean(LogicPlanMarker.getPhaseRef(plan))
      const phaseRef = LogicPlanMarker.getPhaseRef(plan) ?? defaultPhaseRef ?? createPhaseRef()
      if (!hadPhaseRef) {
        LogicPlanMarker.attachPhaseRef(plan as any, phaseRef)
      }

      const setupPhase = withRuntimeAndLifecycle(plan.setup, phaseRef, logicUnit)
      const runPhase = withRootEnvIfAvailable(withRuntimeAndLifecycle(plan.run, phaseRef, logicUnit))

      phaseRef.current = 'setup'
      return setupPhase.pipe(
        Effect.catchAllCause(handleLogicFailure),
        Effect.zipRight(
          LogicPlanMarker.isSkipRun(plan)
            ? Effect.void
            : Effect.sync(() => {
                phaseRef.current = 'run'
              }).pipe(
                Effect.zipRight(Effect.forkScoped(runPhase.pipe(Effect.catchAllCause(handleLogicFailure)))),
                Effect.asVoid,
              ),
        ),
      )
    }

    const resolveLogicPlanEffectToPlan = (
      value: unknown,
      logicUnit: LogicDiagnostics.LogicUnitService,
      phaseRef: PhaseRef,
      depth: number,
    ): Effect.Effect<LogicPlan<any, any, any>, unknown, any> => {
      if (!LogicPlanMarker.isLogicPlanEffect(value)) {
        return Effect.succeed(normalizeToPlan(value, phaseRef))
      }

      if (depth > 8) {
        return Effect.fail(new Error('Too many nested LogicPlanEffect resolutions (possible cyclic logic return).'))
      }

      // Keep phase guard active while resolving nested LogicPlanEffect so setup/run boundaries remain enforced.
      return withRuntimeAndLifecycle(value as Effect.Effect<any, any, any>, phaseRef, logicUnit).pipe(
        Effect.matchCauseEffect({
          onSuccess: (next) => resolveLogicPlanEffectToPlan(next, logicUnit, phaseRef, depth + 1),
          onFailure: (cause) => {
            if (hasLogicPhaseError(cause)) {
              return handleLogicFailure(cause).pipe(Effect.as(makeNoopPlan(phaseRef)))
            }
            return handleLogicFailure(cause).pipe(Effect.zipRight(Effect.failCause(cause)))
          },
        }),
      )
    }

    const resolveCanonicalPlan = (
      rawLogic: Effect.Effect<any, any, R> | LogicPlan<any, R, any>,
      logicUnit: LogicDiagnostics.LogicUnitService,
    ): Effect.Effect<LogicPlan<any, any, any>, unknown, any> => {
      if (!LogicPlanMarker.isLogicPlanEffect(rawLogic)) {
        if (isLogicPlan(rawLogic)) {
          return Effect.succeed(normalizeToPlan(rawLogic))
        }

        const phaseRef = LogicPlanMarker.getPhaseRef(rawLogic) ?? createPhaseRef()
        const runEffect = rawLogic as Effect.Effect<any, any, any>

        // Canonical semantics keeps single-phase logic as run-only.
        // Compatibility: if run returns a marked LogicPlanEffect (async-built ModuleImpl pattern),
        // resolve and execute that nested plan immediately to preserve existing user behavior.
        const plan: LogicPlan<any, any, any> = {
          setup: Effect.void,
          run: runEffect.pipe(
            Effect.flatMap((value) =>
              !LogicPlanMarker.isLogicPlanEffect(value)
                ? Effect.void
                : resolveLogicPlanEffectToPlan(value, logicUnit, phaseRef, 0).pipe(
                    Effect.flatMap((resolvedPlan) => executeResolvedPlanImmediately(resolvedPlan, logicUnit, phaseRef)),
                  ),
            ),
          ),
        }
        LogicPlanMarker.attachPhaseRef(plan as any, phaseRef)
        return Effect.succeed(plan)
      }

      // LogicPlanEffect: run once in setup phase to resolve the canonical plan.
      const phaseRef = LogicPlanMarker.getPhaseRef(rawLogic) ?? createPhaseRef()
      phaseRef.current = 'setup'

      return withRuntimeAndLifecycle(rawLogic as Effect.Effect<any, any, any>, phaseRef, logicUnit).pipe(
        Effect.matchCauseEffect({
          onSuccess: (value) => resolveLogicPlanEffectToPlan(value, logicUnit, phaseRef, 0),
          onFailure: (cause) => {
            if (hasLogicPhaseError(cause)) {
              return handleLogicFailure(cause).pipe(Effect.as(makeNoopPlan(phaseRef)))
            }
            return handleLogicFailure(cause).pipe(Effect.zipRight(Effect.failCause(cause)))
          },
        }),
      )
    }

    const runCanonicalPlan = (
      plan: LogicPlan<any, any, any>,
      logicUnit: LogicDiagnostics.LogicUnitService,
    ): Effect.Effect<void, unknown, any> =>
      Effect.gen(function* () {
        const hadPhaseRef = Boolean(LogicPlanMarker.getPhaseRef(plan))
        const phaseRef = LogicPlanMarker.getPhaseRef(plan) ?? createPhaseRef()
        if (!hadPhaseRef) {
          LogicPlanMarker.attachPhaseRef(plan as any, phaseRef)
        }

        const setupPhase = withRuntimeAndLifecycle(plan.setup, phaseRef, logicUnit)
        const runPhase = withRootEnvIfAvailable(withRuntimeAndLifecycle(plan.run, phaseRef, logicUnit))

        phaseRef.current = 'setup'
        yield* setupPhase.pipe(Effect.catchAllCause(handleLogicFailure))

        if (LogicPlanMarker.isSkipRun(plan)) {
          return
        }

        pendingRunForks.push(
          Effect.sync(() => {
            phaseRef.current = 'run'
          }).pipe(
            Effect.zipRight(Effect.forkScoped(runPhase.pipe(Effect.catchAllCause(handleLogicFailure)))),
            Effect.asVoid,
          ),
        )
      })

    const pendingRunForks: Array<Effect.Effect<void, never, any>> = []

    let logicIndex = 0
    for (const rawLogic of logics) {
      const logicUnit = resolveLogicUnitService(rawLogic, logicIndex)
      logicIndex += 1

      const canonicalPlan = yield* resolveCanonicalPlan(rawLogic, logicUnit)
      yield* runCanonicalPlan(canonicalPlan, logicUnit)
    }

    // lifecycle initRequired: blocking gate (must complete before forking run fibers).
    yield* lifecycle.runInitRequired.pipe(Effect.catchAllCause(handleInitFailure))

    // platform signals: read Platform only after initRequired succeeds (avoid reading Env during setup).
    const platformOpt = yield* Effect.serviceOption(Platform.Tag)
    if (Option.isSome(platformOpt)) {
      const platform = platformOpt.value
      const snapshot = yield* lifecycle.getTaskSnapshot

      const platformPhaseRef: PhaseRef = { current: 'run' }
      const phaseService: LogicDiagnostics.LogicPhaseService = {
        get current() {
          return platformPhaseRef.current
        },
      }

      const providePlatformEnv = <A2, E2, R2>(eff: Effect.Effect<A2, E2, R2>): Effect.Effect<A2, E2, any> =>
        Effect.provideService(
          Effect.provideService(
            Effect.provideService(
              Effect.provideService(eff as Effect.Effect<A2, E2, any>, Platform.Tag, platform),
              Lifecycle.LifecycleContext,
              lifecycle,
            ),
            tag,
            runtime,
          ),
          LogicDiagnostics.LogicPhaseServiceTag,
          phaseService,
        )

      const register = (
        label: Lifecycle.Hook,
        subscribe: (eff: Effect.Effect<void, never, any>) => Effect.Effect<void, never, any>,
      ) =>
        Effect.forkScoped(
          subscribe(
            providePlatformEnv(
              label === 'suspend'
                ? lifecycle.runPlatformSuspend
                : label === 'resume'
                  ? lifecycle.runPlatformResume
                  : lifecycle.runPlatformReset,
            ).pipe(Effect.asVoid),
          ).pipe(
            Effect.catchAllCause((cause) =>
              lifecycle.notifyError(cause, {
                phase: 'platform',
                hook: label,
                moduleId,
                instanceId,
                origin: 'platform.subscribe',
              }),
            ),
          ),
        ).pipe(Effect.asVoid)

      if (snapshot.platformSuspend.length > 0) {
        yield* register('suspend', platform.lifecycle.onSuspend)
      }
      if (snapshot.platformResume.length > 0) {
        yield* register('resume', platform.lifecycle.onResume)
      }
      if (snapshot.platformReset.length > 0 && typeof platform.lifecycle.onReset === 'function') {
        yield* register('reset', platform.lifecycle.onReset)
      }
    }

    // Fork run fibers (start after init completes).
    yield* Effect.forEach(pendingRunForks, (eff) => eff, { discard: true })

    // lifecycle start: non-blocking (start after ready).
    yield* lifecycle.runStart

    // Give forked logics a scheduling chance so upper layers (e.g. Root processes) don't dispatch actions before logics are ready.
    yield* Effect.yieldNow()
  })
}
