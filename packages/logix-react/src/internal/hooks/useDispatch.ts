import { useMemo } from 'react'
import * as Logix from '@logix/core'
import { useRuntime } from './useRuntime.js'
import { ReactModuleHandle, useModuleRuntime } from './useModuleRuntime.js'
import type { Dispatch, ModuleRef } from '../store/ModuleRef.js'

// Infers the Action type from the handle: supports ModuleRuntime and ModuleTag (Tag).
type ActionOfHandle<H> =
  H extends ModuleRef<any, infer A>
    ? A
    : H extends Logix.ModuleRuntime<any, infer A>
      ? A
      : H extends Logix.ModuleTagType<any, infer Sh>
        ? Logix.ActionOf<Sh>
        : never

export function useDispatch<H extends ReactModuleHandle>(handle: H): Dispatch<ActionOfHandle<H>> {
  const runtime = useRuntime()
  const moduleRuntime = useModuleRuntime(handle)

  return useMemo(() => {
    const base = (action: ActionOfHandle<H>) => {
      runtime.runFork((moduleRuntime.dispatch as (a: ActionOfHandle<H>) => any)(action))
    }

    return Object.assign(base, {
      batch: (actions: ReadonlyArray<ActionOfHandle<H>>) => {
        runtime.runFork((moduleRuntime.dispatchBatch as (a: ReadonlyArray<ActionOfHandle<H>>) => any)(actions))
      },
      lowPriority: (action: ActionOfHandle<H>) => {
        runtime.runFork((moduleRuntime.dispatchLowPriority as (a: ActionOfHandle<H>) => any)(action))
      },
    })
  }, [runtime, moduleRuntime])
}
