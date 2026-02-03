import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { exportTypeIr } from '../../src/internal/reflection/ports/exportTypeIr.js'

describe('TypeIr (035) - truncation', () => {
  it('marks truncated=true and records droppedTypeIds in notes', () => {
    const M = Logix.Module.make('TypeIr.Truncation', {
      state: Schema.Struct({
        ok: Schema.Boolean,
        nested: Schema.Struct({
          value: Schema.String,
        }),
      }),
      actions: {
        a: Schema.Void,
        b: Schema.Void,
        c: Schema.Void,
        d: Schema.Void,
      },
    })

    const typeIr = exportTypeIr({ module: M, budget: { maxNodes: 3 } })
    expect(typeIr).toBeDefined()

    expect(typeIr?.moduleId).toBe('TypeIr.Truncation')
    expect(typeIr?.budget?.maxNodes).toBe(3)
    expect(typeIr?.truncated).toBe(true)
    expect(typeIr?.types).toHaveLength(3)

    const notes = (typeIr as any)?.notes
    expect(notes?.__logix?.typeIrTruncation?.truncated).toBe(true)
    expect(notes?.__logix?.typeIrTruncation?.droppedTypeIds?.length).toBeGreaterThan(0)

    expect(() => JSON.stringify(typeIr)).not.toThrow()
  })
})

