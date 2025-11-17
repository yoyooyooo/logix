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

      // list-scope check 的 fieldPath = "items"，其 deps 必须被归一为 "items[].warehouseId"；
      // 因此从 "items[].warehouseId" 反向闭包应能命中 "items"。
      expect(closure).toContain('items')
    }),
  )
})
