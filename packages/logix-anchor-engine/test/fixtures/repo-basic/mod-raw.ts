import * as Logix from '@logixjs/core'

const id = 'dynamic'
const def = { services: {} }

export const Raw1 = Logix.Module.make(id, { services: {} })
export const Raw2 = Logix.Module.make('raw2', def)

