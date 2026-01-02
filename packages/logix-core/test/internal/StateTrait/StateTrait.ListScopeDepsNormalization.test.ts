import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import { buildDependencyGraph } from '../../../src/internal/state-trait/graph.js'
import { reverseClosure } from '../../../src/internal/state-trait/reverse-closure.js'

describe('StateTrait list-scope deps normalization', () => {
  it.effect('ReverseClosure reaches list-scope check from items[].warehouseId', () =>
    Effect.sync(() => {
      const RowSchema = Schema.Struct({
        warehouseId: Schema.String,
      })

      const StateSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
        errors: Schema.Any,
      })

      const traits = Logix.StateTrait.from(StateSchema)({
        items: Logix.StateTrait.list({
          list: Logix.StateTrait.node({
            check: {
              uniqueWarehouse: {
                deps: ['warehouseId'],
                validate: () => undefined,
              },
            },
          }),
        }),
      })

      const program = Logix.StateTrait.build(StateSchema, traits)
      const graph = buildDependencyGraph(program)

      const closure = Array.from(reverseClosure(graph, 'items[].warehouseId'))

      // The list-scope check fieldPath is "items", and its deps must be normalized to "items[].warehouseId";
      // therefore reverse-closure from "items[].warehouseId" should reach "items".
      expect(closure).toContain('items')
    }),
  )
})
