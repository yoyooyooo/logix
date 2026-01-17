import { useMemo } from 'react'
import { useRuntime } from './useRuntime.js'
import type { ActionOfHandle, ReactModuleHandle } from './useModuleRuntime.js'
import { useModuleRuntime } from './useModuleRuntime.js'
import type { Dispatch } from '../store/ModuleRef.js'

export function useDispatch<H extends ReactModuleHandle>(handle: H): Dispatch<ActionOfHandle<H>> {
  const runtime = useRuntime()
  const moduleRuntime = useModuleRuntime(handle)

  return useMemo(() => {
    const base = (action: ActionOfHandle<H>) => {
      runtime.runFork(moduleRuntime.dispatch(action))
    }

    return Object.assign(base, {
      batch: (actions: ReadonlyArray<ActionOfHandle<H>>) => {
        runtime.runFork(moduleRuntime.dispatchBatch(actions))
      },
      lowPriority: (action: ActionOfHandle<H>) => {
        runtime.runFork(moduleRuntime.dispatchLowPriority(action))
      },
    })
  }, [runtime, moduleRuntime])
}
