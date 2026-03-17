import { Effect, Exit, Layer, ManagedRuntime, ServiceMap } from 'effect'
import {
  ConcurrencyPolicyTag,
  ReadQueryStrictGateConfigTag,
  SchedulingPolicySurfaceTag,
  StateTransactionConfigTag,
  declarativeLinkRuntimeLayer,
  hostSchedulerLayer,
  HostSchedulerTag,
  runtimeStoreLayer,
  tickSchedulerLayer,
  type ConcurrencyPolicy,
  type SchedulingPolicySurface,
  type ReadQueryStrictGateRuntimeConfig,
  type StateTransactionRuntimeConfig,
} from './core/env.js'
import {
  AppAssemblyGraph,
  type AssemblyReasonCode,
  type AssemblyStageId,
  type BootAssemblyReport,
} from './core/AppAssemblyGraph.js'
import {
  RootContextTag,
  makeRootContext,
  mergeRootContext,
  readyRootContext,
  type RootContext,
} from './core/RootContext.js'
import type { HostScheduler } from './core/HostScheduler.js'
import * as ProcessRuntime from './core/process/ProcessRuntime.js'
import type { AnyModuleShape, ModuleTag, ModuleRuntime, StateOf, ActionOf } from './core/module.js'

/**
 * AppModuleEntry: a module entry produced by Logix.provide.
 *
 * - module: the Module definition object (both a Tag and a carrier of shape info + factory capability).
 * - layer: the runtime Layer for the Module.
 */
export interface AppModuleEntry {
  readonly module: ModuleTag<any, any>
  readonly layer: Layer.Layer<any, any, any>
  /**
   * Optional: list of Service Tags provided by this module's layer.
   *
   * - Used only during app assembly for tag collision detection and Env topology analysis.
   * - Internally, AppRuntime assembly can declare this explicitly via provideWithTags.
   * - Does not affect runtime behavior; if omitted, the module layer is treated as "no explicit service tags declared".
   */
  readonly serviceTags?: ReadonlyArray<ServiceMap.Key<any, any>>
}

export interface LogixAppConfig<R> {
  readonly layer: Layer.Layer<R, never, never>
  readonly modules: ReadonlyArray<AppModuleEntry>
  readonly processes: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  /**
   * Optional HostScheduler override for this Runtime.
   *
   * IMPORTANT:
   * - Services like TickScheduler capture HostScheduler at Layer build-time (073).
   * - This option injects the override into the tick services build pipeline to avoid env-override pitfalls.
   */
  readonly hostScheduler?: HostScheduler
  /**
   * Runtime-level default StateTransaction config:
   * - If not provided, each ModuleRuntime falls back to NODE_ENV-based default instrumentation.
   * - If instrumentation is provided, it becomes the default instrumentation for modules under this Runtime;
   *   individual modules may still override it via ModuleImpl.stateTransaction.
   */
  readonly stateTransaction?: StateTransactionRuntimeConfig
  /**
   * Runtime-level unified scheduling policy surface:
   * - If not provided, each entrypoint falls back to builtin defaults (e.g. concurrencyLimit=16).
   * - If provided, it becomes the default policy for modules under this Runtime;
   *   individual modules may still override via runtime_module/provider (merged by ModuleRuntime resolver).
   */
  readonly schedulingPolicy?: SchedulingPolicySurface
  /**
   * Legacy alias for schedulingPolicy (migration path).
   */
  readonly concurrencyPolicy?: ConcurrencyPolicy
  /**
   * ReadQuery strict gate (057):
   * - Used in CI/perf gates to upgrade dynamic fallbacks into failures or warnings.
   * - Not provided by default (preserve usability).
   */
  readonly readQueryStrictGate?: ReadQueryStrictGateRuntimeConfig
}

export interface AppDefinition<R> {
  readonly definition: LogixAppConfig<R>
  readonly layer: Layer.Layer<R, never, never>
  readonly makeRuntime: () => ManagedRuntime.ManagedRuntime<R, never>
  readonly getAssemblyReport?: () => BootAssemblyReport | undefined
}

interface TagInfo {
  readonly key: string
  readonly tag: ServiceMap.Key<any, any>
  readonly ownerModuleId: string
  readonly source: 'module' | 'service'
}

interface TagCollision {
  readonly key: string
  readonly conflicts: ReadonlyArray<TagInfo>
}

interface TagCollisionError extends Error {
  readonly _tag: 'TagCollisionError'
  readonly collisions: ReadonlyArray<TagCollision>
}

