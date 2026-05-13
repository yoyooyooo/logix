import { describe, expect, it } from '@effect/vitest'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import {
  projectMinimumProgramActionManifest,
} from '../../../src/internal/reflection/programManifest.js'

describe('minimum Program action manifest', () => {
  it('projects 167A action manifest slice from an extracted manifest', () => {
    const Counter = Logix.Module.make('MinimumManifest.Counter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: {
        setCount: Schema.Number,
        increment: Schema.Void,
      } as const,
      reducers: {},
    })
    const program = Logix.Program.make(Counter, { initial: { count: 0 }, logics: [] })

    const manifest = CoreReflection.extractMinimumProgramActionManifest(program, {
      programId: 'fixture.program',
      revision: 7,
    })
    const manifestAgain = CoreReflection.extractMinimumProgramActionManifest(program, {
      programId: 'fixture.program',
      revision: 7,
    })

    expect(manifest).toMatchObject({
      manifestVersion: 'program-action-manifest@167A',
      programId: 'fixture.program',
      moduleId: 'MinimumManifest.Counter',
      revision: 7,
    })
    expect(manifest.digest).toMatch(/^manifest:/)
    expect(manifest.digest).toBe(manifestAgain.digest)
    expect(manifest.actions).toEqual([
      { actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' },
      {
        actionTag: 'setCount',
        payload: { kind: 'nonVoid', summary: 'Schema.Number' },
        authority: 'runtime-reflection',
      },
    ])
  })

  it('keeps fallback-source-regex outside manifest authority', () => {
    const manifest = projectMinimumProgramActionManifest({
      manifestVersion: 'module-manifest@1',
      moduleId: 'Fixture',
      actionKeys: ['increment'],
      actions: [
        { actionTag: 'increment', payload: { kind: 'void' } },
      ],
      digest: 'manifest:fixture',
    })

    expect(manifest.actions.map((action) => action.authority)).toEqual(['runtime-reflection'])
  })
})
