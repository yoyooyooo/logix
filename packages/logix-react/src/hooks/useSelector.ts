import { useCallback, useEffect } from "react"
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector"
import * as Logix from "@logix/core"
import { Effect, Stream, Fiber } from "effect"
import { useRuntime } from "../components/RuntimeProvider.js"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"
import { isDevEnv } from "../internal/env.js"

// 推导句柄对应的 State 类型：既支持 ModuleRuntime，也支持 ModuleInstance（Tag）
type StateOfHandle<H> = H extends Logix.ModuleRuntime<infer S, any>
  ? S
  : H extends Logix.ModuleInstance<any, infer Sh>
    ? Logix.StateOf<Sh>
    : never

export function useSelector<H extends ReactModuleHandle>(
  handle: H
): StateOfHandle<H>

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: (state: StateOfHandle<H>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector?: (state: StateOfHandle<H>) => V,
  equalityFn: (previous: V, next: V) => boolean = Object.is
): V | StateOfHandle<H> {
  const runtime = useRuntime()
  const moduleRuntime = useModuleRuntime(handle)

  const actualSelector: (state: StateOfHandle<H>) => V =
    (selector ??
      ((state: StateOfHandle<H>) => state as unknown as V))

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const fiber = runtime.runFork(
        Stream.runForEach(
          moduleRuntime.changes((state) => state),
          () => Effect.sync(onStoreChange)
        )
      )
      return () => {
        runtime.runFork(Fiber.interrupt(fiber))
      }
    },
    [runtime, moduleRuntime]
  )

  const getSnapshot = useCallback(
    () =>
      runtime.runSync(
        moduleRuntime.getState as Effect.Effect<StateOfHandle<H>, never, any>
      ),
    [runtime, moduleRuntime]
  )

  const selected = useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    actualSelector,
    equalityFn
  )

  // 在 React 渲染完成后发出一条 trace:react-render Debug 事件：
  // - 仅在 dev/test 环境启用，以避免在生产环境引入额外开销；
  // - 事件通过 DebugSink → RuntimeDebugEventRef 标准化后供 Devtools 消费。
  useEffect(() => {
    if (!isDevEnv() && !Logix.Debug.isDevtoolsEnabled()) {
      return
    }

    // 仅当当前 Runtime 提供 id 时才记录渲染事件，
    // 便于在 Devtools 中按 runtimeId 聚合。
    const runtimeId = (moduleRuntime as any).id as string | undefined
    if (!runtimeId) {
      return
    }

    const selectorFn = selector as any
    const fieldPaths: ReadonlyArray<string> | undefined =
      selectorFn && Array.isArray(selectorFn.fieldPaths)
        ? selectorFn.fieldPaths.slice()
        : undefined

    const selectorKey: string | undefined =
      (selectorFn && typeof selectorFn.debugKey === "string" && selectorFn.debugKey.length > 0
        ? selectorFn.debugKey
        : undefined) ??
      (typeof selectorFn === "function" &&
      typeof selectorFn.name === "string" &&
      selectorFn.name.length > 0
        ? selectorFn.name
        : undefined)

    const effect = Logix.Debug.record({
      type: "trace:react-render",
      moduleId: (moduleRuntime as any).moduleId,
      runtimeId,
      data: {
        componentLabel: "useSelector",
        selectorKey,
        fieldPaths,
        strictModePhase: "render",
      },
    }) as Effect.Effect<void, never, any>

    runtime.runFork(effect)
  }, [runtime, moduleRuntime, selector, selected])

  return selected
}
