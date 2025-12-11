// Middleware 命名空间入口。
// - 提供基于 EffectOp 的调试/观测中间件等辅助工具；
// - Query / DebugObserver 等能力在本命名空间下扩展。

import { Effect } from "effect"
import * as EffectOp from "../effectop.js"
import * as Debug from "../Debug.js"

export type Middleware = EffectOp.Middleware
export type MiddlewareStack = EffectOp.MiddlewareStack

export interface DebugLoggerConfig {
  /**
   * 可选：自定义日志函数，方便在测试中捕获调用。
   * - 若未提供，则默认使用 Effect.logDebug 输出。
   */
  readonly logger?: (op: EffectOp.EffectOp<any, any, any>) => void
}

/**
 * 创建一个简单的 Debug 日志中间件：
 * - 在执行 Effect 之前记录一条日志；
 * - 不改变结果与错误语义。
 */
export const makeDebugLogger = (
  config?: DebugLoggerConfig,
): Middleware =>
  <A, E, R>(op: EffectOp.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      if (config?.logger) {
        config.logger(op)
      } else {
        yield* Effect.logDebug(
          `[EffectOp] kind=${op.kind} name=${op.name}`,
        )
      }
      return yield* op.effect
    })

/**
 * applyDebug：
 * - 在现有 MiddlewareStack 末尾追加一个 DebugLogger 中间件；
 * - 返回新的 stack，不修改原数组。
 */
export const applyDebug = (
  stack: MiddlewareStack,
  config?: DebugLoggerConfig,
): MiddlewareStack => [...stack, makeDebugLogger(config)]

/**
 * DebugObserverConfig：
 * - 预留过滤入口：可按模块 / kind / name 等维度筛选需要观测的 EffectOp。
 */
export interface DebugObserverConfig {
  readonly filter?: (
    op: EffectOp.EffectOp<any, any, any>,
  ) => boolean
}

/**
 * makeDebugObserver：
 * - 将 EffectOp 流统一收口到 DebugSink（EffectOp → Debug.Event）；
 * - 当前通过 trace:* 事件将 EffectOp 原样透传到 Debug 流：
 *   - type: "trace:effectop"
 *   - moduleId: 来自 op.meta?.moduleId（若存在）
 *   - data: 整个 EffectOp 对象
 *
 * 说明：
 * - 不改变原有 Effect 行为，仅追加 Debug 侧观测；
 * - 具体的 Devtools / Timeline 视图可以基于 trace:effectop 事件重建 EffectOp 时间线。
 */
export const makeDebugObserver = (
  config?: DebugObserverConfig,
): Middleware =>
  <A, E, R>(op: EffectOp.EffectOp<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      if (!config?.filter || config.filter(op)) {
        yield* Debug.record({
          type: "trace:effectop",
          moduleId: (op.meta?.moduleId as string | undefined) ?? undefined,
          data: op,
        })
      }
      return yield* op.effect
    })

/**
 * applyDebugObserver：
 * - 在现有 MiddlewareStack 末尾追加 DebugObserver 中间件；
 * - 返回新的 stack，不修改原数组。
 */
export const applyDebugObserver = (
  stack: MiddlewareStack,
  config?: DebugObserverConfig,
): MiddlewareStack => [...stack, makeDebugObserver(config)]
