import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('LogicFields - evidence stability (declaration freeze)', () => {
  it.effect('same input twice → trace:module:fields meta stays identical and exportable', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        a: Schema.Number,
        sum: Schema.Number,
      })

      const Actions = {
        noop: Schema.Void,
      }

      const sharedFields = FieldContracts.fieldFrom(State)({
        sum: FieldContracts.fieldComputed({
          deps: ['a'],
          get: (a) => a,
        }),
      })

      const runOnce = (runId: string) =>
        Effect.gen(function* () {
          Debug.startDevtoolsRun(runId)

          const layer = Debug.devtoolsHubLayer({
            bufferSize: 128,
            diagnosticsLevel: 'full',
          }) as Layer.Layer<any, never, never>

          const M = Logix.Module.make('LogicFieldsEvidenceStability', {
            state: State,
            actions: Actions,
          })

          const L = M.logic('L#1', ($) => {
            $.fields(sharedFields)
            return Effect.void
          })

          const program = Logix.Program.make(M, {
            initial: { a: 1, sum: 0 },
            logics: [L],
          })

          const runtime = Logix.Runtime.make(program, { layer })
          let runtimeForRead: unknown

          try {
            yield* Effect.promise(() =>
              runtime.runPromise(
                Effect.gen(function* () {
                  runtimeForRead = yield* Effect.service(M.tag).pipe(Effect.orDie)
                }) as Effect.Effect<void, never, any>,
              ),
            )
          } finally {
            yield* Effect.promise(() => runtime.dispose())
          }

          const snapshot = Debug.getModuleFieldSnapshot(runtimeForRead as any)
          expect(snapshot).toBeDefined()
          const meta = {
            digest: snapshot?.digest,
            count: snapshot?.fields.length,
            fields: snapshot?.fields,
            provenanceIndex: snapshot?.provenanceIndex,
          }
          expect(JSON.parse(JSON.stringify(meta))).toEqual(meta)
          return meta
        })

      const meta1 = yield* runOnce('fields-stability-1')
      const meta2 = yield* runOnce('fields-stability-2')

      expect(meta1).toEqual(meta2)
      expect(Object.keys(meta1 as Record<string, unknown>).sort()).toEqual(['count', 'digest', 'fields', 'provenanceIndex'])
    }),
  )
})
