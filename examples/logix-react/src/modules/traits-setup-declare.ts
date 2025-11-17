import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

// Demo: 023 Logic Traits in Setup
// - Module 不声明 module-level traits；
// - LogicPlan.setup 里通过 `$.traits.declare(traits)` 贡献 traits；
// - Runtime 初始化阶段 finalize → freeze → build/install，使 traits 行为随 Module 生效。

export const TraitsSetupDeclareStateSchema = Schema.Struct({
  base: Schema.Number,
  derived: Schema.Number,
})

export const TraitsSetupDeclareActions = {
  'base/set': Schema.Number,
}

export type TraitsSetupDeclareShape = Logix.Shape<
  typeof TraitsSetupDeclareStateSchema,
  typeof TraitsSetupDeclareActions
>

export const TraitsSetupDeclareTraits = Logix.StateTrait.from(TraitsSetupDeclareStateSchema)({
  derived: Logix.StateTrait.computed({
    deps: ['base'],
    get: (base) => base + 1,
  }),
})

export const TraitsSetupDeclareDef = Logix.Module.make('TraitsSetupDeclareModule', {
  state: TraitsSetupDeclareStateSchema,
  actions: TraitsSetupDeclareActions,
})

export const TraitsSetupDeclareLogic = TraitsSetupDeclareDef.logic(($) => ({
  setup: Effect.sync(() => {
    $.traits.declare(TraitsSetupDeclareTraits)
  }),
  run: Effect.gen(function* () {
    yield* $.onAction('base/set').mutate((state, action) => {
      state.base = action.payload
    })
  }),
}))

export const TraitsSetupDeclareModule = TraitsSetupDeclareDef.implement({
  initial: { base: 0, derived: 1 },
  logics: [TraitsSetupDeclareLogic],
})
