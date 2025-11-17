import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.extractManifest (deterministic)', () => {
  it('should be JSON.stringify-able and stable across runs', () => {
    const Root = Logix.Module.make('Reflection.Manifest.Deterministic', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { bump: Schema.Void },
      schemas: {
        RootState: Schema.Struct({ value: Schema.Number }),
      },
      meta: {
        owner: 'core',
        stableTag: 'v1',
      },
      dev: {
        source: { file: 'test.ts', line: 1, column: 1 },
      },
    })

    const program = Root.implement({ initial: { value: 0 }, logics: [] })

    const a = Logix.Reflection.extractManifest(program)
    const b = Logix.Reflection.extractManifest(program)

    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
