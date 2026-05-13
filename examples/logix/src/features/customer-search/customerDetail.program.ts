import * as Logix from '@logixjs/core'
import { programLayer } from '../../runtime/programLayer.js'
import { CustomerDetail } from './customerDetail.def.js'
import { CustomerDetailLogic } from './customerDetail.logic.js'

export const CustomerDetailProgram = Logix.Program.make(CustomerDetail, {
  initial: {
    selected: undefined,
  },
  logics: [CustomerDetailLogic],
})

export const CustomerDetailLayer = programLayer(CustomerDetailProgram)
