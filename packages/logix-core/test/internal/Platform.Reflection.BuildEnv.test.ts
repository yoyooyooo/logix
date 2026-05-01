import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, expect, it } from '@effect/vitest'
import { Cause, Config, Effect, Exit, Option, Schema, ServiceMap } from 'effect'
import * as BuildEnv from '../../src/internal/platform/BuildEnv.js'
import { RuntimeHost } from '../../src/internal/platform/RuntimeHost.js'
import * as Logix from '../../src/index.js'

describe('Platform.Reflection.BuildEnv', () => {
  it.effect('should isolate Build Env config and export stable Static IR digest', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        derivedA: Schema.Number,
      })

      const Actions = { noop: Schema.Void }

      const builder = Effect.gen(function* () {
        const host = yield* Effect.service(RuntimeHost).pipe(Effect.orDie)
        const enableExperimental = yield* Config.boolean('ENABLE_EXPERIMENTAL_TRAIT').pipe(Config.withDefault(false))

        const module = Logix.Module.make('ReflectBuildEnvModule', {
          state: State,
          actions: Actions,
          reducers: { noop: (s: any) => s },
        })

        const fieldsLogic = module.logic('__reflect_build_env:fields', ($) => {
          $.fields({
            derivedA: FieldContracts.fieldNode({
              meta: {
                label: enableExperimental ? 'derivedA (exp)' : 'derivedA',
                description: enableExperimental ? 'experimental computed field' : 'stable computed field',
                docsUrl: 'https://example.invalid/derivedA',
                tags: enableExperimental ? ['experimental'] : ['stable'],
                annotations: {
                  'x-phantom-source': enableExperimental ? 'on' : 'off',
                },
              },
              computed: $.fields.computed({
                deps: ['a'],
                get: (a) => a + 1,
              }),
            }),
          })

          return Effect.void
        })

        const program = Logix.Program.make(module, {
          initial: { a: 0, derivedA: 0 },
          logics: [fieldsLogic],
        })

        const ir = CoreReflection.exportStaticIr(program)
        if (!ir) {
          throw new Error('expected Static IR to exist')
        }
        const derivedNode = ir.nodes.find((n) => n.nodeId === 'computed:derivedA')

        return {
          hostKind: host.kind,
          enableExperimental,
          digest: ir.digest,
          derivedMeta: derivedNode?.meta,
        }
      })

      const [stableOff1, stableOff2, expOn] = yield* Effect.all(
        [
          BuildEnv.run(builder, {
            runtimeHostKind: 'node',
            config: { ENABLE_EXPERIMENTAL_TRAIT: false },
          }),
          BuildEnv.run(builder, {
            runtimeHostKind: 'node',
            config: { ENABLE_EXPERIMENTAL_TRAIT: false },
          }),
          BuildEnv.run(builder, {
            runtimeHostKind: 'node',
            config: { ENABLE_EXPERIMENTAL_TRAIT: true },
          }),
        ],
        { concurrency: 'unbounded' },
      )

      expect(stableOff1.hostKind).toBe('node')
      expect(stableOff1.enableExperimental).toBe(false)
      expect(stableOff2.digest).toBe(stableOff1.digest)

      expect(expOn.hostKind).toBe('node')
      expect(expOn.enableExperimental).toBe(true)
      expect(expOn.digest).not.toBe(stableOff1.digest)

      expect(stableOff1.derivedMeta?.description).toBe('stable computed field')
      expect(stableOff1.derivedMeta?.docsUrl).toBe('https://example.invalid/derivedA')
      expect(stableOff1.derivedMeta?.annotations).toEqual({
        'x-phantom-source': 'off',
      })
    }),
  )

  it.effect('should fail fast when builder accesses runtime-only services', () =>
    Effect.gen(function* () {
      class BusinessService extends ServiceMap.Service<BusinessService, { readonly ping: Effect.Effect<void> }>()('BusinessService') {}

      const invalidBuilder = Effect.gen(function* () {
        yield* Effect.service(BusinessService).pipe(Effect.orDie)
        return 'ok'
      })

      const exit = yield* BuildEnv.run(invalidBuilder as any, {
        runtimeHostKind: 'node',
        config: {},
      }).pipe(Effect.exit)

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const failure = Cause.findErrorOption(exit.cause)
        expect(Option.isSome(failure)).toBe(true)
        if (Option.isSome(failure)) {
          const err = failure.value as any
          expect(err?._tag).toBe('ConstructionGuardError')
          expect(err?.kind).toBe('missing_service')
          expect(err?.missingService).toBe('BusinessService')
        }
      }
    }),
  )
})
