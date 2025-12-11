import { createContext } from "react"
import type { Context, LogLevel, ManagedRuntime, Scope } from "effect"
import type * as HashSet from "effect/HashSet"
import type * as Logger from "effect/Logger"
import type { ReactConfigSnapshot } from "./config.js"
import type * as Debug from "@logix/core/Debug"

// Logger set captured from FiberRef.currentLoggers for each provider layer.
type LoggerSet = HashSet.HashSet<Logger.Logger<unknown, any>>

export interface ReactRuntimeContextValue {
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly contexts: ReadonlyArray<Context.Context<any>>
  readonly scopes: ReadonlyArray<Scope.Scope>
  readonly loggers: ReadonlyArray<LoggerSet> // runtime logger sets in order
  readonly logLevels: ReadonlyArray<LogLevel.LogLevel>
  readonly debugSinks: ReadonlyArray<ReadonlyArray<Debug.Sink>>
  readonly reactConfigSnapshot: ReactConfigSnapshot
  readonly configVersion: number
}

export const RuntimeContext = createContext<ReactRuntimeContextValue | null>(null)
