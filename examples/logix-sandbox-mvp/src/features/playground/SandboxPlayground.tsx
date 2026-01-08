import React, { useEffect } from 'react'
import { useDispatch, useModule } from '@logixjs/react'
import { SandboxDef } from '../../modules/SandboxModule'
import type { SandboxRuntime } from '../../modules/SandboxRuntime'
import { SandboxPlaygroundView } from './SandboxPlaygroundView'

export function SandboxPlayground() {
  const runtime: SandboxRuntime = useModule(SandboxDef)
  const dispatch = useDispatch(runtime)

  useEffect(() => {
    dispatch({ _tag: 'init', payload: undefined })
  }, [dispatch])

  return <SandboxPlaygroundView runtime={runtime} />
}
