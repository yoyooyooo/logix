import * as Logix from '@logixjs/core'
import { programLayer } from '../../runtime/programLayer.js'
import { CustomerSearch } from './customerSearch.def.js'
import { CustomerSearchLogic } from './customerSearch.logic.js'
import type { CustomerApiTag } from './service.js'

export const CustomerSearchProgram = Logix.Program.make(CustomerSearch, {
  initial: {
    keyword: '',
    results: [],
    isSearching: false,
    errorMessage: undefined,
  },
  logics: [CustomerSearchLogic],
})

export const CustomerSearchLayer = programLayer(CustomerSearchProgram)
