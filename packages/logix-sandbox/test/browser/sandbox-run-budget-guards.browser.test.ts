import { expect, test } from 'vitest'
import {
  buildProgramRunWrapper,
  createDocsRunnerFixture,
  runWrappedSource,
} from './support/docsRunnerFixture.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn('docs Program Run reports serialization failure for non-JSON result', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program-serialization'
  const source = `
    import { Effect, Schema } from "effect";
    import * as Logix from "@logixjs/core";

    const Root = Logix.Module.make("DocsRunner.NonJson", {
      state: Schema.Void,
      actions: {},
    });

    export const Program = Logix.Program.make(Root, { initial: undefined, logics: [] });
    export const main = () => Effect.succeed({ value: new Map([["a", 1]]) });
  `

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(source, { runId }),
    'docs-program-non-json.ts',
    runId,
  )

  expect(result).toMatchObject({
    runId,
    ok: false,
    error: {
      kind: 'serialization',
    },
  })
  expect(String((result as any).error.message)).toContain('non-plain object')
})

testFn('docs Program Run reports result budget overflow as bounded projection', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program-budget'
  const source = `
    import { Effect, Schema } from "effect";
    import * as Logix from "@logixjs/core";

    const Root = Logix.Module.make("DocsRunner.ResultBudget", {
      state: Schema.Void,
      actions: {},
    });

    export const Program = Logix.Program.make(Root, { initial: undefined, logics: [] });
    export const main = () => Effect.succeed({ value: "x".repeat(1024) });
  `

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(source, { runId, resultMaxBytes: 128 }),
    'docs-program-result-budget.ts',
    runId,
  )

  expect(result).toMatchObject({
    runId,
    ok: false,
    error: {
      kind: 'serialization',
      message: 'result budget exceeded',
    },
    truncated: true,
  })
})

testFn('docs Program Run marks log budget overflow without adding logs to primary projection', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program-log-budget'
  const source = `
    import { Effect, Schema } from "effect";
    import * as Logix from "@logixjs/core";

    const Root = Logix.Module.make("DocsRunner.LogBudget", {
      state: Schema.Void,
      actions: {},
    });

    export const Program = Logix.Program.make(Root, { initial: undefined, logics: [] });
    export const main = () =>
      Effect.gen(function* () {
        yield* Effect.log("one");
        yield* Effect.log("two");
        return { ok: true };
      });
  `

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(source, { runId }),
    'docs-program-log-budget.ts',
    runId,
    { logMaxEntries: 1 },
  )

  expect(result).toMatchObject({
    runId,
    ok: true,
    result: { ok: true },
    truncated: true,
  })
  expect('logs' in (result as any)).toBe(false)
})

testFn('docs Program Run reports worker timeout as transport failure', async () => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  const { startKernelMock } = await import('./msw/kernel-mock.js')
  await startKernelMock(kernelUrl)
  const { createSandboxClient } = await import('../../src/Client.js')
  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    kernelUrl,
    timeout: 1000,
  })
  await client.init()

  const runId = 'run:test:docs-program-timeout'
  const source = `
    import { Effect, Schema } from "effect";
    import * as Logix from "@logixjs/core";

    const Root = Logix.Module.make("DocsRunner.Timeout", {
      state: Schema.Void,
      actions: {},
    });

    export const Program = Logix.Program.make(Root, { initial: undefined, logics: [] });
    export const main = () => Effect.never;
  `

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(source, { runId }),
    'docs-program-timeout.ts',
    runId,
  )

  expect(result).toMatchObject({
    runId,
    ok: false,
    error: {
      kind: 'timeout',
    },
  })
})

testFn('docs Program Run reports close timeout as runtime transport failure', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program-close-timeout'
  const source = `
    import { Effect, Schema, Scope } from "effect";
    import * as Logix from "@logixjs/core";

    const Root = Logix.Module.make("DocsRunner.CloseTimeout", {
      state: Schema.Void,
      actions: {},
    });

    export const Program = Logix.Program.make(Root, { initial: undefined, logics: [] });
    export const main = (ctx) =>
      Effect.gen(function* () {
        yield* Scope.addFinalizer(
          ctx.scope,
          Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 50))),
        );
        return { ok: true };
      });
  `

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(source, { runId, closeScopeTimeout: 10 }),
    'docs-program-close-timeout.ts',
    runId,
  )

  expect(result).toMatchObject({
    runId,
    ok: false,
    error: {
      kind: 'runtime',
    },
  })
  expect(String((result as any).error.message)).toContain('dispose timed out')
  expect('stage' in (result as any)).toBe(false)
  expect('repairHints' in (result as any)).toBe(false)
})
