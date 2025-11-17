import React, { useSyncExternalStore } from 'react'
import { Effect, Fiber, Stream } from 'effect'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../state/index.js'

const subscribe = (onStoreChange: () => void) => {
  const fiber = devtoolsRuntime.runFork(
    Stream.runForEach(
      devtoolsModuleRuntime.changes((state) => state),
      () => Effect.sync(onStoreChange),
    ),
  )
  return () => {
    devtoolsRuntime.runFork(Fiber.interrupt(fiber))
  }
}

const getSnapshot = () =>
  devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as Effect.Effect<DevtoolsState, never, any>)

export const useDevtoolsState = (): DevtoolsState => {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as DevtoolsState
}

export const useDevtoolsDispatch = () => {
  const dispatch = React.useCallback((action: any) => {
    devtoolsRuntime.runFork(devtoolsModuleRuntime.dispatch(action) as Effect.Effect<any, any, any>)
  }, [])
  return dispatch
}
