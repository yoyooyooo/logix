import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { CounterWithProfile } from '../../../../examples/logix-react/src/modules/counter-with-profile.js'

describe('Debug.getModuleTraits', () => {
  it('should expose StateTraitProgram / graph / plan for a Module with traits', () => {
    const traits = Logix.Debug.getModuleTraits(CounterWithProfile as any)

    expect(traits.program).toBeDefined()
    expect(traits.graph).toBeDefined()
    expect(traits.plan).toBeDefined()

    const program = traits.program!

    // Program.stateSchema should match the Module's state schema.
    expect(program.stateSchema).toBeDefined()

    // Graph / Plan should include nodes/steps related to sum and profile.name in CounterState.
    const nodeIds = program.graph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('sum')
    expect(nodeIds).toContain('profile.name')

    const hasComputedStep = program.plan.steps.some((s) => s.kind === 'computed-update' && s.targetFieldPath === 'sum')
    const hasLinkStep = program.plan.steps.some(
      (s) => s.kind === 'link-propagate' && s.targetFieldPath === 'profile.name',
    )

    expect(hasComputedStep).toBe(true)
    expect(hasLinkStep).toBe(true)
  })

  it('should return empty object for Modules without traits', () => {
    const StateSchema = Schema.Struct({
      count: Schema.Number,
    })

    const Actions = {
      inc: Schema.Number,
    }

    const Counter = Logix.Module.make('PlainCounter', {
      state: StateSchema,
      actions: Actions,
    })

    const traits = Logix.Debug.getModuleTraits(Counter as any)

    expect(traits.program).toBeUndefined()
    expect(traits.graph).toBeUndefined()
    expect(traits.plan).toBeUndefined()
  })

  it('getModuleTraitsById should return traits for Modules with traits', () => {
    const traits = Logix.Debug.getModuleTraitsById(CounterWithProfile.id)

    expect(traits).toBeDefined()
    expect(traits?.program).toBeDefined()
    expect(traits?.graph).toBeDefined()
    expect(traits?.plan).toBeDefined()
  })

  it('getModuleTraitsById should return undefined for unknown moduleId', () => {
    const traits = Logix.Debug.getModuleTraitsById('__unknown_module_id__')

    expect(traits).toBeUndefined()
  })

  it('getModuleTraitsById should not register traits when NODE_ENV=production', () => {
    const previousEnv = process.env.NODE_ENV
    try {
      process.env.NODE_ENV = 'production'

      const StateSchema = Schema.Struct({
        value: Schema.Number,
      })

      const Actions = {
        bump: Schema.Void,
      }

      const ProdModule = Logix.Module.make('ProdEnvCounter', {
        state: StateSchema,
        actions: Actions,
        traits: Logix.StateTrait.from(StateSchema)({
          value: Logix.StateTrait.computed({
            deps: ['value'],
            get: (value) => value,
          }),
        }),
      })

      const traits = Logix.Debug.getModuleTraitsById(ProdModule.id)
      expect(traits).toBeUndefined()
    } finally {
      process.env.NODE_ENV = previousEnv
    }
  })
})
