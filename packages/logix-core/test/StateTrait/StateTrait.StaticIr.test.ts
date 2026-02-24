import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { getConvergeStaticIrDigest } from '../../src/internal/state-trait/converge-ir.js'

describe('StateTrait.exportStaticIr (009)', () => {
  it.effect('should export minimal Static IR with canonical FieldPath segments', () =>
    Effect.sync(() => {
      const State = Schema.Struct({ a: Schema.Number, b: Schema.Number })

      const program = Logix.StateTrait.build(
        State,
        Logix.StateTrait.from(State)({
          a: Logix.StateTrait.computed({
            deps: ['b'],
            get: (b) => b + 1,
          }),
          b: Logix.StateTrait.link({
            from: 'a',
          }),
        }),
      )

      const ir = Logix.StateTrait.exportStaticIr(program, 'TestModule', {
        version: '009',
      })

      expect(ir.moduleId).toBe('TestModule')
      expect(ir.version).toBe('009')

      const computed = ir.nodes.find((n) => n.nodeId === 'computed:a')
      expect(computed).toBeDefined()
      expect(computed?.writes).toEqual([['a']])
      expect(computed?.reads).toEqual([['b']])

      const link = ir.nodes.find((n) => n.nodeId === 'link:b')
      expect(link).toBeDefined()
      expect(link?.writes).toEqual([['b']])
      expect(link?.reads).toEqual([['a']])

      expect(() => JSON.stringify(ir)).not.toThrow()
    }),
  )

  it.effect('should precompute converge staticIrDigest on build and keep getter-compatible', () =>
    Effect.sync(() => {
      const State = Schema.Struct({ a: Schema.Number, b: Schema.Number })

      const program = Logix.StateTrait.build(
        State,
        Logix.StateTrait.from(State)({
          a: Logix.StateTrait.computed({
            deps: ['b'],
            get: (b) => b + 1,
          }),
        }),
      )

      const convergeIr: any = (program as any).convergeIr
      expect(convergeIr).toBeDefined()
      expect(typeof convergeIr.staticIrDigest).toBe('string')
      expect(convergeIr.staticIrDigest.length).toBeGreaterThan(0)
      expect(getConvergeStaticIrDigest(convergeIr)).toBe(convergeIr.staticIrDigest)
    }),
  )
})
