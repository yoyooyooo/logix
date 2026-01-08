import * as Logix from '@logixjs/core'
import { ReactPlatformLayer } from '@logixjs/react'

import { CounterImpl } from './counter'

export const appRuntime = Logix.Runtime.make(CounterImpl, {
  label: 'studio-fe',
  layer: ReactPlatformLayer,
})
