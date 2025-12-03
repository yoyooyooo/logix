import { useMemo } from "react"
import { Logix } from "@logix/core"
import { useRuntime } from "../components/RuntimeProvider.js"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"

export function useDispatch<Sh extends Logix.AnyModuleShape>(
  handle: ReactModuleHandle
): (action: Logix.ActionOf<Sh>) => void {
  const runtime = useRuntime()
  const moduleRuntime = useModuleRuntime(handle)

  return useMemo(
    () => (action: Logix.ActionOf<Sh>) => {
      runtime.runFork(moduleRuntime.dispatch(action))
    },
    [runtime, moduleRuntime]
  )
}
