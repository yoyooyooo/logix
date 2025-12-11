import { Effect } from "effect"
import * as Logix from "@logix/core"

/**
 * @pattern Cascade (级联加载)
 * @description
 *   封装了典型的“字段联动”流程：
 *   1. 监听上游字段变化 (Source Change)
 *   2. 立即重置下游状态 (Reset)
 *   3. 并发控制 (runLatest)
 *   4. 异步加载数据 (Load)
 *   5. 更新结果 (Success)
 */
export const runCascadePattern = <
  Sh extends Logix.AnyModuleShape,
  R,
  T,
  Data
>(
  $: Logix.BoundApi<Sh, R>,
  config: {
    /** 监听的上游字段 */
    source: (s: Logix.StateOf<Sh>) => T | undefined | null
    /** 数据加载器（运行在 Logic.Env<Sh,R> 上，错误通道为 never） */
    loader: (val: T) => Logix.Logic.Of<Sh, R, Data, never>
    /** 重置下游字段的回调 (同步) */
    onReset: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>
    /** 加载成功的回调 (同步) */
    onSuccess: (prev: Logix.StateOf<Sh>, data: Data) => Logix.StateOf<Sh>
    /** (可选) Loading 状态回调 */
    onLoading?: (prev: Logix.StateOf<Sh>, isLoading: boolean) => Logix.StateOf<Sh>
  }
) => {
  return $.onState(config.source).runLatest((val: T | undefined | null) =>
    Effect.gen(function* () {
      // 1. 立即重置下游
      yield* $.state.update(config.onReset)

      if (val === undefined || val === null) return

      // 2. 标记 Loading (如果提供了回调)
      if (config.onLoading) {
        yield* $.state.update((s: Logix.StateOf<Sh>) => config.onLoading!(s, true))
      }

      // 3. 加载数据
      // 注意：这里没有显式处理 Error，假设由 loader 自行处理或冒泡
      // 在更完善的 Pattern 中，可以增加 onError 回调
      const data = yield* config.loader(val)

      // 4. 更新结果并关闭 Loading
      yield* $.state.update((s: Logix.StateOf<Sh>) => {
        let next = config.onSuccess(s, data)
        if (config.onLoading) {
          next = config.onLoading(next, false)
        }
        return next
      })
    })
  )
}