const getTagKey = (tag: ServiceMap.Key<any, any>): string => {
  const anyTag = tag as any
  if (typeof anyTag.key === 'string') {
    return anyTag.key
  }
  if (typeof anyTag._id === 'string') {
    return anyTag._id
  }
  if (typeof anyTag.toString === 'function') {
    return anyTag.toString()
  }
  return '[unknown-tag]'
}

const buildTagIndex = (entries: ReadonlyArray<AppModuleEntry>): Map<string, TagInfo[]> => {
  const index = new Map<string, TagInfo[]>()

  for (const entry of entries) {
    const ownerId = String(entry.module.id)

    // Record the Module tag itself.
    const moduleTag = entry.module as unknown as ServiceMap.Key<any, any>
    const moduleKey = getTagKey(moduleTag)
    const moduleInfo: TagInfo = {
      key: moduleKey,
      tag: moduleTag,
      ownerModuleId: ownerId,
      source: 'module',
    }
    const existingModuleInfos = index.get(moduleKey)
    if (existingModuleInfos) {
      existingModuleInfos.push(moduleInfo)
    } else {
      index.set(moduleKey, [moduleInfo])
    }

    // Record explicitly declared service tags (if any).
    if (entry.serviceTags && entry.serviceTags.length > 0) {
      for (const tag of entry.serviceTags) {
        const key = getTagKey(tag)
        const info: TagInfo = {
          key,
          tag,
          ownerModuleId: ownerId,
          source: 'service',
        }
        const existingInfos = index.get(key)
        if (existingInfos) {
          existingInfos.push(info)
        } else {
          index.set(key, [info])
        }
      }
    }
  }

  return index
}

const validateTags = (entries: ReadonlyArray<AppModuleEntry>): void => {
  const index = buildTagIndex(entries)
  const collisions: TagCollision[] = []

  for (const [key, infos] of index) {
    if (infos.length <= 1) {
      continue
    }
    const owners = new Set<string>()
    for (const info of infos) {
      owners.add(info.ownerModuleId)
    }
    // Treat it as a collision only when the same key appears under multiple different modules.
    // Duplicates within a single module are not considered an error (may come from multi-layer composition).
    if (owners.size > 1) {
      collisions.push({ key, conflicts: infos })
    }
  }

  if (collisions.length === 0) {
    return
  }

  const message =
    '[Logix] Tag collision detected:\n' +
    collisions
      .map((c) => {
        const header = `- key: ${c.key}`
        const lines = c.conflicts.map((i) => `  - owner: ${i.ownerModuleId}, source: ${i.source}`)
        return [header, ...lines].join('\n')
      })
      .join('\n')

  const error: TagCollisionError = Object.assign(new Error(message), {
    _tag: 'TagCollisionError' as const,
    collisions,
  })

  throw error
}

