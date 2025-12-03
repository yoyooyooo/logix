import { createContext } from "react"
import type { Context, ManagedRuntime } from "effect"

export interface ReactRuntimeContextValue {
  readonly runtime: ManagedRuntime.ManagedRuntime<never, any>
  readonly contexts: ReadonlyArray<Context.Context<any>>
}

export const RuntimeContext = createContext<ReactRuntimeContextValue | null>(null)
