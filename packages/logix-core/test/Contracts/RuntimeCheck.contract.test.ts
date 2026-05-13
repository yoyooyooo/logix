import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.check static control-plane facade', () => {
  it.effect('returns a static VerificationControlPlaneReport without booting the program', () =>
    Effect.gen(function* () {
      let booted = false

      const Root = Logix.Module.make('RuntimeCheck.Contract.Root', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {},
      })

      const RootLogic = Root.logic('runtime-check-boot-guard', () =>
        Effect.sync(() => {
          booted = true
        }),
      )

      const program = Logix.Program.make(Root, {
        initial: { count: 0 },
        logics: [RootLogic],
      })

      const report = yield* Logix.Runtime.check(program, {
        runId: 'run:test:runtime-check-contract',
        includeStaticIr: true,
      })

      expect(booted).toBe(false)
      expect(report.kind).toBe('VerificationControlPlaneReport')
      expect(report.stage).toBe('check')
      expect(report.mode).toBe('static')
      expect(report.verdict).toBe('PASS')
      expect(report.errorCode).toBeNull()
      expect(report.nextRecommendedStage).toBe('trial')
      expect(report.environment).toEqual({
        runId: 'run:test:runtime-check-contract',
        host: 'static',
        declarationDigest: report.artifacts[0]?.digest,
      })
      expect(report.artifacts.some((artifact) => artifact.outputKey === 'module-manifest')).toBe(true)
      expect(report.artifacts[0]?.digest).toMatch(/^manifest:/)
      expect(report.findings).toContainEqual({
        kind: 'pass-boundary',
        code: 'CHECK_STAGE_PASS_ONLY',
        ownerCoordinate: 'runtime.check',
        summary: 'PASS covers only the check stage.',
      })
      expect(report.repeatability?.ignoredFields).toEqual([
        'environment.runId',
        'environment.file',
        'environment.outDir',
        'artifacts[].file',
      ])
    }),
  )

  it.effect('does not turn startup-only missing services into check dependency findings', () =>
    Effect.gen(function* () {
      let startupTouched = false

      class StartupOnlyService extends ServiceMap.Service<
        StartupOnlyService,
        { readonly ping: Effect.Effect<void> }
      >()('StartupOnlyService') {}

      const Root = Logix.Module.make('RuntimeCheck.Contract.StaticOnlyMissingService', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [
          Root.logic<StartupOnlyService>('startup-only-service', ($) => {
            $.readyAfter(
              Effect.gen(function* () {
                startupTouched = true
                yield* Effect.service(StartupOnlyService)
              }) as any,
              { id: 'startup-only-service' },
            )
            return Effect.void
          }),
        ],
      })

      const report = yield* Logix.Runtime.check(program, {
        runId: 'run:test:runtime-check-static-only-missing-service',
      })

      expect(startupTouched).toBe(false)
      expect(report.stage).toBe('check')
      expect(report.mode).toBe('static')
      expect(report.verdict).toBe('PASS')
      expect(report.errorCode).toBeNull()
      expect(report.dependencyCauses).toBeUndefined()
      expect(report.findings?.some((finding) => finding.code === 'MissingDependency')).toBe(false)
      expect(report.nextRecommendedStage).toBe('trial')
    }),
  )

  it.effect('reports missing blueprint as static failure without booting runtime', () =>
    Effect.gen(function* () {
      const report = yield* Logix.Runtime.check(
        {
          _kind: 'Program',
          id: 'RuntimeCheck.Contract.MissingBlueprint',
          tag: {} as any,
          actions: {},
        } as any,
        {
          runId: 'run:test:runtime-check-missing-blueprint',
        },
      )

      expect(report.stage).toBe('check')
      expect(report.mode).toBe('static')
      expect(report.verdict).toBe('FAIL')
      expect(report.errorCode).toBe('PROGRAM_BLUEPRINT_MISSING')
      expect(report.nextRecommendedStage).toBe('check')
      expect(report.findings?.[0]).toMatchObject({
        kind: 'blueprint',
        code: 'PROGRAM_BLUEPRINT_MISSING',
        ownerCoordinate: 'Program.runtimeBlueprint',
      })
      expect(report.repairHints[0]?.focusRef).toEqual({
        declSliceId: 'Program.runtimeBlueprint',
      })
    }),
  )

  it.effect('reports declaration freshness from derived source artifacts', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('RuntimeCheck.Contract.SourceFreshness', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [],
      })

      const report = yield* Logix.Runtime.check(program, {
        runId: 'run:test:runtime-check-source-freshness',
        sourceArtifacts: [
          {
            sourceRef: 'src/source-freshness.ts',
            digest: 'manifest:stale',
            producer: 'typecheck',
            artifactRef: 'artifact:typecheck',
          },
        ],
      })

      expect(report.verdict).toBe('FAIL')
      expect(report.errorCode).toBe('DECLARATION_DIGEST_STALE')
      expect(report.findings?.[0]).toMatchObject({
        kind: 'declaration',
        code: 'DECLARATION_DIGEST_STALE',
        focusRef: {
          sourceRef: 'src/source-freshness.ts',
        },
        sourceArtifactRef: {
          sourceRef: 'src/source-freshness.ts',
          digest: 'manifest:stale',
          producer: 'typecheck',
          artifactRef: 'artifact:typecheck',
        },
      })
    }),
  )
})
