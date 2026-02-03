import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

const base = {
  state: Schema.Struct({}),
  actions: {},
} as const

export const ModRewriteAmbiguous = Logix.Module.make('rewriteAmbiguous', {
  ...base,
})

