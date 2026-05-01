import { Schema } from 'effect'
import { setModuleFieldsProgram } from './runtimeInternalsAccessor.js'
import * as ModuleFieldsRegistry from '../../debug/ModuleFieldsRegistry.js'
import { build as buildFieldProgram } from '../../field-kernel/build.js'
import type { FieldProgram, FieldSpec } from '../../field-kernel/model.js'
import type { AnyModuleShape, ModuleTag } from './module.js'

const MODULE_FIELDS_EXPERT_STATE = Symbol.for('@logixjs/core/moduleFieldsExpertState')

type ModuleLevelContribution = {
  readonly fields: FieldSpec<any>
  readonly baseProgram: FieldProgram<any>
}

type ModuleFieldsExpertState = {
  readonly stateSchema: Schema.Schema<any>
  readonly moduleLevel: Array<ModuleLevelContribution>
}

const getOrCreateState = <Id extends string, Sh extends AnyModuleShape>(args: {
  readonly id: Id
  readonly moduleTag: ModuleTag<Id, Sh>
  readonly stateSchema: Schema.Schema<any>
}): ModuleFieldsExpertState => {
  const existing = (args.moduleTag as any)[MODULE_FIELDS_EXPERT_STATE] as ModuleFieldsExpertState | undefined
  if (existing) {
    return existing
  }

  const created: ModuleFieldsExpertState = {
    stateSchema: args.stateSchema,
    moduleLevel: [],
  }

  Object.defineProperty(args.moduleTag as any, MODULE_FIELDS_EXPERT_STATE, {
    value: created,
    enumerable: false,
    configurable: true,
  })

  return created
}

export const listModuleLevelFieldContributions = <Id extends string, Sh extends AnyModuleShape>(
  moduleTag: ModuleTag<Id, Sh>,
): ReadonlyArray<ModuleLevelContribution> => {
  const state = (moduleTag as any)[MODULE_FIELDS_EXPERT_STATE] as ModuleFieldsExpertState | undefined
  return state?.moduleLevel ?? []
}

export const ensureModuleFieldsFinalizePath = <Id extends string, Sh extends AnyModuleShape>(args: {
  readonly id: Id
  readonly moduleTag: ModuleTag<Id, Sh>
  readonly stateSchema: Schema.Schema<any>
}): void => {
  getOrCreateState(args)
}

export const installModuleFieldsExpertPath = <Id extends string, Sh extends AnyModuleShape>(args: {
  readonly id: Id
  readonly moduleTag: ModuleTag<Id, Sh>
  readonly stateSchema: Schema.Schema<any>
  readonly fields: FieldSpec<any>
}): void => {
  const state = getOrCreateState(args)
  const baseProgram = buildFieldProgram(args.stateSchema as any, args.fields as any)

  setModuleFieldsProgram(args.moduleTag as any, baseProgram)
  ModuleFieldsRegistry.registerModuleProgram(args.id, baseProgram as FieldProgram<any>)

  state.moduleLevel.push({
    fields: args.fields,
    baseProgram,
  })
}
