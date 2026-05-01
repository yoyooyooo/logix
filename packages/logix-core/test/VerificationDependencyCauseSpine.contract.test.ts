import { describe, expect, it } from '@effect/vitest'
import { Config, Effect, Schema, ServiceMap } from 'effect'
import * as Logix from '../src/index.js'

describe('VerificationDependencyCause spine', () => {
  it.effect('projects missing service with stable owner and repair focus', () =>
    Effect.gen(function* () {
      class BusinessService extends ServiceMap.Service<
        BusinessService,
        { readonly ping: Effect.Effect<void> }
      >()('BusinessService') {}

      const Root = Logix.Module.make('VerificationDependencyCauseSpine.MissingService', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
      })

      const program = Logix.Program.make(Root, {
        initial: { ok: true },
        logics: [
          Root.logic<BusinessService>('root-logic', ($) => {
            $.readyAfter(Effect.asVoid(Effect.service(BusinessService).pipe(Effect.orDie)), {
              id: 'business-service',
            })
            return Effect.void
          }),
        ],
      })

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:dependency-spine-service',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.dependencyCauses?.[0]).toMatchObject({
        kind: 'service',
        phase: 'startup-boot',
        ownerCoordinate: 'service:BusinessService',
        providerSource: 'runtime-overlay',
        focusRef: { declSliceId: 'service:BusinessService' },
        errorCode: 'MissingDependency',
      })
      expect(report.findings?.[0]).toMatchObject({
        kind: 'dependency',
        code: 'MissingDependency',
        ownerCoordinate: 'service:BusinessService',
      })
      expect(report.repairHints[0]?.focusRef).toEqual({ declSliceId: 'service:BusinessService' })
    }),
  )

  it.effect('projects missing config with stable owner and repair focus', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('VerificationDependencyCauseSpine.MissingConfig', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [
          Root.logic('root-logic', ($) => {
            $.readyAfter(
              Effect.gen(function* () {
                yield* Config.string('MISSING_CONFIG_KEY')
              }) as any,
              { id: 'missing-config' },
            )
            return Effect.void
          }),
        ],
      })

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:dependency-spine-config',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.dependencyCauses?.[0]).toMatchObject({
        kind: 'config',
        phase: 'startup-boot',
        ownerCoordinate: 'config:MISSING_CONFIG_KEY',
        providerSource: 'runtime-overlay',
        focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
        errorCode: 'MissingDependency',
      })
      expect(report.findings?.[0]).toMatchObject({
        kind: 'dependency',
        code: 'MissingDependency',
        ownerCoordinate: 'config:MISSING_CONFIG_KEY',
      })
      expect(report.repairHints[0]?.focusRef).toEqual({ declSliceId: 'config:MISSING_CONFIG_KEY' })
    }),
  )

  it.effect('projects missing Program import with child identity', () =>
    Effect.gen(function* () {
      const Child = Logix.Module.make('VerificationDependencyCauseSpine.Child', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: {},
      })
      const Parent = Logix.Module.make('VerificationDependencyCauseSpine.Parent', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Parent, {
        initial: undefined,
        logics: [
          Parent.logic('read-child', ($) => {
            $.readyAfter(Effect.service(Child.tag).pipe(Effect.orDie) as any, { id: 'read-child' })
            return Effect.void
          }),
        ],
      })

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:dependency-spine-program-import',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(report.dependencyCauses?.[0]).toMatchObject({
        kind: 'program-import',
        phase: 'startup-boot',
        ownerCoordinate: 'Program.capabilities.imports:VerificationDependencyCauseSpine.Child',
        providerSource: 'program-capabilities',
        childIdentity: 'VerificationDependencyCauseSpine.Child',
        focusRef: { declSliceId: 'Program.capabilities.imports:VerificationDependencyCauseSpine.Child' },
        errorCode: 'MissingDependency',
      })
      expect(report.findings?.[0]).toMatchObject({
        kind: 'dependency',
        code: 'MissingDependency',
        ownerCoordinate: 'Program.capabilities.imports:VerificationDependencyCauseSpine.Child',
      })
      expect(report.repairHints[0]?.focusRef).toEqual({
        declSliceId: 'Program.capabilities.imports:VerificationDependencyCauseSpine.Child',
      })
    }),
  )
})
