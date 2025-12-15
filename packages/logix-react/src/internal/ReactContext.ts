import { createContext } from "react"
import type { ReactConfigSnapshot } from "./config.js"
import type { ManagedRuntime } from "effect"

export interface ReactRuntimeContextValue {
  /**
   * 当前 Provider 子树可用的“有效 runtime”：
   * - 已应用 RuntimeProvider.layer（及其祖先 Provider 的 layer）带来的 Env/Scope 覆盖；
   * - 引用在同一 Provider 子树内保持稳定，用于 ModuleCache 等需要跨组件共享的场景。
   */
  readonly runtime: ManagedRuntime.ManagedRuntime<any, any>
  readonly reactConfigSnapshot: ReactConfigSnapshot
  readonly configVersion: number
}

export const RuntimeContext = createContext<ReactRuntimeContextValue | null>(null)
