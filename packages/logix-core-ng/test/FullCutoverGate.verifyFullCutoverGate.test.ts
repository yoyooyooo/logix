import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as CoreNg from '../src/index.js'

describe('core-ng: Reflection.verifyFullCutoverGate', () => {
  it.effect(
    'core vs core-ng(fullCutover) should PASS for a basic interaction',
    () =>
      Effect.gen(function* () {
        const Root = Logix.Module.make('CoreNg.FullCutoverGate.verifyFullCutoverGate', {
          state: Schema.Struct({ count: Schema.Number }),
          actions: { inc: Schema.Void },
          reducers: {
            inc: (s: any) => ({ ...s, count: (s?.count ?? 0) + 1 }),
          },
        })

        const program = Root.implement({
          initial: { count: 0 },
          logics: [],
        })

        const interaction = (rt: any) => rt.dispatch({ _tag: 'inc', payload: undefined } as any)

        const result = yield* Logix.Reflection.verifyFullCutoverGate(program, {
          mode: 'fullCutover',
          diagnosticsLevel: 'light',
          gateDiagnosticsLevel: 'off',
          maxEvents: 200,
          before: {
            runId: 'run:test:core-ng:full-cutover:before',
            interaction,
          },
          after: {
            runId: 'run:test:core-ng:full-cutover:after',
            layer: CoreNg.coreNgFullCutoverLayer(),
            interaction,
          },
        })

        expect(result.verdict).toBe('PASS')
        expect(result.contractVerdict).toBe('PASS')
        expect(result.gate.verdict).toBe('PASS')
        expect(result.gate.fullyActivated).toBe(true)
        expect(JSON.stringify(result)).toBeTruthy()
      }),
    20_000,
  )
})
