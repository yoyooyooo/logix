import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.extractManifest slots (083)', () => {
  it('should export slots + slotFills deterministically', () => {
    const M = Logix.Module.make('Reflection.Manifest.Slots', {
      state: Schema.Struct({ n: Schema.Number }),
      actions: { noop: Schema.Void } as const,
      slots: {
        Primary: { required: true, kind: 'single' },
        Aspects: { kind: 'aspect' },
      },
    })

    const Primary = M.logic(() => Effect.void, { id: 'PrimaryLogic', slotName: 'Primary' })
    const AspectA = M.logic(() => Effect.void, { id: 'AspectA', slotName: 'Aspects' })
    const AspectB = M.logic(() => Effect.void, { id: 'AspectB', slotName: 'Aspects' })

    const program = M.implement({ initial: { n: 0 }, logics: [Primary, AspectA, AspectB] })
    const manifest = Logix.Reflection.extractManifest(program)

    expect(manifest.manifestVersion).toBe('083')
    expect(manifest.slots).toEqual({
      Aspects: { kind: 'aspect' },
      Primary: { required: true, kind: 'single' },
    })
    expect(manifest.slotFills).toEqual({
      Aspects: ['AspectA', 'AspectB'],
      Primary: ['PrimaryLogic'],
    })
  })
})

