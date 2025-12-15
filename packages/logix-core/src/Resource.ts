// Resource 模块：
// - 定义逻辑资源规格 ResourceSpec；
// - 通过 Resource.layer 在 Runtime Env 中注册资源表；
// - 内部通过 ResourceRegistryTag 承载当前作用域内可用的资源集合。
//
// 设计约束（见 specs/001-module-traits-runtime/references/resource-and-query.md）：
// - StateTrait / Module 图纸层只知道 resourceId + key 规则，不直接接触 ResourceSpec 类型；
// - ResourceSpec 保持 Effect-Native：load 使用 Effect.Effect 表达；
// - Resource.layer 在单个 Runtime 作用域内注册一组资源，并在 dev 下对重复 id 做基本校验。

import { Context, Effect, Layer, Schema } from "effect"
import { isDevEnv } from "./internal/runtime/core/env.js"

/**
 * ResourceSpec 描述“一个逻辑资源长什么样、如何访问”。
 *
 * - Key: 用 Schema 描述的 key 形状（类似强类型 queryKey）；
 * - load: 基于 key 访问资源的 Effect；
 * - meta: 预留扩展位（cacheGroup/描述信息等）。
 */
export interface ResourceSpec<Key, Out, Err, Env> {
  readonly id: string
  readonly keySchema: Schema.Schema<Key, any>
  readonly load: (key: Key) => Effect.Effect<Out, Err, Env>
  readonly meta?: {
    readonly cacheGroup?: string
    readonly description?: string
    readonly [k: string]: unknown
  }
}

export type AnyResourceSpec = ResourceSpec<any, any, any, any>

export type ResourceStatus = "idle" | "loading" | "success" | "error"

export interface ResourceSnapshot<Data = unknown, Err = unknown> {
  readonly status: ResourceStatus
  readonly keyHash?: string
  readonly data?: Data
  readonly error?: Err
}

const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>()
  const encode = (input: unknown): unknown => {
    if (input === null) return null
    if (
      typeof input === "string" ||
      typeof input === "number" ||
      typeof input === "boolean"
    ) {
      return input
    }
    if (typeof input === "bigint") return input.toString()
    if (typeof input === "undefined") return "__undefined__"
    if (typeof input === "symbol") return `__symbol__:${String(input)}`
    if (typeof input === "function") return "__function__"

    if (Array.isArray(input)) {
      return input.map((v) => encode(v))
    }
    if (input instanceof Date) {
      return `__date__:${input.toISOString()}`
    }
    if (input instanceof Error) {
      return {
        _tag: "Error",
        name: input.name,
        message: input.message,
      }
    }
    if (input && typeof input === "object") {
      const obj = input as object
      if (seen.has(obj)) return "__cycle__"
      seen.add(obj)

      const record = input as Record<string, unknown>
      const keys = Object.keys(record).sort()
      const out: Record<string, unknown> = {}
      for (const k of keys) {
        out[k] = encode(record[k])
      }
      return out
    }
    return String(input)
  }

  try {
    return JSON.stringify(encode(value))
  } catch {
    return String(value)
  }
}

export const keyHash = (key: unknown): string => stableStringify(key)

export const Snapshot = {
  idle: <Data = never, Err = never>(): ResourceSnapshot<Data, Err> => ({
    status: "idle",
    keyHash: undefined,
    data: undefined,
    error: undefined,
  }),
  loading: <Data = never, Err = never>(params: {
    readonly keyHash: string
  }): ResourceSnapshot<Data, Err> => ({
    status: "loading",
    keyHash: params.keyHash,
    data: undefined,
    error: undefined,
  }),
  success: <Data>(params: {
    readonly keyHash: string
    readonly data: Data
  }): ResourceSnapshot<Data, never> => ({
    status: "success",
    keyHash: params.keyHash,
    data: params.data,
    error: undefined,
  }),
  error: <Err>(params: {
    readonly keyHash: string
    readonly error: Err
  }): ResourceSnapshot<never, Err> => ({
    status: "error",
    keyHash: params.keyHash,
    data: undefined,
    error: params.error,
  }),
} as const

/**
 * ResourceRegistry：
 * - 作为 Env 中的一项 Service，维护当前作用域内的资源规格表；
 * - key 为逻辑资源 ID（如 "user/profile"）。
 */
export interface ResourceRegistry {
  readonly specs: ReadonlyMap<string, AnyResourceSpec>
}

export class ResourceRegistryTag extends Context.Tag(
  "@logix/core/ResourceRegistry",
)<ResourceRegistryTag, ResourceRegistry>() {}

/**
 * internal：仅供内部模块（如 Query 中间件）使用的 Tag 导出。
 * - 不在 index.ts 做再次 re-export，避免直接暴露给最终用户；
 * - 测试与内部运行时代码可通过 `Resource.internal.ResourceRegistryTag` 访问。
 */
export const internal = {
  ResourceRegistryTag,
}

/**
 * Resource.Spec：
 * - ResourceSpec 的类型别名，方便在调用方代码中引用；
 * - 底层仍然使用 ResourceSpec 接口。
 */
export type Spec<Key, Out, Err, Env> = ResourceSpec<Key, Out, Err, Env>

/**
 * make：
 * - 用于定义一条逻辑资源规格；
 * - 目前仅做简单 identity，主要承载类型推导与语义标记。
 */
export const make = <Key, Out, Err, Env>(
  spec: ResourceSpec<Key, Out, Err, Env>,
): ResourceSpec<Key, Out, Err, Env> => spec

/**
 * layer：
 * - 在当前 Runtime 作用域内注册一组 ResourceSpec；
 * - 若 Env 中已存在 ResourceRegistry，则在其基础上叠加；
 * - 在 dev 环境下对重复 id 做基本校验（避免无声覆盖）。
 *
 * 说明：
 * - 不负责跨作用域冲突处理：不同 RuntimeProvider 子树可以为同一 id 提供不同实现；
 * - 若在同一作用域内重复注册同一 id 且实现不一致，在 dev 下会抛错。
 */
export const layer = (
  specs: ReadonlyArray<AnyResourceSpec>,
): Layer.Layer<ResourceRegistryTag, never, never> =>
  Layer.succeed(
    ResourceRegistryTag,
    (() => {
      const map = new Map<string, AnyResourceSpec>()
      for (const spec of specs) {
        if (isDevEnv() && map.has(spec.id) && map.get(spec.id) !== spec) {
          throw new Error(
            `[Resource.layer] Duplicate resource id "${spec.id}" detected in the same runtime scope`,
          )
        }
        map.set(spec.id, spec)
      }
      return { specs: map }
    })(),
  )
