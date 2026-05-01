import { createSandboxClient } from '../../../src/Client.js'
import type { SandboxClient } from '../../../src/Client.js'
import { startKernelMock } from '../msw/kernel-mock.js'

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

export type DocsRunProjection =
  | {
      readonly runId: string
      readonly ok: true
      readonly result: JsonValue
      readonly durationMs: number
      readonly truncated?: boolean
    }
  | {
      readonly runId: string
      readonly ok: false
      readonly error: {
        readonly kind: 'compile' | 'timeout' | 'serialization' | 'worker' | 'runtime'
        readonly message: string
      }
      readonly durationMs: number
      readonly truncated?: boolean
    }

export interface DocsRunnerFixture {
  readonly client: SandboxClient
  readonly kernelUrl: string
}

export interface DocsRunOptions {
  readonly runId: string
  readonly resultMaxBytes?: number
  readonly logMaxEntries?: number
  readonly closeScopeTimeout?: number
}

export interface RunWrappedSourceOptions {
  readonly logMaxEntries?: number
}

export const createDocsRunnerFixture = async (): Promise<DocsRunnerFixture> => {
  const kernelUrl = `${window.location.origin}/sandbox/logix-core.js`
  await startKernelMock(kernelUrl)

  const client = createSandboxClient({
    wasmUrl: '/esbuild.wasm',
    kernelUrl,
    timeout: 30000,
  })

  await client.init()
  return { client, kernelUrl }
}

export const buildProgramRunWrapper = (moduleCode: string, options: DocsRunOptions): string => `
  import { Effect } from "effect";
  import * as Logix from "@logixjs/core";

  ${moduleCode}

  const __runId = ${JSON.stringify(options.runId)};
  const __resultMaxBytes = ${JSON.stringify(options.resultMaxBytes ?? 4096)};
  const __closeScopeTimeout = ${JSON.stringify(options.closeScopeTimeout ?? 1000)};

  const __jsonSize = (value) => new TextEncoder().encode(JSON.stringify(value)).length;

  const __toJson = (value, seen = new WeakSet(), depth = 0) => {
    if (depth > 16) {
      throw new Error("maximum JSON projection depth exceeded");
    }
    if (value === null) return null;
    if (typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("non-finite number cannot be projected");
      return value;
    }
    if (Array.isArray(value)) {
      if (seen.has(value)) throw new Error("circular array cannot be projected");
      seen.add(value);
      return value.map((item) => __toJson(item, seen, depth + 1));
    }
    if (typeof value === "object" && value !== null) {
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        throw new Error("non-plain object cannot be projected");
      }
      if (seen.has(value)) throw new Error("circular object cannot be projected");
      seen.add(value);
      const out = {};
      for (const key of Object.keys(value).sort()) {
        out[key] = __toJson(value[key], seen, depth + 1);
      }
      return out;
    }
    throw new Error("unsupported JSON projection value: " + typeof value);
  };

  export default Effect.gen(function* () {
    const startedAt = performance.now();
    let value;
    try {
      value = yield* Effect.promise(() =>
        Logix.Runtime.run(
          Program,
          (ctx) => main(ctx, { delta: 2 }),
          { handleSignals: false, closeScopeTimeout: __closeScopeTimeout },
        ),
      );
    } catch (error) {
      return {
        runId: __runId,
        ok: false,
        error: {
          kind: "runtime",
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs: Math.max(0, performance.now() - startedAt),
      };
    }

    try {
      const projected = __toJson(value);
      const size = __jsonSize(projected);
      if (size > __resultMaxBytes) {
        return {
          runId: __runId,
          ok: false,
          error: { kind: "serialization", message: "result budget exceeded" },
          durationMs: Math.max(0, performance.now() - startedAt),
          truncated: true,
        };
      }
      return {
        runId: __runId,
        ok: true,
        result: projected,
        durationMs: Math.max(0, performance.now() - startedAt),
      };
    } catch (error) {
      return {
        runId: __runId,
        ok: false,
        error: {
          kind: "serialization",
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs: Math.max(0, performance.now() - startedAt),
      };
    }
  });
`

export const buildTrialWrapper = (moduleCode: string, runId: string): string => `
  import { Effect } from "effect";
  import * as Logix from "@logixjs/core";

  ${moduleCode}

  export default Effect.gen(function* () {
    return yield* Logix.Runtime.trial(Program, {
      runId: ${JSON.stringify(runId)},
      buildEnv: { hostKind: "browser", config: {} },
      diagnosticsLevel: "off",
      trialRunTimeoutMs: 1000,
      closeScopeTimeout: 500,
    });
  });
`

export const runWrappedSource = async (
  client: SandboxClient,
  source: string,
  filename: string,
  runId: string,
  options?: RunWrappedSourceOptions,
): Promise<unknown> => {
  const compiled = await client.compile(source, filename)
  if (!compiled.success) {
    return {
      runId,
      ok: false,
      error: {
        kind: 'compile',
        message: compiled.errors?.join('\n') ?? 'compile failed',
      },
      durationMs: 0,
    } satisfies DocsRunProjection
  }

  try {
    const result = await client.run({ runId, useCompiledCode: true })
    if (options?.logMaxEntries !== undefined && result.logs.length > options.logMaxEntries) {
      const projected = result.stateSnapshot
      if (typeof projected === 'object' && projected !== null && (projected as any).ok === true) {
        return {
          ...(projected as Record<string, unknown>),
          truncated: true,
        }
      }
    }
    if (result.stateSnapshot !== undefined) {
      return result.stateSnapshot
    }

    const workerError = client.getState().error
    return {
      runId,
      ok: false,
      error: {
        kind: 'runtime',
        message: workerError?.message ?? 'worker run completed without a result projection',
      },
      durationMs: result.duration,
    } satisfies DocsRunProjection
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      runId,
      ok: false,
      error: {
        kind: message.includes('超时') || message.toLowerCase().includes('timeout') ? 'timeout' : 'worker',
        message,
      },
      durationMs: 0,
    } satisfies DocsRunProjection
  }
}

export const programExampleSource = `
  import { Effect, Schema } from "effect";
  import * as Logix from "@logixjs/core";

  const CounterModule = Logix.Module.make("DocsRunner.Counter", {
    state: Schema.Struct({ count: Schema.Number }),
    actions: { inc: Schema.Void },
    reducers: {
      inc: Logix.Module.Reducer.mutate((draft) => {
        draft.count += 1;
      }),
    },
  });

  export const Program = Logix.Program.make(CounterModule, {
    initial: { count: 0 },
    logics: [],
  });

  export const main = (ctx, args) =>
    Effect.gen(function* () {
      for (let i = 0; i < args.delta; i++) {
        yield* ctx.module.dispatch({ _tag: "inc", payload: undefined });
      }
      const state = yield* ctx.module.getState;
      return { count: state.count };
    });
`

export const effectSmokeSource = `
  import { Effect } from "effect";

  export default Effect.succeed({ ok: true });
`
