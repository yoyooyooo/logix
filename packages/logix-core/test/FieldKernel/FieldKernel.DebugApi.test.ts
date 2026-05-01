import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { CounterWithProfile } from '../../../../examples/logix-react/src/modules/counter-with-profile.js'

describe('Debug.getModuleFieldProgram', () => {
  it('should expose FieldProgram / graph / plan for a Module with field declarations', () => {
    const fieldProgram = CoreDebug.getModuleFieldProgram(CounterWithProfile as any)

    expect(fieldProgram.program).toBeDefined()
    expect(fieldProgram.graph).toBeDefined()
    expect(fieldProgram.plan).toBeDefined()

    const program = fieldProgram.program!

    // Program.stateSchema should match the Module's state schema.
    expect(program.stateSchema).toBeDefined()

    // Graph / Plan should include nodes/steps related to sum and profile.name in CounterState.
    const nodeIds = program.graph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('sum')
    expect(nodeIds).toContain('profile.name')

    const hasComputedStep = program.plan.steps.some((s) => s.kind === 'computed-update' && s.targetFieldPath === 'sum')
    const hasDerivedNameStep = program.plan.steps.some(
      (s) => s.kind === 'computed-update' && s.targetFieldPath === 'profile.name',
    )

    expect(hasComputedStep).toBe(true)
    expect(hasDerivedNameStep).toBe(true)
  })

  it('should return empty object for Modules without field declarations', () => {
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

    const fieldProgram = CoreDebug.getModuleFieldProgram(Counter as any)

    expect(fieldProgram.program).toBeUndefined()
    expect(fieldProgram.graph).toBeUndefined()
    expect(fieldProgram.plan).toBeUndefined()
  })

  it('getModuleFieldProgramById should return field programs for Modules with field declarations', () => {
    const fieldProgram = CoreDebug.getModuleFieldProgramById(CounterWithProfile.id)

    expect(fieldProgram).toBeDefined()
    expect(fieldProgram?.program).toBeDefined()
    expect(fieldProgram?.graph).toBeDefined()
    expect(fieldProgram?.plan).toBeDefined()
  })

  it('getModuleFieldProgramById should return undefined for unknown moduleId', () => {
    const fieldProgram = CoreDebug.getModuleFieldProgramById('__unknown_module_id__')

    expect(fieldProgram).toBeUndefined()
  })

  it('getModuleFieldProgramById should not register field programs when NODE_ENV=production', () => {
    const previousEnv = process.env.NODE_ENV
    try {
      process.env.NODE_ENV = 'production'

      const StateSchema = Schema.Struct({
        value: Schema.Number,
      })

      const Actions = {
        bump: Schema.Void,
      }

      const ProdModule = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('ProdEnvCounter', {
  state: StateSchema,
  actions: Actions
}), FieldContracts.fieldFrom(StateSchema)({
          value: FieldContracts.fieldComputed({
            deps: ['value'],
            get: (value) => value,
          }),
        }))

      const fieldProgram = CoreDebug.getModuleFieldProgramById(ProdModule.id)
      expect(fieldProgram).toBeUndefined()
    } finally {
      process.env.NODE_ENV = previousEnv
    }
  })
})
