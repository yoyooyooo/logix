import { Layer } from 'effect'
import type {
  AnyModuleShape,
  ProgramStateTransactionOptions,
  ModuleLogic,
  StateOf,
} from './internal/module.js'
import { attachProgramAssemblyIssues } from './internal/program.js'
import { normalizeProgramImports } from './internal/authoring/programImports.js'
import { assembleProgram, type AnyProgram, type Module, type Program as ProgramType } from './Module.js'

export type ProgramServiceLayer = Layer.Layer<any, never, any>
export type ProgramImportEntry = AnyProgram

export interface ProgramCapabilities {
  readonly services?: ProgramServiceLayer | ReadonlyArray<ProgramServiceLayer>
  readonly imports?: ReadonlyArray<ProgramImportEntry>
}

export interface Config<Sh extends AnyModuleShape, R = never> {
  readonly initial: StateOf<Sh>
  readonly capabilities?: ProgramCapabilities
  readonly logics?: Array<ModuleLogic<Sh, R, any>>
  readonly stateTransaction?: ProgramStateTransactionOptions
}

export type Program<Id extends string, Sh extends AnyModuleShape, Ext extends object = {}, R = never> = ProgramType<
  Id,
  Sh,
  Ext,
  R
>

const normalizeServiceLayers = (
  value: ProgramServiceLayer | ReadonlyArray<ProgramServiceLayer> | undefined,
): ReadonlyArray<ProgramServiceLayer> => {
  if (value === undefined) return []
  if (Array.isArray(value)) {
    return value as ReadonlyArray<ProgramServiceLayer>
  }
  return [value as ProgramServiceLayer]
}

const normalizeConfig = <Sh extends AnyModuleShape, R = never>(config: Config<Sh, R>) => {
  const capabilities = config.capabilities
  const importResult = normalizeProgramImports(capabilities?.imports)
  const serviceLayers = normalizeServiceLayers(capabilities?.services)

  return {
    initial: config.initial,
    logics: config.logics,
    imports: importResult.imports,
    serviceLayers: serviceLayers.length > 0 ? serviceLayers : undefined,
    assemblyIssues: importResult.issues,
    stateTransaction: config.stateTransaction,
  } as const
}

export const make = <Id extends string, Sh extends AnyModuleShape, Ext extends object = {}, R = never>(
  module: Module<Id, Sh, Ext>,
  config: Config<Sh, R>,
): ProgramType<Id, Sh, Ext, R> => {
  // Program.make is the canonical public assembly path. It absorbs capability sugar
  // and top-level imports into one normalized contract.
  const normalized = normalizeConfig(config)

  const program = assembleProgram(module, {
    initial: normalized.initial,
    logics: normalized.logics,
    imports: normalized.imports,
    serviceLayers: normalized.serviceLayers,
    stateTransaction: normalized.stateTransaction,
  })

  return attachProgramAssemblyIssues(program as AnyProgram, normalized.assemblyIssues) as ProgramType<Id, Sh, Ext, R>
}
