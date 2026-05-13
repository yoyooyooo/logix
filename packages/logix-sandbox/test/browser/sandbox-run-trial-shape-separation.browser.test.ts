import { expect, test } from 'vitest'
import {
  buildProgramRunWrapper,
  buildTrialWrapper,
  createDocsRunnerFixture,
  effectSmokeSource,
  programExampleSource,
  runWrappedSource,
} from './support/docsRunnerFixture.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

const isVerificationControlPlaneReport = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (value as any).kind === 'VerificationControlPlaneReport' &&
  typeof (value as any).schemaVersion === 'number' &&
  typeof (value as any).stage === 'string' &&
  typeof (value as any).mode === 'string' &&
  typeof (value as any).verdict === 'string' &&
  Array.isArray((value as any).artifacts) &&
  Array.isArray((value as any).repairHints)

testFn('same Program source separates Run projection from Trial report', async () => {
  const { client } = await createDocsRunnerFixture()

  const runProjection = await runWrappedSource(
    client,
    buildProgramRunWrapper(programExampleSource, { runId: 'run:test:shape-run' }),
    'docs-program-shape-run.ts',
    'run:test:shape-run',
  )
  const trialReport = await runWrappedSource(
    client,
    buildTrialWrapper(programExampleSource, 'run:test:shape-trial'),
    'docs-program-shape-trial.ts',
    'run:test:shape-trial',
  )

  expect(isVerificationControlPlaneReport(runProjection)).toBe(false)
  expect(isVerificationControlPlaneReport(trialReport)).toBe(true)
  expect((trialReport as any).stage).toBe('trial')
  expect((trialReport as any).mode).toBe('startup')
  expect('result' in (trialReport as any)).toBe(false)
  expect('durationMs' in (trialReport as any)).toBe(false)
  expect('truncated' in (trialReport as any)).toBe(false)
})

testFn('raw Effect smoke source cannot trigger docs Trial wrapper', async () => {
  const { client } = await createDocsRunnerFixture()
  const result = await runWrappedSource(
    client,
    buildTrialWrapper(effectSmokeSource, 'run:test:effect-smoke-trial'),
    'effect-smoke-trial.ts',
    'run:test:effect-smoke-trial',
  )

  expect(isVerificationControlPlaneReport(result)).toBe(false)
  expect(result).toMatchObject({
    runId: 'run:test:effect-smoke-trial',
    ok: false,
    error: {
      kind: 'compile',
    },
  })
})

testFn('startup Trial projects readiness missing config from the bundled kernel', async () => {
  const { client } = await createDocsRunnerFixture()
  const missingConfigSource = `
    import { Config, Effect, Schema } from "effect";
    import * as Logix from "@logixjs/core";

    const Root = Logix.Module.make("DocsRunner.MissingConfig", {
      state: Schema.Void,
      actions: {},
    });

    export const Program = Logix.Program.make(Root, {
      initial: undefined,
      logics: [
        Root.logic("read-config-on-startup", ($) => {
          $.readyAfter(
            Effect.gen(function* () {
              yield* Config.string("MISSING_CONFIG_KEY");
            }),
            { id: "missing-config" },
          );
          return Effect.void;
        }),
      ],
    });
  `

  const result = await runWrappedSource(
    client,
    buildTrialWrapper(missingConfigSource, 'run:test:missing-config-trial'),
    'missing-config-trial.ts',
    'run:test:missing-config-trial',
  )

  expect(isVerificationControlPlaneReport(result)).toBe(true)
  expect((result as any).verdict).toBe('FAIL')
  expect((result as any).errorCode).toBe('MissingDependency')
  expect((result as any).dependencyCauses?.[0]).toMatchObject({
    kind: 'config',
    phase: 'startup-boot',
    ownerCoordinate: 'config:MISSING_CONFIG_KEY',
  })
  expect((result as any).findings?.[0]).toMatchObject({
    kind: 'dependency',
    code: 'MissingDependency',
    ownerCoordinate: 'config:MISSING_CONFIG_KEY',
  })
})
