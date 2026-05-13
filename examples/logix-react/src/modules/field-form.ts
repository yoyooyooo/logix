import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'

// ToB 场景 1：表单脏标记与合法性由字段行为管理

export const FieldFormStateSchema = Schema.Struct({
  form: Schema.Struct({
    name: Schema.String,
    email: Schema.String,
  }),
  baseline: Schema.Struct({
    name: Schema.String,
    email: Schema.String,
  }),
  meta: Schema.Struct({
    dirtyCount: Schema.Number,
    isDirty: Schema.Boolean,
  }),
})

export type FieldFormState = Schema.Schema.Type<typeof FieldFormStateSchema>

export const FieldFormActions = {
  changeName: Schema.String,
  changeEmail: Schema.String,
  reset: Schema.Void,
}

// Field declarations：基于 baseline 与 form 计算脏标记
export const FieldFormFields = FieldContracts.fieldFrom(FieldFormStateSchema)({
  'meta.dirtyCount': FieldContracts.fieldComputed({
    deps: ['form.name', 'form.email', 'baseline.name', 'baseline.email'],
    get: (formName, formEmail, baselineName, baselineEmail) => {
      let count = 0
      if (formName !== baselineName) count++
      if (formEmail !== baselineEmail) count++
      return count
    },
  }),
  'meta.isDirty': FieldContracts.fieldComputed({
    deps: ['form.name', 'form.email', 'baseline.name', 'baseline.email'],
    get: (formName, formEmail, baselineName, baselineEmail) => formName !== baselineName || formEmail !== baselineEmail,
  }),
})

export const FieldForm = Logix.Module.make('FieldFormModule', {
  state: FieldFormStateSchema,
  actions: FieldFormActions,
})

const FieldFormFieldsLogic = FieldForm.logic('field-form-fields', ($) => {
  $.fields(FieldFormFields)
  return Effect.void
})

const FieldFormLogic = FieldForm.logic('field-form-logic', ($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction('changeName').mutate((state, action) => {
          state.form.name = action.payload
        }),
        $.onAction('changeEmail').mutate((state, action) => {
          state.form.email = action.payload
        }),
        $.onAction('reset').mutate((state) => {
          state.form = { ...state.baseline }
        }),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

export const FieldFormProgram = Logix.Program.make(FieldForm, {
  initial: {
    form: {
      name: '',
      email: '',
    },
    baseline: {
      name: '',
      email: '',
    },
    meta: {
      dirtyCount: 0,
      isDirty: false,
    },
  },
  logics: [FieldFormFieldsLogic, FieldFormLogic],
})
