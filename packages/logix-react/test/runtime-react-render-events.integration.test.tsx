// @vitest-environment happy-dom

import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"
import {
  RuntimeProvider,
  useModule,
  useSelector,
  useDispatch,
} from "../src/index.js"

const Counter = Logix.Module.make("ReactRenderCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const Impl = Counter.implement({
  initial: { count: 0 },
})

describe("@logix/react · react-render Debug events", () => {
  it("emits kind = \"react-render\" RuntimeDebugEventRef with selector metadata", async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const runtime = Logix.Runtime.make(Impl, {
      layer: debugLayer,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    // 为测试挂上带有 debugKey/fieldPaths 元信息的 selector，
    // 便于在 Debug 事件 meta 中验证这些字段是否被透传。
    const selectCount = Object.assign(
      (state: { count: number }) => state.count,
      {
        debugKey: "countSelector",
        fieldPaths: ["count"],
      },
    )

    const { result } = renderHook(
      () => {
        const runtimeHandle = useModule(Impl.module)
        const value = useSelector(runtimeHandle, selectCount)
        const dispatch = useDispatch(runtimeHandle)
        return { value, dispatch }
      },
      { wrapper },
    )

    // 通过一次 inc 派发触发状态更新与重新渲染，
    // 再等待一小段时间让 Debug 事件通过 runtime.runFork 落入 sink。
    await act(async () => {
      await runtime.runPromise(
        Effect.gen(function* () {
          result.current.dispatch({
            _tag: "inc",
            payload: undefined,
          } as any)
          yield* Effect.sleep(10)
        }),
      )
    })

    // 将收集到的 Debug.Event 归一化为 RuntimeDebugEventRef，
    // 验证存在 kind = "react-render" 的事件，并检查其 meta 结构。
    const refs = events
      .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
      .filter(
        (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
          ref != null && ref.kind === "react-render",
      )

    expect(refs.length).toBeGreaterThan(0)

    const renderEvent = refs[refs.length - 1]
    expect(renderEvent.kind).toBe("react-render")

    const meta = renderEvent.meta as any
    expect(meta).toBeDefined()
    expect(typeof meta.componentLabel).toBe("string")
    expect(meta.selectorKey === "countSelector" || meta.selectorKey === "selectCount").toBe(
      true,
    )
    expect(meta.fieldPaths).toEqual(["count"])
  })

  it("still emits react-render events in production when devtools is explicitly enabled", async () => {
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"

    try {
      Logix.Debug.clearDevtoolsEvents()

      const runtimeLabel = "ProdReactRenderRuntime"
      const runtime = Logix.Runtime.make(Impl, {
        label: runtimeLabel,
        devtools: true,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      )

      const { result } = renderHook(
        () => {
          const runtimeHandle = useModule(Impl.module)
          const value = useSelector(runtimeHandle, (s) => (s as any).count)
          const dispatch = useDispatch(runtimeHandle)
          return { value, dispatch }
        },
        { wrapper },
      )

      await act(async () => {
        await runtime.runPromise(
          Effect.gen(function* () {
            result.current.dispatch({
              _tag: "inc",
              payload: undefined,
            } as any)
            yield* Effect.sleep(10)
          }),
        )
      })

      const refs = Logix.Debug.getDevtoolsSnapshot().events
        .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
        .filter(
          (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
            ref != null &&
            ref.kind === "react-render" &&
            ref.runtimeLabel === runtimeLabel,
        )

      expect(refs.length).toBeGreaterThan(0)
    } finally {
      process.env.NODE_ENV = prevEnv
    }
  })
})
