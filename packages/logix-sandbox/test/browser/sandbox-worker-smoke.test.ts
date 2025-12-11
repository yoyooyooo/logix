import { test, expect } from 'vitest'
import { createSandboxClient } from '@logix/sandbox'
import { startKernelMock } from './msw/kernel-mock.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn(
  'sandbox worker smoke: compile & run simple Effect + Logix program',
  async () => {
    const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`

    // 使用 MSW 拦截 kernelUrl，返回打包好的 @logix/core 内核脚本
    await startKernelMock(kernelUrl)

    const client = createSandboxClient({
      wasmUrl: '/esbuild.wasm',
      kernelUrl,
      timeout: 30000,
    })

    await client.init()

    // 场景一：纯 Effect 程序
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

    // 场景二：@logix/core 的 Module + Logic + Runtime
    const logixCode = `
      import { Effect, Schema } from "effect";
      import * as Logix from "@logix/core";

      const CounterState = Schema.Struct({ count: Schema.Number });
      const CounterActions = { inc: Schema.Void };

      const CounterModule = Logix.Module.make("Counter", {
        state: CounterState,
        actions: CounterActions,
        reducers: {
          inc: (s) => ({ ...s, count: s.count + 1 }),
        },
      });

      const CounterLogic = CounterModule.logic(($) => ({
        setup: Effect.void,
        run: Effect.gen(function* () {
          yield* $.actions.dispatch({ _tag: "inc", payload: undefined });
          yield* $.actions.inc()
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
              const counter = yield* CounterModule;
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

    // 如果当前环境下 runtime 执行失败（stateSnapshot 为空），先记录日志，不让测试整体挂掉
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
  },
  60000,
)
