import * as Logix from '@logix/core'

import { SpeckitRuntimeLayer } from './layer'
import { SpeckitRootModule } from './root.impl'

export const appRuntime = Logix.Runtime.make(SpeckitRootModule, {
  label: 'SpeckitKanban',
  layer: SpeckitRuntimeLayer,
})

