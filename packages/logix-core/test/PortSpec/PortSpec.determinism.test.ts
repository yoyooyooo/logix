import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { exportPortSpec } from '../../src/internal/reflection/ports/exportPortSpec.js'

describe('PortSpec (035) - determinism', () => {
  it('exports a stable port spec from module definition', () => {
    const M = Logix.Module.make('PortSpec.Test', {
      state: Schema.Struct({
        ok: Schema.Boolean,
        nested: Schema.Struct({
          value: Schema.String,
        }),
      }),
      actions: {
        b: Schema.Void,
        a: Schema.Void,
      },
    })

    const spec1 = exportPortSpec({ module: M })
    const spec2 = exportPortSpec({ module: M })

    expect(spec1).toEqual(spec2)
    expect(spec1.protocolVersion).toBe('v1')
    expect(spec1.moduleId).toBe('PortSpec.Test')
    expect(spec1.actions.map((a) => a.key)).toEqual(['a', 'b'])
    expect(spec1.events.map((e) => e.key)).toEqual(['a', 'b'])
    expect(spec1.exports.map((e) => e.path)).toContain('nested.value')
    expect(spec1.digest).toMatch(/^portspec:v1:/)

    expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2))
  })
})

