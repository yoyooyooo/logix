import * as Logix from '@logix/core'
import { ReactPlatformLayer } from '@logix/react'

import { CounterImpl } from './counter'

export const appRuntime = Logix.Runtime.make(CounterImpl, {
  label: 'studio-fe',
  layer: ReactPlatformLayer,
})
