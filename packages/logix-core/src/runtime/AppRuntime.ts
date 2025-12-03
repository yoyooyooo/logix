import { Context, Effect, Layer, ManagedRuntime } from "effect"
import type { AnyModuleShape, ModuleInstance, ModuleRuntime, StateOf, ActionOf } from "../api/Logix.js"

/**
 * AppModuleEntry：由 Logix.provide 生成的模块条目。
 *
 * - module：Module 定义对象（既是 Tag，又携带 Shape 信息与工厂能力）；
 * - layer：该 Module 对应的 Runtime Layer。
 */
export interface AppModuleEntry {
  readonly module: ModuleInstance<any, AnyModuleShape>
  readonly layer: Layer.Layer<any, any, any>
  /**
   * 可选：由该模块对应 Layer 提供的 Service Tag 列表。
   *
   * - 仅用于 App 构建阶段的 Tag 冲突检测与 Env 拓扑分析；
   * - 内部在使用 AppRuntime 组装应用蓝图时，可通过 provideWithTags 显式声明；
   * - 不影响运行时行为，不声明则视为“该 Module Layer 未显式提供 Service Tag”。
   */
  readonly serviceTags?: ReadonlyArray<Context.Tag<any, any>>
}

export interface LogixAppConfig<R> {
  readonly layer: Layer.Layer<R, never, never>
  readonly modules: ReadonlyArray<AppModuleEntry>
  readonly processes: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly onError?: (
    cause: import("effect").Cause.Cause<unknown>
  ) => Effect.Effect<void>
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
  readonly source: "module" | "service"
}

interface TagCollision {
  readonly key: string
  readonly conflicts: ReadonlyArray<TagInfo>
}

interface TagCollisionError extends Error {
  readonly _tag: "TagCollisionError"
  readonly collisions: ReadonlyArray<TagCollision>
}

const getTagKey = (tag: Context.Tag<any, any>): string => {
  const anyTag = tag as any
  if (typeof anyTag.key === "string") {
    return anyTag.key
  }
  if (typeof anyTag._id === "string") {
    return anyTag._id
  }
  if (typeof anyTag.toString === "function") {
    return anyTag.toString()
  }
  return "[unknown-tag]"
}

const buildTagIndex = (
  entries: ReadonlyArray<AppModuleEntry>
): Map<string, TagInfo[]> => {
  const index = new Map<string, TagInfo[]>()

  for (const entry of entries) {
    const ownerId = String(entry.module.id)

    // 记录 Module 自身 Tag
    const moduleTag = entry.module as unknown as Context.Tag<any, any>
    const moduleKey = getTagKey(moduleTag)
    const moduleInfo: TagInfo = {
      key: moduleKey,
      tag: moduleTag,
      ownerModuleId: ownerId,
      source: "module"
    }
    const existingModuleInfos = index.get(moduleKey)
    if (existingModuleInfos) {
      existingModuleInfos.push(moduleInfo)
    } else {
      index.set(moduleKey, [moduleInfo])
    }

    // 记录显式声明的 Service Tag（如有）
    if (entry.serviceTags && entry.serviceTags.length > 0) {
      for (const tag of entry.serviceTags) {
        const key = getTagKey(tag)
        const info: TagInfo = {
          key,
          tag,
          ownerModuleId: ownerId,
          source: "service"
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
    // 仅当同一 key 出现在多个不同模块下时视为冲突；
    // 单模块内重复登记同一 Tag 不作为错误处理（可能来自多层组合）。
    if (owners.size > 1) {
      collisions.push({ key, conflicts: infos })
    }
  }

  if (collisions.length === 0) {
    return
  }

  const message =
    "[Logix] Tag collision detected:\n" +
    collisions
      .map((c) => {
        const header = `- key: ${c.key}`
        const lines = c.conflicts.map(
          (i) => `  - owner: ${i.ownerModuleId}, source: ${i.source}`
        )
        return [header, ...lines].join("\n")
      })
      .join("\n")

  const error: TagCollisionError = Object.assign(new Error(message), {
    _tag: "TagCollisionError" as const,
    collisions
  })

  throw error
}

export const makeApp = <R>(config: LogixAppConfig<R>): AppDefinition<R> => {
  const seenIds = new Set<string>()
  for (const entry of config.modules) {
    const id = String(entry.module.id)

    if (seenIds.has(id)) {
      throw new Error(
        `[Logix] Duplicate Module ID/Tag detected: "${id}". \nEnsure all modules in the application Runtime have unique IDs.`
      )
    }
    seenIds.add(id)
  }

  // 在合并 Layer 之前，对 Module Tag 与显式提供的 Service Tag 做一次冲突校验。
  // 这可以提前暴露“同一 ServiceTag 由多个模块实现”的问题，避免 Env 被静默覆盖。
  validateTags(config.modules)

  const moduleLayers = config.modules.map((entry) => entry.layer)
  const envLayer = moduleLayers.length > 0
    ? Layer.mergeAll(config.layer, ...moduleLayers)
    : config.layer

  const finalLayer = Layer.unwrapScoped(
    Effect.gen(function* () {
      const scope = yield* Effect.scope
      const env = yield* Layer.buildWithScope(envLayer, scope)

      yield* Effect.forEach(config.processes, (process) =>
        Effect.forkScoped(
          Effect.provide(
            config.onError
              ? Effect.catchAllCause(process, config.onError)
              : process,
            env
          )
        )
      )

      return Layer.succeedContext(env)
    })
  ) as Layer.Layer<R, never, never>

  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => ManagedRuntime.make(finalLayer),
  }
}

/**
 * 语法糖：将 Module 与 Runtime 实例或 Layer 配对，用于 AppRuntime 的 modules 配置。
 */
export const provide = <Sh extends AnyModuleShape, R, E>(
  module: ModuleInstance<any, Sh>,
  resource:
    | Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, E, R>
    | ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
): AppModuleEntry => {
  const layer = isLayer(resource)
    ? resource
    : Layer.succeed(
        module,
        resource as ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
      )

  return { module, layer }
}

/**
 * 语法糖：在 App 模块条目上附加显式 Service Tag 元信息，用于 Tag 冲突检测。
 *
 * - serviceTags 应仅包含“由该模块对应 Layer 提供实现”的 Service；
 * - 通过 Logix.provideWithTags 暴露给业务代码，在 App 构建阶段提前发现 Tag Key 冲突。
 */
export const provideWithTags = <Sh extends AnyModuleShape, R, E>(
  module: ModuleInstance<any, Sh>,
  resource:
    | Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, E, R>
    | ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
  serviceTags: ReadonlyArray<Context.Tag<any, any>>
): AppModuleEntry => {
  const base = provide(module, resource)
  return {
    ...base,
    serviceTags
  }
}

const isLayer = (
  value: unknown
): value is Layer.Layer<any, any, any> =>
  typeof value === "object" && value !== null && Layer.LayerTypeId in value
