import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { makePortSpecArtifactExporter, PORT_SPEC_ARTIFACT_KEY } from '../../src/internal/reflection/ports/exportPortSpec.js'
import { makeTypeIrArtifactExporter, TYPE_IR_ARTIFACT_KEY } from '../../src/internal/reflection/ports/exportTypeIr.js'

describe('TypeIr (035) - projector failure', () => {
  it.effect('keeps other artifacts when projector throws', () =>
    Effect.gen(function* () {
      const Tag = Logix.ModuleTag.make('TypeIr.ProjectorFailure', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s) => s },
      })

      const moduleDef = {
        _kind: 'ModuleDef',
        id: 'TypeIr.ProjectorFailure',
        tag: Tag,
      } as any

      Logix.Observability.registerTrialRunArtifactExporter(Tag, makePortSpecArtifactExporter(moduleDef))
      Logix.Observability.registerTrialRunArtifactExporter(
        Tag,
        makeTypeIrArtifactExporter(moduleDef, {
          projectors: {
            projectorId: 'explode',
            project: () => {
              throw new Error('boom')
            },
          },
        }),
      )

      const program = Tag.implement({ initial: { ok: true }, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })

      const artifacts = report.artifacts as any
      expect(artifacts?.[PORT_SPEC_ARTIFACT_KEY]?.ok).toBe(true)
      expect(artifacts?.[TYPE_IR_ARTIFACT_KEY]?.ok).toBe(false)
      expect(artifacts?.[TYPE_IR_ARTIFACT_KEY]?.error?.code).toBe('ArtifactExportFailed')
    }),
  )
})

