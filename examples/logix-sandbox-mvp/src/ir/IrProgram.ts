import * as Logix from '@logixjs/core'
import { IrDef, IrInitialState } from './IrModule'
import { IrLogic } from './IrLogic'

export const IrProgram = Logix.Program.make(IrDef, {
  initial: IrInitialState,
  logics: [IrLogic],
})
