import React from "react"
import { Context, Effect, Layer } from "effect"
import * as Logix from "@logix/core"
import { useLocalModule } from "./useLocalModule.js"
import type { ModuleRef } from "../internal/ModuleRef.js"

/**
 * 基于已经组装好的 Module Layer（例如 RegionLive）创建一个局部 ModuleRuntime。
 *
 * 使用场景：
 * - effect 侧已经通过 `Module.live(initial, ...logics)` 得到某个模块的完整 Layer；
 * - React 组件只想“无脑消费”这棵 Layer，而不关心 initial / logics 细节。
 */
export function useLayerModule<
  Id extends string,
  Sh extends Logix.AnyModuleShape
>(
  module: Logix.ModuleInstance<Id, Sh>,
  layer: Layer.Layer<
    Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
    never,
    any
  >,
  deps: React.DependencyList = []
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  const factory = React.useCallback(
    () =>
      Layer.build(layer).pipe(
        Effect.scoped,
        Effect.map((context) => Context.get(context, module))
      ),
    // layer / module 本身通常是常量，deps 允许调用方按需重建
    [layer, module]
  )

  return useLocalModule(factory, deps) as ModuleRef<
    Logix.StateOf<Sh>,
    Logix.ActionOf<Sh>
  >
}
