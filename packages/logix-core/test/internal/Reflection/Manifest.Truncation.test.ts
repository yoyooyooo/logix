import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../../src/index.js'

const utf8Bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length

describe('Reflection.extractManifest truncation (US2)', () => {
  it('should deterministically truncate actions tail under maxBytes', () => {
    const State = Schema.Struct({ value: Schema.Number })

    const actions: Record<string, Schema.Schema<any>> = {}
    for (let i = 0; i < 2000; i++) {
      actions[`a${String(i).padStart(4, '0')}`] = Schema.String
    }

    const Root = Logix.Module.make('Reflection.Manifest.Truncation.Actions', {
      state: State,
      actions: actions as any,
      dev: {
        source: { file: 'Manifest.Truncation.test.ts', line: 1, column: 1 },
      },
    })

    const program = Root.implement({ initial: { value: 0 }, logics: [] })

    const maxBytes = 2048

    const a = Logix.Reflection.extractManifest(program, { budgets: { maxBytes } })
    const b = Logix.Reflection.extractManifest(program, { budgets: { maxBytes } })

    expect(a).toEqual(b)
    expect(a.digest).toBe(b.digest)

    expect(utf8Bytes(a)).toBeLessThanOrEqual(maxBytes)
    expect((a as any).meta?.__logix?.truncated).toBe(true)
    expect(((a as any).meta?.__logix?.truncatedArrays ?? []).includes('actions')).toBe(true)

    const actionTags = Object.keys(actions).sort()
    expect(a.actions.map((x) => x.actionTag)).toEqual(actionTags.slice(0, a.actions.length))
  })
})