export const makeApp = <R>(config: LogixAppConfig<R>): AppDefinition<R> => {
  const appModuleIds = config.modules.map((entry) => String(entry.module.id))
  const appId = appModuleIds.length === 1 ? appModuleIds[0]! : appModuleIds.slice().sort().join('~')
  const assemblyGraph = new AppAssemblyGraph(appId)
  let latestAssemblyReport: BootAssemblyReport | undefined

  const failAndThrow = (stageId: AssemblyStageId, reasonCode: AssemblyReasonCode, error: unknown): never => {
    assemblyGraph.failStage(stageId, reasonCode, error)
    latestAssemblyReport = assemblyGraph.buildReport(false)
    throw error
  }

  assemblyGraph.beginStage('validate.modules')
  const seenIds = new Set<string>()
  for (const entry of config.modules) {
    const id = String(entry.module.id)

    if (seenIds.has(id)) {
      const error = new Error(
        `[Logix] Duplicate Module ID/Tag detected: "${id}". \nEnsure all modules in the application Runtime have unique IDs.`,
      )
      failAndThrow('validate.modules', 'boot::module_duplicate', error)
    }
    seenIds.add(id)
  }
  assemblyGraph.completeStage('validate.modules')

  // Validate tag collisions before merging layers.
  // This exposes "the same ServiceTag implemented by multiple modules" early, avoiding silent Env overrides.
  assemblyGraph.beginStage('validate.tags')
  try {
    validateTags(config.modules)
    assemblyGraph.completeStage('validate.tags')
  } catch (error) {
    failAndThrow('validate.tags', 'boot::tag_collision', error)
  }

  // If the Runtime provides a unified StateTransaction config, attach the corresponding service to the app Env.
  const stateTxnLayer: Layer.Layer<R, never, never> = config.stateTransaction
    ? (Layer.succeed(StateTransactionConfigTag, config.stateTransaction) as Layer.Layer<R, never, never>)
    : (Layer.empty as Layer.Layer<R, never, never>)

  const resolvedSchedulingPolicy = config.schedulingPolicy ?? config.concurrencyPolicy

  // If the Runtime provides a unified scheduling policy, attach the corresponding service to the app Env.
  // NOTE: ConcurrencyPolicyTag remains a legacy alias of SchedulingPolicySurfaceTag.
  const schedulingPolicyLayer: Layer.Layer<R, never, never> = resolvedSchedulingPolicy
    ? (Layer.succeed(SchedulingPolicySurfaceTag, resolvedSchedulingPolicy) as Layer.Layer<R, never, never>)
    : (Layer.empty as Layer.Layer<R, never, never>)

  // If the Runtime provides a ReadQuery strict gate, attach the corresponding service to the app Env.
  const readQueryStrictGateLayer: Layer.Layer<R, never, never> = config.readQueryStrictGate
    ? (Layer.succeed(ReadQueryStrictGateConfigTag, config.readQueryStrictGate) as Layer.Layer<R, never, never>)
    : (Layer.empty as Layer.Layer<R, never, never>)

  const pinnedHostSchedulerLayer: Layer.Layer<any, never, never> | undefined =
    config.hostScheduler !== undefined
      ? (Layer.succeed(HostSchedulerTag, config.hostScheduler) as Layer.Layer<any, never, never>)
      : undefined

  const tickServicesLayer = Layer.provideMerge(pinnedHostSchedulerLayer ?? hostSchedulerLayer)(
    Layer.provideMerge(runtimeStoreLayer)(Layer.provideMerge(declarativeLinkRuntimeLayer)(tickSchedulerLayer())),
  )

  // Provide tick services as the baseline runtime env for caller layers.
  // This allows app layers to override TickScheduler/HostScheduler while still depending on RuntimeStore/DeclarativeLinkRuntime.
  const appLayer = (config.layer as Layer.Layer<any, never, never>).pipe(Layer.provide(tickServicesLayer))

  assemblyGraph.beginStage('build.baseLayer')
  const baseLayer = Layer.mergeAll(
    tickServicesLayer,
    appLayer,
    // If a HostScheduler override is requested, pin it as the final HostSchedulerTag value to avoid accidental divergence.
    // (Build-time capture is handled above by injecting it into tickServicesLayer.)
    pinnedHostSchedulerLayer ?? (Layer.empty as Layer.Layer<any, never, never>),
    stateTxnLayer,
    schedulingPolicyLayer,
    // Keep explicit legacy alias provisioning in the Env merge path so older callsites that reference
    // ConcurrencyPolicyTag keep identical behavior during phase-1 migration.
    resolvedSchedulingPolicy
      ? (Layer.succeed(ConcurrencyPolicyTag, resolvedSchedulingPolicy) as Layer.Layer<R, never, never>)
      : (Layer.empty as Layer.Layer<R, never, never>),
    readQueryStrictGateLayer,
    ProcessRuntime.layer(),
    Layer.effect(
      RootContextTag,
      makeRootContext({ appId, appModuleIds }),
    ),
  ) as Layer.Layer<R, never, never>
  assemblyGraph.completeStage('build.baseLayer')

  const runStage = <A>(
    stageId: AssemblyStageId,
    reasonCode: AssemblyReasonCode,
    effect: Effect.Effect<A, any, any>,
  ): Effect.Effect<A, any, any> =>
    Effect.gen(function* () {
      assemblyGraph.beginStage(stageId)
      const exit = yield* Effect.exit(effect)

      if (Exit.isSuccess(exit)) {
        assemblyGraph.completeStage(stageId)
        return exit.value
      }

      assemblyGraph.failStage(stageId, reasonCode, exit.cause)
      latestAssemblyReport = assemblyGraph.buildReport(false)
      return yield* Effect.failCause(exit.cause)
    })

  const finalLayer = Layer.unwrap(
    Effect.gen(function* () {
      // AppDefinition can be used to create multiple runtimes; reset graph state before each boot.
      assemblyGraph.reset()
      // These stages are validated/computed at makeApp-time and should appear as succeeded in every boot report.
      assemblyGraph.beginStage('validate.modules')
      assemblyGraph.completeStage('validate.modules')
      assemblyGraph.beginStage('validate.tags')
      assemblyGraph.completeStage('validate.tags')
      assemblyGraph.beginStage('build.baseLayer')
      assemblyGraph.completeStage('build.baseLayer')

      const scope = yield* Effect.scope

      // IMPORTANT (073):
      // - Build baseLayer first, then build module layers under baseEnv.
      // - Otherwise, module initialization may fork long-lived fibers (txnQueue/logics) before TickScheduler/RuntimeStore
      //   is available, and those fibers will permanently miss the runtime services due to Env capture semantics.
      const env = yield* Effect.gen(function* () {
        const baseEnv = yield* runStage(
          'build.baseEnv',
          'boot::base_layer_build_failed',
          Layer.buildWithScope(baseLayer, scope),
        )

        const moduleEnv = yield* runStage(
          'build.moduleEnvs',
          'boot::module_layer_build_failed',
          config.modules.length > 0
            ? Effect.provide(
                Layer.buildWithScope(
                  config.modules.length === 1
                    ? config.modules[0]!.layer
                    : config.modules.slice(1).reduce((acc, entry) => Layer.merge(acc, entry.layer), config.modules[0]!.layer),
                  scope,
                ),
                baseEnv,
              )
            : Effect.succeed(undefined),
        )

        const mergedEnv = yield* runStage(
          'merge.env',
          'boot::env_merge_failed',
          Effect.sync(() => (moduleEnv ? ServiceMap.merge(baseEnv, moduleEnv) : baseEnv)),
        )

        const rootContext = yield* runStage(
          'rootContext.merge',
          'boot::root_context_merge_failed',
          Effect.flatMap(
            Effect.sync(() => ServiceMap.get(mergedEnv, RootContextTag as ServiceMap.Key<any, RootContext>)),
            (root) => mergeRootContext(root, mergedEnv as ServiceMap.ServiceMap<any>),
          ),
        )
        assemblyGraph.markRootContextMerged()

        yield* runStage(
          'rootContext.ready',
          'boot::root_context_ready_failed',
          readyRootContext(rootContext),
        )
        assemblyGraph.markRootContextReady()

        const processRuntime = ServiceMap.get(
          mergedEnv,
          ProcessRuntime.ProcessRuntimeTag as ServiceMap.Key<any, ProcessRuntime.ProcessRuntime>,
        )

        yield* runStage(
          'process.install',
          'boot::process_install_failed',
          Effect.forEach(
            config.processes,
            (process) =>
              Effect.gen(function* () {
                const installation = yield* Effect.provide(
                  processRuntime.install(process as any, {
                    scope: { type: 'app', appId },
                    enabled: true,
                    installedAt: 'appRuntime',
                  }),
                  mergedEnv,
                )

                if (installation === undefined) {
                  yield* Effect.provide(
                    config.onError ? Effect.catchCause(process, config.onError) : process,
                    mergedEnv,
                  ).pipe(Effect.forkScoped())
                }
              }),
            { discard: true },
          ),
        )

        return mergedEnv
      })

      latestAssemblyReport = assemblyGraph.buildReport(true)

      return Layer.effectServices(Effect.succeed(env))
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.gen(function* () {
          assemblyGraph.ensureFailure('boot::unknown', cause)
          latestAssemblyReport = assemblyGraph.buildReport(false)
          return yield* Effect.failCause(cause)
        }),
      ),
    ),
  ) as Layer.Layer<R, never, never>

  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => ManagedRuntime.make(finalLayer),
    getAssemblyReport: () => latestAssemblyReport,
  }
}

