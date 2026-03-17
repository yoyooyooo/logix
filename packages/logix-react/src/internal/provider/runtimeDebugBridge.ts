import { Effect, ManagedRuntime } from 'effect'
import * as Logix from '@logixjs/core'
import { isDevEnv } from './env.js'

export const readRuntimeDiagnosticsLevel = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
): Logix.Debug.DiagnosticsLevel => {
  try {
    return runtime.runSync(Effect.service(Logix.Debug.internal.currentDiagnosticsLevel).pipe(Effect.orDie))
  } catch {
    return isDevEnv() ? 'light' : 'off'
  }
}

export const emitRuntimeDebugEventBestEffort = (
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  event: Effect.Effect<void, never, never>,
): void => {
  runtime.runFork(event)
}
