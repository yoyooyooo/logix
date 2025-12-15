import React from "react"
import { Context, Effect, Layer, ManagedRuntime } from "effect"
import { RuntimeProvider, useModule, useRuntime } from "@logix/react"
import * as Logix from "@logix/core"
import { StepCounterModule, StepCounterImpl } from "../modules/stepCounter"

interface StepConfig {
  readonly step: number
}

const StepConfigTag = Context.GenericTag<StepConfig>("@examples/StepConfig")

const BaseStepLayer = Layer.succeed(StepConfigTag, { step: 1 })
const BigStepLayer = Layer.succeed(StepConfigTag, { step: 5 })

const appRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    Logix.Debug.runtimeLabel("LayerOverrideDemo"),
    Logix.Debug.devtoolsHubLayer(),
    StepCounterImpl.layer,
  ),
)

const StepCounterPanel: React.FC<{ label: string }> = ({ label }) => {
  const runtime = useRuntime()
  const value = useModule(StepCounterModule, (s) => s.value)

  const handleStepIncrement = React.useCallback(() => {
    void runtime.runPromise(
      Effect.gen(function* () {
        const cfg = yield* StepConfigTag
        const counter = yield* StepCounterModule
        for (let i = 0; i < cfg.step; i++) {
          yield* counter.dispatch({ _tag: "inc", payload: undefined })
        }
      }),
    )
  }, [runtime])

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Step 配置来自当前 <code className="font-mono">RuntimeProvider.layer</code>
          </span>
        </div>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
          StepCounterModule
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">当前值</span>
        <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
          {value}
        </span>
      </div>

      <button
        type="button"
        className="w-full px-3 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700 active:bg-sky-800 transition-all active:scale-95 shadow-sm shadow-sky-600/20"
        onClick={handleStepIncrement}
      >
        根据 Step 增加（当前 Step 由 Env 决定）
      </button>
    </div>
  )
}

export const LayerOverrideDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={appRuntime} layer={BaseStepLayer}>
      <div className="space-y-8">
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            RuntimeProvider.layer · Env 差异化示例
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            该示例展示了使用 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">RuntimeProvider.layer</code>{" "}
            为不同子树提供差异化的 Env。两个区域共享同一个{" "}
            <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">StepCounterModule</code>{" "}
            实例，但读取到的 <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">StepConfig</code>{" "}
            不同，从而表现出不同的“步长”。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StepCounterPanel label="根 Provider · Step = 1" />

          <RuntimeProvider layer={BigStepLayer}>
            <StepCounterPanel label="嵌套 Provider · Step = 5" />
          </RuntimeProvider>
        </div>
      </div>
    </RuntimeProvider>
  )
}
