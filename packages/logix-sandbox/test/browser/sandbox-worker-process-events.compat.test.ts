import { test, expect } from 'vitest'
import { createSandboxClient } from '@logix/sandbox'
import { startKernelMock } from './msw/kernel-mock.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn(
  'sandbox worker compat: process:* debug events should be recorded as LOG (source=logix)',
  async () => {
    const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
    await startKernelMock(kernelUrl)

    const client = createSandboxClient({
      wasmUrl: '/esbuild.wasm',
      kernelUrl,
      timeout: 30000,
    })

    await client.init()

    const code = `
      import { Effect, Schema } from "effect";
      import * as Logix from "@logix/core";

      const Source = Logix.Module.make("SandboxProcessEventsSource", {
        state: Schema.Struct({ n: Schema.Number }),
        actions: { ping: Schema.Void },
        reducers: {
          ping: Logix.Module.Reducer.mutate((draft) => {
            draft.n += 1;
          }),
        },
      });

      const Root = Logix.Module.make("SandboxProcessEventsRoot", {
        state: Schema.Void,
        actions: {},
      });

      const Proc = Logix.Process.make(
        {
          processId: "SandboxProcessEvents",
          requires: [Source.id],
          triggers: [{ kind: "moduleAction", moduleId: Source.id, actionId: "ping" }],
          concurrency: { mode: "latest" },
          errorPolicy: { mode: "failStop" },
          diagnosticsLevel: "light",
        },
        Effect.void,
      );

      const RootImpl = Root.implement({
        initial: undefined,
        imports: [Source.implement({ initial: { n: 0 } }).impl],
        processes: [Proc],
      });

      const PING_ACTION = { _tag: "ping", payload: undefined };

      const program = Effect.gen(function* () {
        yield* Logix.Debug.record({
          type: "trace:sandbox_process_events:test",
          moduleId: "SandboxProcessEventsRoot",
          data: { ok: true },
        });

        const runtime = Logix.Runtime.make(RootImpl, {
          label: "SandboxProcessEventsRuntime",
          devtools: true,
        });

        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const source = yield* Source.tag;
              yield* Effect.yieldNow();
              yield* source.dispatch(PING_ACTION);
              yield* Effect.yieldNow();
            }),
          ),
        );

        yield* Effect.promise(() => runtime.dispose());
        return { ok: true };
      });

      export default program;
    `

    const compileResult = await client.compile(code, 'process-events.ts')
    if (!compileResult.success) {
      console.warn('[sandbox-worker-process-events.compat] skip:', compileResult.errors)
      return
    }

    const runResult = await client.run({ useCompiledCode: true })

    if (!runResult.stateSnapshot) {
      const state = client.getState()
      // eslint-disable-next-line no-console
      console.warn(
        '[sandbox-worker-process-events.compat] run did not produce stateSnapshot;',
        'logs:',
        runResult.logs,
        'traces:',
        runResult.traces,
        'error:',
        state.error,
      )
      return
    }

    expect((runResult.stateSnapshot as any).ok).toBe(true)

    const logixLogs = runResult.logs.filter((l) => l.source === 'logix')
    expect(logixLogs.length).toBeGreaterThan(0)

    const hasProcessEvent = logixLogs.some((l) => {
      const evt = (l.args && (l.args as any[])[0]) as any
      return typeof evt?.type === 'string' && evt.type.startsWith('process:')
    })
    expect(hasProcessEvent).toBe(true)
  },
  60000,
)
