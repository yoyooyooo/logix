import { expect, test } from "vitest"
import React from "react"
import { render } from "vitest-browser-react"
import { Effect, Layer, ManagedRuntime, Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider } from "../../src/components/RuntimeProvider.js"
import { useModule } from "../../src/hooks/useModule.js"

const PerfState = Schema.Struct({
  value: Schema.Number,
})

const PerfActions = {
  inc: Schema.Void,
}

const PerfModule = Logix.Module.make("PerfBrowserCounter", {
  state: PerfState,
  actions: PerfActions,
})

const makePerfLogic = (watcherCount: number) =>
  PerfModule.logic(($) =>
    Effect.gen(function* () {
      // 在单个 Logic 内挂载 watcherCount 条 onAction watcher，模拟高规则数量场景
      for (let i = 0; i < watcherCount; i++) {
        yield* $.onAction("inc").runParallelFork(
          $.state.update((prev) => ({
            ...prev,
            value: prev.value + 1,
          })),
        )
      }
    }),
  )

const PerfApp: React.FC = () => {
  const perf = useModule(PerfModule)
  const value = useModule(perf, (s) => (s as { value: number }).value)

  return (
    <div>
      <p>Value: {value}</p>
      <button
        type="button"
        onClick={() => perf.actions.inc()}
      >
        Increment
      </button>
    </div>
  )
}

// 预设几个 watcher 数量档位，用于在真实浏览器中测量「一次点击 → DOM 更新」的端到端延迟。
// 你可以在本地跑这条用例，观察控制台输出的 ms 曲线，再结合主观体验选一个“肉眼可感慢”的临界值。
const WATCHER_LEVELS = [1, 8, 32, 64, 128, 256, 512]

test("browser watcher latency baseline: click-to-paint under different watcher counts", async () => {
  const results: Array<{ watchers: number; samples: number[]; avg: number }> = []

  for (const watcherCount of WATCHER_LEVELS) {
    const samples: number[] = []

    // 每个档位测几次，平滑偶然抖动
    const RUNS = 3

    for (let run = 0; run < RUNS; run++) {
      const layer = PerfModule.live(
        { value: 0 },
        makePerfLogic(watcherCount),
      )

      const runtime = ManagedRuntime.make(
        layer as Layer.Layer<any, never, never>,
      )

      const screen = await render(
        <React.StrictMode>
          <RuntimeProvider runtime={runtime}>
            <PerfApp />
          </RuntimeProvider>
        </React.StrictMode>,
      )

      await expect
        .element(screen.getByText("Value: 0"))
        .toBeInTheDocument()

      const button = screen.getByRole("button", { name: "Increment" })

      const start = performance.now()
      await button.click()
      // 一次点击后，期望最终 Value === watcherCount（每条 watcher +1）
      await expect
        .element(screen.getByText(`Value: ${watcherCount}`))
        .toBeInTheDocument()
      const end = performance.now()

      samples.push(end - start)

      // 清理本轮渲染，避免多轮测量时 DOM 中残留多个按钮导致 strict mode 定位冲突
      screen.unmount()
    }

    const avg =
      samples.reduce((acc, v) => acc + v, 0) / (samples.length || 1)

    results.push({ watchers: watcherCount, samples, avg })
  }

  // 打印一份人类可读的基线报告，方便你在本地或 CI 输出中查看。
  // 建议以 50–100ms 作为“肉眼明显可感”的区间，根据你的机器情况挑一个 watcherCount 作为上限基线。
  // eslint-disable-next-line no-console
  console.log(
    "[logix-react][watcher-latency-baseline]",
    results.map((r) => ({
      watchers: r.watchers,
      avgMs: Number(r.avg.toFixed(1)),
      samplesMs: r.samples.map((s) => Number(s.toFixed(1))),
    })),
  )
})
