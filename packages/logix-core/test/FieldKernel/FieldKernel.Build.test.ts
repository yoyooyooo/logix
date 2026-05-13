import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('FieldKernel.build', () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    profile: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  it('should build a program with graph and plan from a valid spec', () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      sum: FieldContracts.fieldComputed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
      // Simple link: profile.name follows profile.id (only used to validate Graph / Plan shape).
      'profile.name': FieldContracts.fieldLink({
        from: 'profile.id',
      }),
    })

    const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

    // Baseline structure: Program / Graph / Plan are all built.
    expect(program.stateSchema).toBe(StateSchema)
    expect(program.spec).toBe(fieldSpec)

    const graph = program.graph
    const plan = program.plan

    expect(graph._tag).toBe('FieldGraph')
    expect(Array.isArray(graph.nodes)).toBe(true)
    expect(Array.isArray(graph.edges)).toBe(true)

    // Should include at least two field nodes: sum / profile.name
    const nodeIds = graph.nodes.map((n) => n.id).sort()
    expect(nodeIds).toContain('sum')
    expect(nodeIds).toContain('profile.name')

    // Link edge: profile.id -> profile.name
    const linkEdges = graph.edges.filter((e) => e.kind === 'link')
    expect(linkEdges).toEqual([
      {
        id: 'link:profile.id->profile.name',
        from: 'profile.id',
        to: 'profile.name',
        kind: 'link',
      },
    ])

    expect(plan._tag).toBe('FieldPlan')
    expect(Array.isArray(plan.steps)).toBe(true)

    // Plan should include computed-update for sum and link-propagate for profile.name
    const kinds = plan.steps.map((s) => s.kind).sort()
    expect(kinds).toEqual(['computed-update', 'link-propagate'])

    const sumStep = plan.steps.find((s) => s.kind === 'computed-update' && s.targetFieldPath === 'sum')
    expect(sumStep).toBeDefined()

    const linkStep = plan.steps.find(
      (s) =>
        s.kind === 'link-propagate' && s.targetFieldPath === 'profile.name' && s.sourceFieldPaths?.[0] === 'profile.id',
    )
    expect(linkStep).toBeDefined()
  })

  it('should throw when link fields form a cycle', () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      // a <- b, b <- a form a cycle
      a: FieldContracts.fieldLink({ from: 'b' }),
      b: FieldContracts.fieldLink({ from: 'a' }),
    })

    expect(() => FieldContracts.buildFieldProgram(StateSchema, fieldSpec)).toThrowError(/link cycle detected/i)
  })
})
