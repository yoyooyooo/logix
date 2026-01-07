import { Context, Deferred, Effect, Layer, ManagedRuntime } from 'effect'
import {
  ConcurrencyPolicyTag,
  ReadQueryStrictGateConfigTag,
  StateTransactionConfigTag,
  declarativeLinkRuntimeLayer,
  hostSchedulerLayer,
  runtimeStoreLayer,
  tickSchedulerLayer,
  type ConcurrencyPolicy,
  type ReadQueryStrictGateRuntimeConfig,
  type StateTransactionRuntimeConfig,
} from './core/env.js'
import { RootContextTag, type RootContext } from './core/RootContext.js'
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
  readonly serviceTags?: ReadonlyArray<Context.Tag<any, any>>
}

export interface LogixAppConfig<R> {
  readonly layer: Layer.Layer<R, never, never>
  readonly modules: ReadonlyArray<AppModuleEntry>
  readonly processes: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  /**
   * Runtime-level default StateTransaction config:
   * - If not provided, each ModuleRuntime falls back to NODE_ENV-based default instrumentation.
   * - If instrumentation is provided, it becomes the default instrumentation for modules under this Runtime;
   *   individual modules may still override it via ModuleImpl.stateTransaction.
   */
  readonly stateTransaction?: StateTransactionRuntimeConfig
  /**
   * Runtime-level concurrency policy:
   * - If not provided, each entrypoint falls back to builtin defaults (e.g. concurrencyLimit=16).
   * - If provided, it becomes the default policy for modules under this Runtime;
   *   individual modules may still override via runtime_module/provider (merged by ModuleRuntime resolver).
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
}

interface TagInfo {
  readonly key: string
  readonly tag: Context.Tag<any, any>
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

const getTagKey = (tag: Context.Tag<any, any>): string => {
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
    const moduleTag = entry.module as unknown as Context.Tag<any, any>
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
  const seenIds = new Set<string>()
  for (const entry of config.modules) {
    const id = String(entry.module.id)

    if (seenIds.has(id)) {
      throw new Error(
        `[Logix] Duplicate Module ID/Tag detected: "${id}". \nEnsure all modules in the application Runtime have unique IDs.`,
      )
    }
    seenIds.add(id)
  }

  // Validate tag collisions before merging layers.
  // This exposes "the same ServiceTag implemented by multiple modules" early, avoiding silent Env overrides.
  validateTags(config.modules)

  // If the Runtime provides a unified StateTransaction config, attach the corresponding service to the app Env.
  const stateTxnLayer: Layer.Layer<R, never, never> = config.stateTransaction
    ? (Layer.succeed(StateTransactionConfigTag, config.stateTransaction) as Layer.Layer<R, never, never>)
    : (Layer.empty as Layer.Layer<R, never, never>)

  // If the Runtime provides a unified ConcurrencyPolicy, attach the corresponding service to the app Env.
  const concurrencyPolicyLayer: Layer.Layer<R, never, never> = config.concurrencyPolicy
    ? (Layer.succeed(ConcurrencyPolicyTag, config.concurrencyPolicy) as Layer.Layer<R, never, never>)
    : (Layer.empty as Layer.Layer<R, never, never>)

  // If the Runtime provides a ReadQuery strict gate, attach the corresponding service to the app Env.
  const readQueryStrictGateLayer: Layer.Layer<R, never, never> = config.readQueryStrictGate
    ? (Layer.succeed(ReadQueryStrictGateConfigTag, config.readQueryStrictGate) as Layer.Layer<R, never, never>)
    : (Layer.empty as Layer.Layer<R, never, never>)

  const appModuleIds = config.modules.map((entry) => String(entry.module.id))
  const appId = appModuleIds.length === 1 ? appModuleIds[0]! : appModuleIds.slice().sort().join('~')

  const tickServicesLayer = Layer.provideMerge(hostSchedulerLayer)(
    Layer.provideMerge(runtimeStoreLayer)(Layer.provideMerge(declarativeLinkRuntimeLayer)(tickSchedulerLayer())),
  )

  // Provide tick services as the baseline runtime env for caller layers.
  // This allows app layers to override TickScheduler/HostScheduler while still depending on RuntimeStore/DeclarativeLinkRuntime.
  const appLayer = (config.layer as Layer.Layer<any, never, never>).pipe(Layer.provide(tickServicesLayer))

  const baseLayer = Layer.mergeAll(
    tickServicesLayer,
    appLayer,
    stateTxnLayer,
    concurrencyPolicyLayer,
    readQueryStrictGateLayer,
    ProcessRuntime.layer(),
    Layer.effect(
      RootContextTag,
      Effect.gen(function* () {
        const ready = yield* Deferred.make<Context.Context<any>>()
        return { context: undefined, ready, appId, appModuleIds } satisfies RootContext
      }),
    ),
  ) as Layer.Layer<R, never, never>

  const finalLayer = Layer.unwrapScoped(
    Effect.gen(function* () {
      const scope = yield* Effect.scope

      // buildWithScope builds layers within the current scope and patches FiberRefs (e.g. Debug sinks).
      // We wrap it with diffFiberRefs to capture FiberRef patch changes, then feed the patch back as a Layer,
      // so FiberRef modifications are not "washed out" during assembly.
      //
      // IMPORTANT (073):
      // - Build baseLayer first, then build module layers under baseEnv.
      // - Otherwise, module initialization may fork long-lived fibers (txnQueue/logics) before TickScheduler/RuntimeStore
      //   is available, and those fibers will permanently miss the runtime services due to Env capture semantics.
      const [patch, env] = yield* Effect.diffFiberRefs(
        Effect.gen(function* () {
          const baseEnv = yield* Layer.buildWithScope(baseLayer, scope)

          const moduleEnv =
            config.modules.length > 0
              ? yield* Effect.provide(
                  Layer.buildWithScope(
                    config.modules.length === 1
                      ? config.modules[0]!.layer
                      : config.modules
                          .slice(1)
                          .reduce((acc, entry) => Layer.merge(acc, entry.layer), config.modules[0]!.layer),
                    scope,
                  ),
                  baseEnv as Context.Context<any>,
                )
              : undefined

          const mergedEnv = moduleEnv
            ? (Context.merge(baseEnv as Context.Context<any>, moduleEnv as Context.Context<any>) as Context.Context<any>)
            : (baseEnv as Context.Context<any>)

          // After env is built, complete RootContext (single source of truth for the root provider).
          // Note: module logics may already be forked and waiting for RootContext in the run phase; completing it here unblocks them.
          // RootContextTag is an internal service injected by AppRuntime (should not leak into external R types);
          // keep types minimal to avoid incorrect generic inference in Context.get.
          const rootContext = Context.get(mergedEnv as Context.Context<any>, RootContextTag as any) as RootContext

          rootContext.context = mergedEnv as Context.Context<any>
          yield* Deferred.succeed(rootContext.ready, mergedEnv as Context.Context<any>)

          const processRuntime = Context.get(
            mergedEnv as Context.Context<any>,
            ProcessRuntime.ProcessRuntimeTag as any,
          ) as ProcessRuntime.ProcessRuntime

          // After Env is fully ready, start app-level long-lived processes (Process / Link / watchers / host bridges, etc.).
          yield* Effect.forEach(
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

                // Legacy fallback: a raw Effect is still allowed as a process host, but it has no Process static surface/diagnostics.
                if (installation === undefined) {
                  yield* Effect.forkScoped(
                    Effect.provide(
                      config.onError ? Effect.catchAllCause(process, config.onError) : process,
                      mergedEnv,
                    ),
                  )
                }
              }),
            { discard: true },
          )

          return mergedEnv
        }),
      )

      const fiberRefsLayer = Layer.scopedDiscard(Effect.patchFiberRefs(patch))

      return Layer.mergeAll(Layer.succeedContext(env), fiberRefsLayer)
    }),
  ) as Layer.Layer<R, never, never>

  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => ManagedRuntime.make(finalLayer),
  }
}

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
  serviceTags: ReadonlyArray<Context.Tag<any, any>>,
): AppModuleEntry => {
  const base = provide(module, resource)
  return {
    ...base,
    serviceTags,
  }
}

const isLayer = (value: unknown): value is Layer.Layer<any, any, any> =>
  typeof value === 'object' && value !== null && Layer.LayerTypeId in value
