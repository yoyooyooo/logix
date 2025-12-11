import { useMemo } from "react"
import * as Logix from "@logix/core"
import { useRuntime } from "../components/RuntimeProvider.js"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"

// 根据句柄推导 Action 类型：支持 ModuleRuntime 与 ModuleInstance（Tag）
type ActionOfHandle<H> = H extends Logix.ModuleRuntime<any, infer A>
  ? A
  : H extends Logix.ModuleInstance<any, infer Sh>
    ? Logix.ActionOf<Sh>
    : never

export function useDispatch<H extends ReactModuleHandle>(
  handle: H
): (action: ActionOfHandle<H>) => void {
  const runtime = useRuntime()
  const moduleRuntime = useModuleRuntime(handle)

  return useMemo(
    () => (action: ActionOfHandle<H>) => {
      runtime.runFork(
        (moduleRuntime.dispatch as (a: ActionOfHandle<H>) => any)(action)
      )
    },
    [runtime, moduleRuntime]
  )
}
