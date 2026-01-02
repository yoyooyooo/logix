import { test, expect } from 'vitest'
import { createSandboxClient, type MockManifest } from '@logix/sandbox'
import { startKernelMock } from './msw/kernel-mock.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn(
  'sandbox worker emits http/ui/spy/logix-debug traces',
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
      import { Effect } from "effect";
      import * as Logix from "@logix/core";

      const program = Effect.gen(function* () {
        // Trigger a Debug trace:* event; the worker maps it to TRACE(kind:"logix-debug").
        yield* Logix.Debug.record({ type: "trace:demo", payload: { foo: "bar" } });

        // Trigger UI_INTENT
        const bridge = (globalThis as any).logixSandboxBridge;
        if (bridge && typeof bridge.emitUiIntent === "function") {
          bridge.emitUiIntent({
            id: "ui-1",
            component: "Button",
            intent: "action",
            props: { label: "Mock Button" },
            callbacks: [],
          });
        }

        // Trigger Spy observation
        if (bridge && typeof bridge.emitSpy === "function") {
          bridge.emitSpy({ name: "spy-call", target: "sdk-demo", payload: { ok: true } });
        }

        // Hit HTTP Mock
        const resp = yield* Effect.promise(() =>
          fetch("https://api.test.dev/hello").then((r) => r.json()),
        );

        return { ok: true, resp };
      });

      export default program;
    `

    const manifest: MockManifest = {
      http: [
        {
          url: 'https://api.test.dev/hello',
          method: 'GET',
          status: 201,
          delayMs: 5,
          json: { source: 'mock', ok: true },
        },
      ],
    }

    const compileResult = await client.compile(code, 'observable.ts', manifest)
    expect(compileResult.success).toBe(true)

    const runResult = await client.run({ useCompiledCode: true })

    expect(runResult.stateSnapshot && typeof runResult.stateSnapshot === 'object').toBe(true)
    expect((runResult.stateSnapshot as any).ok).toBe(true)

    // UI_INTENT collection
    expect((runResult as any).uiIntents?.length).toBe(1)
    expect((runResult as any).uiIntents?.[0]?.component).toBe('Button')

    const byKind = (kind: string) => runResult.traces.find((t) => (t.attributes as any)?.kind === kind)

    const httpTrace = byKind('http')
    expect(httpTrace).toBeDefined()
    expect((httpTrace!.attributes as any).mode).toBe('mock')
    expect((httpTrace!.attributes as any).status).toBe(201)

    const spyTrace = byKind('spy')
    expect(spyTrace).toBeDefined()
    expect((spyTrace!.attributes as any).target).toBe('sdk-demo')

    const logixDebugTrace = byKind('logix-debug')
    expect(logixDebugTrace).toBeDefined()
    expect((logixDebugTrace!.attributes as any).type).toBe('trace:demo')
  },
  60000,
)
