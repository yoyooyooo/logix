import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import { buildDependencyGraph } from '../../../src/internal/field-kernel/graph.js'
import { reverseClosure } from '../../../src/internal/field-kernel/reverse-closure.js'

describe('FieldKernel list-scope deps normalization', () => {
  it.effect('ReverseClosure reaches list-scope check from items[].warehouseId', () =>
    Effect.sync(() => {
      const RowSchema = Schema.Struct({
        warehouseId: Schema.String,
      })

      const StateSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
        errors: Schema.Any,
      })

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        items: FieldContracts.fieldList({
          list: FieldContracts.fieldNode({
            check: {
              uniqueWarehouse: {
                deps: ['warehouseId'],
                validate: () => undefined,
              },
            },
          }),
        }),
      })

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
      const graph = buildDependencyGraph(program)

      const closure = Array.from(reverseClosure(graph, 'items[].warehouseId'))

      // The list-scope check fieldPath is "items", and its deps must be normalized to "items[].warehouseId";
      // therefore reverse-closure from "items[].warehouseId" should reach "items".
      expect(closure).toContain('items')
    }),
  )
})
