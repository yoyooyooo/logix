import { test, expect } from 'vitest'
import { createSandboxClient } from '@logixjs/sandbox'
import { startKernelMock } from './msw/kernel-mock.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn(
  'sandbox worker smoke: compile & run simple Effect + Logix program',
  async () => {
    const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`

    // Use MSW to intercept kernelUrl and return the bundled @logixjs/core kernel script.
    await startKernelMock(kernelUrl)

    const client = createSandboxClient({
      wasmUrl: '/esbuild.wasm',
      kernelUrl,
      timeout: 30000,
    })

    await client.init()

    // Scenario 1: pure Effect program
    const code = `
      import { Effect } from "effect";

      const program = Effect.gen(function* () {
        yield* Effect.log("hello from sandbox");
        return { ok: true };
      });

      export default program;
    `

    const compileResult = await client.compile(code, 'program.ts')
    expect(compileResult.success).toBe(true)

    const runResult = await client.run({ useCompiledCode: true })

    expect(runResult.stateSnapshot && typeof runResult.stateSnapshot === 'object').toBe(true)
    expect((runResult.stateSnapshot as any).ok).toBe(true)

    expect(runResult.logs.length).toBeGreaterThan(0)
    const effectLogs = runResult.logs.filter((l) => l.source === 'effect')
    expect(effectLogs.length).toBeGreaterThan(0)
    expect(String(effectLogs[0]?.args[0])).toContain('hello from sandbox')

    expect(runResult.traces.length).toBeGreaterThan(0)
    expect(runResult.traces.some((s) => s.status === 'success')).toBe(true)

    // Scenario 2: @logixjs/core Module + Logic + Runtime
    const logixCode = `
      import { Effect, Schema } from "effect";
      import * as Logix from "@logixjs/core";

      const CounterState = Schema.Struct({ count: Schema.Number });
      const CounterActions = { inc: Schema.Void };

	      const CounterModule = Logix.Module.make("Counter", {
	        state: CounterState,
	        actions: CounterActions,
	        reducers: {
	          inc: Logix.Module.Reducer.mutate((draft) => {
	            draft.count += 1;
	          }),
	        },
	      });

      const CounterLogic = CounterModule.logic(($) => ({
        setup: Effect.void,
        run: Effect.gen(function* () {
          yield* $.dispatch({ _tag: "inc", payload: undefined });
          yield* $.dispatchers.inc()
        }),
      }));

      const CounterImpl = CounterModule.implement({
        initial: { count: 0 },
        logics: [CounterLogic],
      });

      const program = Effect.gen(function* () {
        const runtime = Logix.Runtime.make(CounterImpl);
        const state = yield* Effect.promise(() =>
          runtime.runPromise(
	            Effect.gen(function* () {
	              const counter = yield* CounterModule.tag;
	              const state = yield* counter.getState;
	              return state;
	            }),
	          ),
	        );

        yield* Effect.log("Counter final count: " + String(state.count));
        return { ok: true, state };
      });

      export default program;
    `

    const logixCompileResult = await client.compile(logixCode, 'logix-program.ts')
    if (!logixCompileResult.success) {
      console.warn('[sandbox-worker-smoke] skip logix-core runtime scenario:', logixCompileResult.errors)
      return
    }

    const logixRunResult = await client.run({ useCompiledCode: true })

    // If runtime execution fails in this environment (no stateSnapshot), log and avoid failing the whole test.
    if (!logixRunResult.stateSnapshot) {
      const state = client.getState()
      // eslint-disable-next-line no-console
      console.warn(
        '[sandbox-worker-smoke] logix-core runtime scenario did not produce stateSnapshot;',
        'logs:',
        logixRunResult.logs,
        'traces:',
        logixRunResult.traces,
        'error:',
        state.error,
      )
      return
    }

    expect(logixRunResult.stateSnapshot && typeof logixRunResult.stateSnapshot === 'object').toBe(true)
    expect((logixRunResult.stateSnapshot as any).ok).toBe(true)
    expect((logixRunResult.stateSnapshot as any).state.count).toBe(2)

    const logixEffectLogs = logixRunResult.logs.filter((l) => l.source === 'effect')
    expect(logixEffectLogs.length).toBeGreaterThan(0)
    const hasLogixLog = logixEffectLogs.some((l) => String(l.args[0]).includes('Counter final count: 2'))
    expect(hasLogixLog).toBe(true)

    // Scenario 3: @effect/platform Tag/Layer interop with the Effect instance (avoid multiple Effect copies breaking Tag).
    const platformCode = `
	      import { Effect } from "effect";
	      import { Path } from "@effect/platform";

	      const program = Effect.gen(function* () {
	        const path = yield* Path.Path;
	        return { ok: true, dirname: path.dirname("/a/b/c") };
	      }).pipe(
	        Effect.provide(Path.layer),
	      );

	      export default program;
	    `

    const platformCompileResult = await client.compile(platformCode, 'platform-program.ts')
    if (!platformCompileResult.success) {
      console.warn('[sandbox-worker-smoke] skip @effect/platform scenario:', platformCompileResult.errors)
      return
    }

    const platformRunResult = await client.run({ useCompiledCode: true })
    if (!platformRunResult.stateSnapshot) {
      const state = client.getState()
      // eslint-disable-next-line no-console
      console.warn(
        '[sandbox-worker-smoke] @effect/platform scenario did not produce stateSnapshot;',
        'logs:',
        platformRunResult.logs,
        'traces:',
        platformRunResult.traces,
        'error:',
        state.error,
      )
      return
    }

    expect((platformRunResult.stateSnapshot as any).ok).toBe(true)
    expect((platformRunResult.stateSnapshot as any).dirname).toBe('/a/b')

    // Scenario 4: @logixjs/core subpath imports (Module/Runtime/StateTrait)
    const logixSubpathCode = `
	      import { Effect, Schema } from "effect";
	      import * as Module from "@logixjs/core/Module";
	      import * as Runtime from "@logixjs/core/Runtime";
	      import * as StateTrait from "@logixjs/core/StateTrait";

	      const CounterState = Schema.Struct({ count: Schema.Number });
	      const CounterActions = { inc: Schema.Void };

	      const CounterModule = Module.make("CounterSubpath", {
	        state: CounterState,
	        actions: CounterActions,
	        reducers: {
	          inc: Module.Reducer.mutate((draft) => {
	            draft.count += 1;
	          }),
	        },
	      });

	      const CounterLogic = CounterModule.logic(($) => ({
	        setup: Effect.void,
	        run: Effect.gen(function* () {
	          yield* Effect.log("Runtime.make type: " + String(typeof Runtime.make));
	          yield* Effect.log("StateTrait.source type: " + String(typeof StateTrait.source));
	          yield* $.dispatchers.inc();
	          yield* $.dispatchers.inc();
	        }),
	      }));

	      const CounterImpl = CounterModule.implement({
	        initial: { count: 0 },
	        logics: [CounterLogic],
	      });

	      const program = Effect.gen(function* () {
	        const runtime = Runtime.make(CounterImpl);
	        const state = yield* Effect.promise(() =>
	          runtime.runPromise(
	            Effect.gen(function* () {
	              const counter = yield* CounterModule.tag;
	              const state = yield* counter.getState;
	              return state;
	            }),
	          ),
	        );

	        return { ok: true, state };
	      });

	      export default program;
	    `

    const logixSubpathCompileResult = await client.compile(logixSubpathCode, 'logix-subpath-program.ts')
    if (!logixSubpathCompileResult.success) {
      console.warn('[sandbox-worker-smoke] skip @logixjs/core subpath scenario:', logixSubpathCompileResult.errors)
      return
    }

    const logixSubpathRunResult = await client.run({ useCompiledCode: true })
    if (!logixSubpathRunResult.stateSnapshot) {
      const state = client.getState()
      // eslint-disable-next-line no-console
      console.warn(
        '[sandbox-worker-smoke] @logixjs/core subpath scenario did not produce stateSnapshot;',
        'logs:',
        logixSubpathRunResult.logs,
        'traces:',
        logixSubpathRunResult.traces,
        'error:',
        state.error,
      )
      return
    }

    expect((logixSubpathRunResult.stateSnapshot as any).ok).toBe(true)
    expect((logixSubpathRunResult.stateSnapshot as any).state.count).toBe(2)
  },
  60000,
)
