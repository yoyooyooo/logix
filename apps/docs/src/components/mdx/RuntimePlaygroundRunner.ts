export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

export type RuntimePlaygroundSourceKind = 'program' | 'effect-smoke'

export interface RuntimePlaygroundSource {
  readonly kind: RuntimePlaygroundSourceKind
  readonly source: string
  readonly filename: string
}

export interface RuntimePlaygroundRunOptions {
  readonly runId: string
  readonly args?: JsonValue
  readonly resultMaxBytes?: number
}

export type RuntimePlaygroundRunProjection =
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

export const canRunTrial = (source: RuntimePlaygroundSource): boolean => source.kind === 'program'
export const canRunCheck = (source: RuntimePlaygroundSource): boolean => source.kind === 'program'

export const createProgramRunWrapper = (
  source: RuntimePlaygroundSource,
  options: RuntimePlaygroundRunOptions,
): string => {
  if (source.kind !== 'program') {
    throw new Error('Program Run wrappers require a Logix Program source.')
  }

  return `
    import { Effect } from "effect";
    import * as Logix from "@logixjs/core";

    ${source.source}

    const __runId = ${JSON.stringify(options.runId)};
    const __args = ${JSON.stringify(options.args ?? {})};
    const __resultMaxBytes = ${JSON.stringify(options.resultMaxBytes ?? 4096)};

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
            (ctx) => main(ctx, __args),
            { handleSignals: false },
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
        if (__jsonSize(projected) > __resultMaxBytes) {
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
}

export const createProgramCheckWrapper = (source: RuntimePlaygroundSource, runId: string): string => {
  if (source.kind !== 'program') {
    throw new Error('Check wrappers require a Logix Program source.')
  }

  return `
    import { Effect } from "effect";
    import * as Logix from "@logixjs/core";

    ${source.source}

    export default Logix.Runtime.check(Program, {
      runId: ${JSON.stringify(runId)},
    });
  `
}

export const createProgramTrialWrapper = (source: RuntimePlaygroundSource, runId: string): string => {
  if (source.kind !== 'program') {
    throw new Error('Trial wrappers require a Logix Program source.')
  }

  return `
    import { Effect } from "effect";
    import * as Logix from "@logixjs/core";

    ${source.source}

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
}
