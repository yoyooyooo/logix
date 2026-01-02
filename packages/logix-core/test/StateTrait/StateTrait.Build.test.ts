import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait.build', () => {
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
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
      // Simple link: profile.name follows profile.id (only used to validate Graph / Plan shape).
      'profile.name': Logix.StateTrait.link({
        from: 'profile.id',
      }),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)

    // Baseline structure: Program / Graph / Plan are all built.
    expect(program.stateSchema).toBe(StateSchema)
    expect(program.spec).toBe(traits)

    const graph = program.graph
    const plan = program.plan

    expect(graph._tag).toBe('StateTraitGraph')
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

    expect(plan._tag).toBe('StateTraitPlan')
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

  it('should throw when link traits form a cycle', () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      // a <- b, b <- a form a cycle
      a: Logix.StateTrait.link({ from: 'b' }),
      b: Logix.StateTrait.link({ from: 'a' }),
    })

    expect(() => Logix.StateTrait.build(StateSchema, traits)).toThrowError(/link cycle detected/i)
  })
})
