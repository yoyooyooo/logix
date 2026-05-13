import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { describe, expect, it } from 'vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Logic surface contract', () => {
  it('accepts Module.logic(id, build)', () => {
    const Counter = Logix.Module.make('LogicSurface.Counter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: {},
    })

    const logic = Counter.logic('counter-bump', ($) => Effect.as($.state.read, undefined))
    expect(logic).toBeDefined()
  })

  it('persists the provided logic id into mounted metadata', () => {
    const Counter = Logix.Module.make('LogicSurface.CounterDescriptor', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: {},
    })

    const logic = Counter.logic('counter-bump', ($) => Effect.as($.state.read, undefined))
    const program = Logix.Program.make(Counter, {
      initial: { count: 0 },
      logics: [logic],
    })
    const manifest = CoreReflection.extractManifest(program)

    expect(manifest.logicUnits?.map((unit) => unit.id)).toContain('counter-bump')
  })
})
