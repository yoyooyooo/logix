import { readFileSync } from 'node:fs'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { makeCounterProgram, runCounterOnce } from '../support/runtimeRunFixtures.js'

describe('Runtime.run result face contract', () => {
  it.effect('exposes Runtime.run as the public one-shot result face', () =>
    Effect.gen(function* () {
      const program = makeCounterProgram('RuntimeRun.Contract.Root')

      expect(typeof Logix.Runtime.run).toBe('function')
      expect('runProgram' in (Logix.Runtime as any)).toBe(false)

      const result = yield* Effect.promise(() => runCounterOnce(program))

      expect(result).toEqual({ count: 1 })
      expect(Logix.ControlPlane.isVerificationControlPlaneReport(result)).toBe(false)
    }),
  )

  it.effect('keeps check and trial as control-plane report faces', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('RuntimeRun.Contract.ControlPlane', {
        state: Schema.Void,
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: undefined,
        logics: [],
      })

      const checkReport = yield* Logix.Runtime.check(program, {
        runId: 'run:test:runtime-run-check-shape',
      })
      const trialReport = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:runtime-run-trial-shape',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      })

      expect(Logix.ControlPlane.isVerificationControlPlaneReport(checkReport)).toBe(true)
      expect(checkReport.stage).toBe('check')
      expect(checkReport.mode).toBe('static')
      expect(Logix.ControlPlane.isVerificationControlPlaneReport(trialReport)).toBe(true)
      expect(trialReport.stage).toBe('trial')
      expect(trialReport.mode).toBe('startup')
      expect('result' in trialReport).toBe(false)
      expect('durationMs' in trialReport).toBe(false)
      expect('truncated' in trialReport).toBe(false)
    }),
  )

  it('keeps removed result-face and playground vocabulary out of public runtime source', () => {
    const runtimeSource = readFileSync(new URL('../../src/Runtime.ts', import.meta.url), 'utf8')
    const indexSource = readFileSync(new URL('../../src/index.ts', import.meta.url), 'utf8')
    const oldResultFace = ['run', 'Program'].join('')
    const playgroundFace = ['play', 'ground'].join('')

    expect(runtimeSource).not.toContain(`export const ${oldResultFace}`)
    expect(runtimeSource).not.toContain(`export function ${oldResultFace}`)
    expect(indexSource).not.toContain(oldResultFace)
    expect(runtimeSource).not.toContain(`Runtime.${playgroundFace}`)
    expect(indexSource).not.toContain(`Runtime.${playgroundFace}`)
  })
})
