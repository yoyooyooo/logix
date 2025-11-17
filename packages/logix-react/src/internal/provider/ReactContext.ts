import { createContext } from 'react'
import type { ReactConfigSnapshot } from './config.js'
import type { ResolvedRuntimeProviderPolicy } from './policy.js'
import type { ManagedRuntime } from 'effect'

export interface ReactRuntimeContextValue {
  /**
   * The "effective runtime" available to the current Provider subtree:
   * - Applies Env/Scope overrides from RuntimeProvider.layer (and ancestor Provider layers).
   * - The reference is stable within the same Provider subtree, enabling cross-component sharing (e.g. ModuleCache).
   */
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly reactConfigSnapshot: ReactConfigSnapshot
  readonly configVersion: number
  readonly policy: ResolvedRuntimeProviderPolicy
}

export const RuntimeContext = createContext<ReactRuntimeContextValue | null>(null)
