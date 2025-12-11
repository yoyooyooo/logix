import { useCallback } from "react"
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector"
import * as Logix from "@logix/core"
import { Effect, Stream, Fiber } from "effect"
import { useRuntime } from "../components/RuntimeProvider.js"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"

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

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    actualSelector,
    equalityFn
  )
}
