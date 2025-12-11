import { Effect } from "effect"
import * as ModuleFactory from "./internal/runtime/ModuleFactory.js"
import type {
  AnyModuleShape,
  ModuleHandle,
  ModuleInstance,
} from "./internal/module.js"

/**
 * Link.make 配置：
 * - modules：参与当前 Link 的 Module 列表；
 *   - key 将来自 Module 定义时的 id（例如 Logix.Module.make("User", ...) 的 "User"）。
 */
export interface LinkConfig<
  Ms extends readonly ModuleInstance<string, AnyModuleShape>[]
> {
  /**
   * Link 的标识：
   * - 可选；默认根据参与的 modules.id 拼接生成一个稳定字符串；
   * - 未来可用于 Universe / DevTools 中展示和定位 Link 节点。
   */
  readonly id?: string
  readonly modules: Ms
}

/**
 * 基于 Module 列表推导 Link 逻辑中可用的句柄视图：
 * - key 为 Module 定义时的 id；
 * - value 为该 Module 的只读句柄。
 */
export type LinkHandles<
  Ms extends readonly ModuleInstance<string, AnyModuleShape>[]
> = {
  [M in Ms[number] as M["id"]]: ModuleHandle<M["shape"]>
}

/**
 * 内部辅助类型：将 Module 列表转换为以 id 为 key 的映射，
 * 便于复用底层 ModuleFactory.Link 的实现。
 */
type ModulesRecord<
  Ms extends readonly ModuleInstance<string, AnyModuleShape>[]
> = {
  [M in Ms[number] as M["id"]]: M
}

/**
 * Link.make：
 * - 基于参与的 Module 列表与逻辑程序，构造 Link（跨模块胶水逻辑）；
 * - 返回值是“冷”的 Effect，通常挂到 ModuleImpl.implement({ processes/links }) 中，
 *   由运行时容器统一 fork。
 */
export function make<
  Ms extends readonly ModuleInstance<string, AnyModuleShape>[],
  E = never,
  R = never
>(
  config: LinkConfig<Ms>,
  logic: ($: LinkHandles<Ms>) => Effect.Effect<void, E, R>
): Effect.Effect<void, E, R> {
  // 默认 id：按照参与 Module 的 id 排序后拼接，保证顺序无关的稳定性
  const linkId =
    config.id ??
    [...config.modules]
      .map((m) => m.id)
      .sort()
      .join("~")

  // 将 Module 列表转换为以 id 为 key 的映射
  const modulesRecord = Object.create(null) as ModulesRecord<Ms>

  for (const module of config.modules) {
    // 运行时使用 module.id 作为 key，类型上由 ModulesRecord 保证约束
    ;(modulesRecord as any)[module.id] = module
  }

  // 复用现有 ModuleFactory.Link 实现，类型上 LinkHandles 与 Factory 的句柄结构一致
  const effect = ModuleFactory.Link(
    modulesRecord as any,
    logic as any
  ) as Effect.Effect<void, E, R>

  // 将 linkId 作为元信息附加在 Effect 上，供后续 Runtime / DevTools 按需消费。
  ;(effect as any)._linkId = linkId

  return effect
}
