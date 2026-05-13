import * as Logix from '@logixjs/core'

import { SpeckitRuntimeLayer } from './layer'
import { SpeckitRootProgram } from './root.program'

export const appRuntime = Logix.Runtime.make(SpeckitRootProgram, {
  label: 'SpeckitKanban',
  layer: SpeckitRuntimeLayer,
})
