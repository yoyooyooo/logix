import { Context, Effect } from "effect"
import type * as Logix from "./internal/module.js"
import * as Internal from "./internal/LogicMiddleware.js"
import * as PlatformInternal from "./internal/platform/Platform.js"

export * from "./internal/LogicMiddleware.js"

// Logic：在某一类 Module 上长期运行的一段 Effect 程序。

/**
 * Logic 作用域内用于获取当前 ModuleRuntime 的核心 Tag。
 */
export const RuntimeTag: Context.Tag<any, Logix.ModuleRuntime<any, any>> =
  Context.GenericTag<any, Logix.ModuleRuntime<any, any>>("@logix/Runtime")

// 对外暴露的 Platform 类型别名（与 internal/platform/Platform.Service 等价）。
export type Platform = PlatformInternal.Service

// Logic Env / Of 类型别名：统一指向 internal 版本，避免多处定义。
export type Env<Sh extends Logix.AnyModuleShape, R> = Internal.Env<Sh, R>

export type Of<
  Sh extends Logix.AnyModuleShape,
  R = never,
  A = void,
  E = never
> = Internal.Of<Sh, R, A, E>

export function of<
  Sh extends Logix.AnyModuleShape,
  R = never,
  A = void,
  E = never
>(eff: Effect.Effect<A, E, Env<Sh, R>>): Of<Sh, R, A, E> {
  return eff as Of<Sh, R, A, E>
}

// DSL 类型别名：直接复用 internal 定义。
export type Draft<T> = Internal.Draft<T>
export type AndThenUpdateHandler<
  Sh extends Logix.AnyModuleShape,
  Payload,
  E = any,
  R2 = any
> = Internal.AndThenUpdateHandler<Sh, Payload, E, R2>
export type IntentBuilder<
  Payload,
  Sh extends Logix.AnyModuleShape,
  R = never
> = Internal.IntentBuilder<Payload, Sh, R>
export type FluentMatch<V> = Internal.FluentMatch<V>
export type FluentMatchTag<V extends { _tag: string }> =
  Internal.FluentMatchTag<V>

// 其余实现细节（IntentBuilder 工厂等）由 internal/runtime 组合完成，
// 业务代码一般只通过 Module.logic 与 Bound API 使用本模块，不直接依赖内部构造过程。
