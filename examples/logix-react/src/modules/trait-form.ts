import { StateTrait, Module } from '@logixjs/core'
import { Effect, Schema } from 'effect'

// ToB 场景 1：表单脏标记与合法性由 Trait 管理

export const TraitFormStateSchema = Schema.Struct({
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

export type TraitFormState = Schema.Schema.Type<typeof TraitFormStateSchema>

export const TraitFormActions = {
  changeName: Schema.String,
  changeEmail: Schema.String,
  reset: Schema.Void,
}

// Traits：基于 baseline 与 form 计算脏标记
export const TraitFormTraits = StateTrait.from(TraitFormStateSchema)({
  'meta.dirtyCount': StateTrait.computed({
    deps: ['form.name', 'form.email', 'baseline.name', 'baseline.email'],
    get: (formName, formEmail, baselineName, baselineEmail) => {
      let count = 0
      if (formName !== baselineName) count++
      if (formEmail !== baselineEmail) count++
      return count
    },
  }),
  'meta.isDirty': StateTrait.computed({
    deps: ['form.name', 'form.email', 'baseline.name', 'baseline.email'],
    get: (formName, formEmail, baselineName, baselineEmail) => formName !== baselineName || formEmail !== baselineEmail,
  }),
})

export const TraitFormDef = Module.make('TraitFormModule', {
  state: TraitFormStateSchema,
  actions: TraitFormActions,
  traits: TraitFormTraits,
})

const TraitFormLogic = TraitFormDef.logic(($) =>
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

export const TraitFormModule = TraitFormDef.implement({
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
  logics: [TraitFormLogic],
})
