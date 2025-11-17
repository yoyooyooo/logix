import { IrDef, IrInitialState } from './IrModule'
import { IrLogic } from './IrLogic'

export const IrModule = IrDef.implement({
  initial: IrInitialState,
  logics: [IrLogic],
})

export const IrImpl = IrModule.impl
