import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Context, Effect, Schema, Stream } from 'effect'
import { resolveSchemaAst } from '../../../../src/internal/runtime/core/process/selectorSchema.js'
import { makeNonPlatformTriggerStreamFactory } from '../../../../src/internal/runtime/core/process/triggerStreams.js'

describe('TriggerStreams runtime schema cache', () => {
  it.effect('reuses schema ast resolution for same runtime across moduleStateChange triggers', () =>
    Effect.gen(function* () {
      const moduleId = 'TriggerStreamsSchemaCacheModule'
      const moduleTag = Context.Tag(`@logixjs/Module/${moduleId}`)() as Context.Tag<any, any>

      const runtime = {
        moduleId,
        instanceId: `${moduleId}#1`,
        changesReadQueryWithMeta: () => Stream.empty,
      } as any

      const baseEnv = Context.add(moduleTag, runtime)(Context.empty())
      const schemaAst = resolveSchemaAst(
        Schema.Struct({
          user: Schema.Struct({
            name: Schema.String,
            age: Schema.Number,
          }),
        }),
      )

      let resolveCalls = 0
      const makeTriggerStream = makeNonPlatformTriggerStreamFactory({
        baseEnv,
        shouldRecordChainEvents: false,
        actionIdFromUnknown: () => undefined,
        resolveRuntimeStateSchemaAst: (value) => {
          resolveCalls += 1
          expect(value).toBe(runtime)
          return schemaAst
        },
        withModuleHint: (error) => error,
        emitSelectorWarning: () => Effect.void,
      })

      yield* makeTriggerStream({
        kind: 'moduleStateChange',
        moduleId,
        path: 'user.name',
      })
      yield* makeTriggerStream({
        kind: 'moduleStateChange',
        moduleId,
        path: 'user.age',
      })

      expect(resolveCalls).toBe(1)
    }),
  )
})
