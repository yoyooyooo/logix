import { ManagedRuntime } from "effect"
import { RuntimeProvider } from "./components/RuntimeProvider.js"
import { useModule } from "./hooks/useModule.js"
import { useLocalModule } from "./hooks/useLocalModule.js"
import { useSelector } from "./hooks/useSelector.js"
import { useDispatch } from "./hooks/useDispatch.js"
import React from "react"

export const ReactPlatform = {
  /**
   * Creates a React component that provides the Logix runtime to its children.
   */
  Provider: RuntimeProvider,

  /**
   * Hook to use a module from the provided runtime.
   */
  useModule,

  /**
   * Hook to create and use a local module instance.
   */
  useLocalModule,

  /**
   * Hook to select a slice of state from a module.
   */
  useSelector,

  /**
   * Hook to get the dispatch function for a module.
   */
  useDispatch,

  /**
   * Creates a root provider component for a given runtime.
   *
   * 调用方负责构造并管理 Runtime 的生命周期（通常通过 Logix.Runtime.make），
   * ReactPlatform 只负责在 React 树中提供该 Runtime。
  */
  createRoot: (runtime: ManagedRuntime.ManagedRuntime<any, any>) => {
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(RuntimeProvider, {
        runtime: runtime as ManagedRuntime.ManagedRuntime<any, any>,
        children,
      })
    }
  }
}
