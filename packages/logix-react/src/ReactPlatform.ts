import { ManagedRuntime } from 'effect'
import { RuntimeProvider } from './RuntimeProvider.js'
import { useDispatch, useLocalModule, useModule, useSelector } from './Hooks.js'
import React from 'react'

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
   * The caller is responsible for constructing and managing the Runtime lifecycle
   * (typically via Logix.Runtime.make). ReactPlatform only provides that Runtime within the React tree.
   */
  createRoot: (runtime: ManagedRuntime.ManagedRuntime<any, any>) => {
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(RuntimeProvider, {
        runtime: runtime as ManagedRuntime.ManagedRuntime<any, any>,
        children,
      })
    }
  },
}
