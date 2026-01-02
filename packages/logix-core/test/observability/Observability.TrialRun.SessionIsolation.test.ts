import { describe, it, expect } from '@effect/vitest'
import { Context, Effect, Exit, Layer, Schema, TestClock } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability.TrialRun (US4)', () => {
  it.scoped(
    'parallel RunSession trial runs should not leak runId/events/IR across sessions',
    () =>
      Effect.gen(function* () {
        const State = Schema.Struct({
          a: Schema.Number,
          b: Schema.Number,
          c: Schema.Number,
          d: Schema.Number,
          e: Schema.Number,
          f: Schema.Number,
          derived: Schema.Number,
        })

        const Actions = {
          noop: Schema.Void,
        }

        const makeModule = (options: { readonly moduleId: string; readonly deps: string }) => {
          const M = Logix.Module.make(options.moduleId, {
            state: State,
            actions: Actions,
            reducers: { noop: (s: any) => s },
            traits: Logix.StateTrait.from(State)({
              derived: Logix.StateTrait.computed({
                deps: [options.deps] as any,
                get: (x: any) => x + 1,
              }),
            }),
          })

          const impl = M.implement({
            initial: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, derived: 1 },
            logics: [],
          })

          return { M, impl }
        }

        const runOnce = (options: { readonly runId: string; readonly module: ReturnType<typeof makeModule> }) =>
          Logix.Observability.trialRun(
            Effect.gen(function* () {
              const ctx = yield* options.module.impl.impl.layer.pipe(Layer.build)
              const runtime = Context.get(ctx, options.module.M.tag) as any

              // Give background logic/traits installation a chance to run so static IR registration and evidence collection can complete.
              yield* TestClock.adjust('1 millis')

              return runtime.instanceId as string
            }),
            {
              runId: options.runId,
              source: { host: 'vitest', label: options.runId },
              diagnosticsLevel: 'full',
              maxEvents: 200,
            },
          )

        const moduleA = makeModule({ moduleId: 'TrialRunIsolationModuleA', deps: 'a' })
        const moduleB = makeModule({ moduleId: 'TrialRunIsolationModuleB', deps: 'b' })

        const [a, b] = yield* Effect.all(
          [runOnce({ runId: 'run-a', module: moduleA }), runOnce({ runId: 'run-b', module: moduleB })],
          {
            concurrency: 'unbounded',
          },
        )

        expect(a.evidence.runId).toBe('run-a')
        expect(b.evidence.runId).toBe('run-b')

        expect(Exit.isSuccess(a.exit)).toBe(true)
        expect(Exit.isSuccess(b.exit)).toBe(true)

        const aInstanceId = Exit.isSuccess(a.exit) ? a.exit.value : 'unknown'
        const bInstanceId = Exit.isSuccess(b.exit) ? b.exit.value : 'unknown'
        expect(aInstanceId).not.toBe(bInstanceId)

        const summaryA: any = a.evidence.summary
        const summaryB: any = b.evidence.summary

        const servicesA: any = summaryA?.runtime?.services
        const servicesB: any = summaryB?.runtime?.services
        expect(servicesA?.instanceId).toBe(aInstanceId)
        expect(servicesB?.instanceId).toBe(bInstanceId)

        // converge.staticIrByDigest uses a stable staticIrDigest key (must not depend on instanceId/time/randomness);
        // but the summary must be session-isolated: its values' instanceId/moduleId must not leak across sessions.
        const staticIrByDigestA: any = summaryA?.converge?.staticIrByDigest
        const staticIrByDigestB: any = summaryB?.converge?.staticIrByDigest
        expect(staticIrByDigestA && typeof staticIrByDigestA === 'object').toBe(true)
        expect(staticIrByDigestB && typeof staticIrByDigestB === 'object').toBe(true)

        const digestsA = Object.keys(staticIrByDigestA ?? {})
        const digestsB = Object.keys(staticIrByDigestB ?? {})
        expect(digestsA.length).toBeGreaterThan(0)
        expect(digestsB.length).toBeGreaterThan(0)

        for (const digest of digestsA) {
          expect(digest.startsWith('converge_ir_v2:')).toBe(true)
          expect(digestsB.includes(digest)).toBe(false)

          const ir: any = (staticIrByDigestA as any)[digest]
          expect(ir?.instanceId).toBe(aInstanceId)
          expect(ir?.moduleId).toBe('TrialRunIsolationModuleA')
        }
        for (const digest of digestsB) {
          expect(digest.startsWith('converge_ir_v2:')).toBe(true)
          expect(digestsA.includes(digest)).toBe(false)

          const ir: any = (staticIrByDigestB as any)[digest]
          expect(ir?.instanceId).toBe(bInstanceId)
          expect(ir?.moduleId).toBe('TrialRunIsolationModuleB')
        }

        // Event envelopes' runId must match session.runId (no cross-session leakage).
        for (const e of a.evidence.events as any[]) {
          expect(e.runId).toBe('run-a')
        }
        for (const e of b.evidence.events as any[]) {
          expect(e.runId).toBe('run-b')
        }

        // Chaos: start more sessions in parallel to validate runId and IR digests do not leak (covers once/seq/dedup isolation).
        const chaosRuns = [
          { runId: 'run-1', deps: 'a' },
          { runId: 'run-2', deps: 'b' },
          { runId: 'run-3', deps: 'c' },
          { runId: 'run-4', deps: 'd' },
          { runId: 'run-5', deps: 'e' },
          { runId: 'run-6', deps: 'f' },
        ]

        const many = yield* Effect.forEach(
          chaosRuns,
          ({ runId, deps }) =>
            runOnce({
              runId,
              module: makeModule({ moduleId: `TrialRunIsolationModule_${runId}`, deps }),
            }),
          { concurrency: 6 },
        )

        const seenRunIds = new Set<string>()
        const seenDigests = new Set<string>()
        for (const r of many) {
          expect(seenRunIds.has(r.evidence.runId)).toBe(false)
          seenRunIds.add(r.evidence.runId)

          expect(Exit.isSuccess(r.exit)).toBe(true)
          const instanceId = Exit.isSuccess(r.exit) ? r.exit.value : 'unknown'

          const summary: any = r.evidence.summary
          const services: any = summary?.runtime?.services
          expect(services?.instanceId).toBe(instanceId)

          const irByDigest: any = summary?.converge?.staticIrByDigest
          const digests = Object.keys(irByDigest ?? {})
          expect(digests.length).toBeGreaterThan(0)
          for (const digest of digests) {
            expect(digest.startsWith('converge_ir_v2:')).toBe(true)
            expect(seenDigests.has(digest)).toBe(false)
            seenDigests.add(digest)

            const ir: any = irByDigest[digest]
            expect(ir?.instanceId).toBe(instanceId)
            expect(ir?.moduleId).toBe(`TrialRunIsolationModule_${r.evidence.runId}`)
          }
        }
      }),
    20_000,
  )
})