export const getAssemblyReport = <R>(app: AppDefinition<R>): BootAssemblyReport | undefined => app.getAssemblyReport?.()

/**
 * Sugar: pair a Module with a runtime instance or layer for AppRuntime's modules config.
 */
export const provide = <Sh extends AnyModuleShape, R, E>(
  module: ModuleTag<any, Sh>,
  resource: Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, E, R> | ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
): AppModuleEntry => {
  const layer = isLayer(resource)
    ? resource
    : Layer.succeed(module, resource as ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>)

  return { module, layer }
}

/**
 * Sugar: attach explicit ServiceTag metadata to an app module entry for tag collision detection.
 *
 * - serviceTags should include only services implemented by this module's layer.
 * - Internal-only helper: `@logixjs/core` blocks `./internal/*` in package exports, so this is not a public API surface.
 */
export const provideWithTags = <Sh extends AnyModuleShape, R, E>(
  module: ModuleTag<any, Sh>,
  resource: Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, E, R> | ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
  serviceTags: ReadonlyArray<ServiceMap.Key<any, any>>,
): AppModuleEntry => {
  const base = provide(module, resource)
  return {
    ...base,
    serviceTags,
  }
}

const isLayer = (value: unknown): value is Layer.Layer<any, any, any> => Layer.isLayer(value)
