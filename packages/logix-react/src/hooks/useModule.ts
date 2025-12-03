import { Logix } from "@logix/core"
import { Context, Effect, Layer, Scope } from "effect"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"
import { useSelector } from "./useSelector.js"
import { useLocalModule } from "./useLocalModule.js"

const isModuleImpl = (
  handle: unknown
): handle is Logix.ModuleImpl<any, any, any> =>
  typeof handle === "object" && handle !== null && (handle as any)._tag === "ModuleImpl"

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  handle: Logix.ModuleInstance<Id, Sh>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Sh extends Logix.AnyModuleShape>(
  handle: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R, V>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useModule<Sh extends Logix.AnyModuleShape, V>(
  handle: ReactModuleHandle,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useModule<Sh extends Logix.AnyModuleShape, V>(
  handle: ReactModuleHandle | Logix.ModuleImpl<any, Sh, any>,
  selector?: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> | V {
  let runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

  if (isModuleImpl(handle)) {
    // ModuleImpl: 使用 useLocalModule 构造局部运行时
    // 注意：这里我们使用 factory 模式，利用 useLocalModule 内部的 Scope 管理。
    // factory 负责基于 ModuleImpl.layer + ModuleImpl.module 构造一棵独立的 ModuleRuntime，
    // 具体资源生命周期由 useLocalModule 创建的 Scope 统一托管。
    runtime = useLocalModule(
      () =>
        Effect.gen(function* () {
          const localScope = yield* Scope.make()
          const context = (yield* Layer.buildWithScope(
            handle.layer as Layer.Layer<any, any, any>,
            localScope,
          )) as Context.Context<any>

          return Context.get(
            context,
            handle.module,
          ) as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
        }).pipe(Effect.orDie),
      [handle],
    )
  } else {
    // ModuleInstance | ModuleRuntime: 使用 useModuleRuntime 获取/复用运行时
    runtime = useModuleRuntime(handle)
  }

  if (selector) {
    return useSelector(runtime, selector, equalityFn)
  }

  return runtime
}
