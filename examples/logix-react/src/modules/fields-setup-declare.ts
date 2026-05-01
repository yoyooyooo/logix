import { Effect, Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '@logixjs/core'

// Demo: 023 Logic fields in declaration root
// - Module 不声明 module-level fields；
// - Logic builder 的同步声明区通过 `$.fields(...)` 贡献 field declarations；
// - Runtime 当前仍通过既有 runtime kernel 承接执行。

export const FieldsSetupDeclareStateSchema = Schema.Struct({
  base: Schema.Number,
  derived: Schema.Number,
})

export const FieldsSetupDeclareActions = {
  'base/set': Schema.Number,
}

export type FieldsSetupDeclareShape = Logix.Module.Shape<
  typeof FieldsSetupDeclareStateSchema,
  typeof FieldsSetupDeclareActions
>

export const FieldsSetupDeclareFields = FieldContracts.fieldFrom(FieldsSetupDeclareStateSchema)({
  derived: FieldContracts.fieldComputed({
    deps: ['base'],
    get: (base) => base + 1,
  }),
})

export const FieldsSetupDeclare = Logix.Module.make('FieldsSetupDeclareModule', {
  state: FieldsSetupDeclareStateSchema,
  actions: FieldsSetupDeclareActions,
})

export const FieldsSetupDeclareLogic = FieldsSetupDeclare.logic('fields-setup-declare-logic', ($) => {
  $.fields(FieldsSetupDeclareFields)

  return Effect.gen(function* () {
    yield* $.onAction('base/set').mutate((state, action) => {
      state.base = action.payload
    })
  })
})

export const FieldsSetupDeclareProgram = Logix.Program.make(FieldsSetupDeclare, {
  initial: { base: 0, derived: 1 },
  logics: [FieldsSetupDeclareLogic],
})
