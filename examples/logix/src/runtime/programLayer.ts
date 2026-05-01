import type { Layer } from 'effect'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'

export const programLayer = (program: RuntimeContracts.AnyProgram): Layer.Layer<any, any, any> =>
  RuntimeContracts.getProgramRuntimeBlueprint(program).layer
