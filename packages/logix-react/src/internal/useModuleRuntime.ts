import { useMemo } from "react"
import { Logix } from "@logix/core"
import { Effect } from "effect"
import { useRuntime } from "../components/RuntimeProvider.js"

const isModuleRuntime = (
  value: unknown
): value is Logix.ModuleRuntime<any, any> =>
  typeof value === "object" && value !== null && "dispatch" in value && "getState" in value

export type ReactModuleHandle =
  | Logix.ModuleRuntime<any, any>
  | Logix.ModuleInstance<any, any>

export function useModuleRuntime<Sh extends Logix.AnyModuleShape>(
  handle: ReactModuleHandle
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  const runtime = useRuntime()

  return useMemo(() => {
    if (isModuleRuntime(handle)) {
      return handle as Logix.ModuleRuntime<
        Logix.StateOf<Sh>,
        Logix.ActionOf<Sh>
      >
    }

    // Here `handle` is a ModuleInstance Tag. Tags in Effect also behave as
    // Effects yielding their service, so we can run them inside the
    // ManagedRuntime to obtain the bound ModuleRuntime instance.
    return runtime.runSync(
      handle as unknown as Effect.Effect<
        Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
        never,
        any
      >
    )
  }, [runtime, handle])
}
