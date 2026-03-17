import { describe, expect, it } from "@effect/vitest";
import { create } from "mutative";
import * as RowId from "../../../src/internal/state-trait/rowid.js";
import { makeExternalStoreFieldAccessor } from "../../../src/internal/state-trait/external-store.js";

type BenchCase =
  | "single-shallow"
  | "single-deep"
  | "single-same-value-noop"
  | "multi-2"
  | "multi-8"
  | "multi-64";

type BenchRequest = {
  readonly fieldPath: string;
  readonly nextValue: unknown;
  readonly accessor: ReturnType<typeof makeExternalStoreFieldAccessor>;
};

type BenchResult = {
  readonly name: BenchCase;
  readonly legacyP95Ms: number;
  readonly optimizedP95Ms: number;
  readonly ratio: number;
};

const measureMs = (run: () => void): number => {
  const startedAt = process.hrtime.bigint();
  run();
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
};

const percentile95 = (samples: ReadonlyArray<number>): number => {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index]!;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const buildBaseState = (): Record<string, unknown> => ({
  value: 0,
  nested: { a: { b: { c: 0 } } },
});

const buildMultiBaseState = (fieldCount: number): Record<string, unknown> => {
  const state: Record<string, unknown> = {};
  for (let index = 0; index < fieldCount; index += 1) {
    state[`f${index}`] = index;
  }
  return state;
};

const legacyApplyBatch = <S>(prevState: S, requests: ReadonlyArray<BenchRequest>): S => {
  if (requests.length === 0) return prevState;

  if (requests.length === 1) {
    const request = requests[0]!;
    const prevValue = RowId.getAtPath(prevState as any, request.fieldPath);
    if (Object.is(prevValue, request.nextValue)) return prevState;
    return create(prevState, (draft) => {
      RowId.setAtPathMutating(draft as any, request.fieldPath, request.nextValue);
    });
  }

  const changes: Array<{ readonly request: BenchRequest; readonly prevValue: unknown }> = [];
  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index]!;
    const prevValue = RowId.getAtPath(prevState as any, request.fieldPath);
    if (Object.is(prevValue, request.nextValue)) continue;
    changes.push({ request, prevValue });
  }

  if (changes.length === 0) return prevState;

  return create(prevState, (draft) => {
    for (let index = 0; index < changes.length; index += 1) {
      const { request } = changes[index]!;
      RowId.setAtPathMutating(draft as any, request.fieldPath, request.nextValue);
    }
  });
};

const optimizedApplyBatch = <S>(prevState: S, requests: ReadonlyArray<BenchRequest>): S => {
  if (requests.length === 0) return prevState;

  if (requests.length === 1) {
    const request = requests[0]!;
    const prevValue = request.accessor.get(prevState as any);
    if (Object.is(prevValue, request.nextValue)) return prevState;
    return create(prevState, (draft) => {
      request.accessor.set(draft as any, request.nextValue);
    });
  }

  return legacyApplyBatch(prevState, requests);
};

const runCase = (name: BenchCase): BenchResult => {
  const warmup = 4;
  const samples = 9;
  const runCount = warmup + samples;
  const legacySamples: number[] = [];
  const optimizedSamples: number[] = [];

  const measure = <S>(baseState: S, iterations: number, makeRequests: (iteration: number) => ReadonlyArray<BenchRequest>) => {
    for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
      let legacyState = clone(baseState);
      const legacyMs = measureMs(() => {
        for (let iteration = 0; iteration < iterations; iteration += 1) {
          legacyState = legacyApplyBatch(legacyState, makeRequests(iteration));
        }
      });
      if (runIndex >= warmup) legacySamples.push(legacyMs);

      let optimizedState = clone(baseState);
      const optimizedMs = measureMs(() => {
        for (let iteration = 0; iteration < iterations; iteration += 1) {
          optimizedState = optimizedApplyBatch(optimizedState, makeRequests(iteration));
        }
      });
      if (runIndex >= warmup) optimizedSamples.push(optimizedMs);
    }
  };

  switch (name) {
    case "single-shallow": {
      measure(buildBaseState(), 24_000, (iteration) => [
        {
          fieldPath: "value",
          nextValue: iteration + 1,
          accessor: makeExternalStoreFieldAccessor("value"),
        },
      ]);
      break;
    }
    case "single-deep": {
      measure(buildBaseState(), 18_000, (iteration) => [
        {
          fieldPath: "nested.a.b.c",
          nextValue: iteration + 1,
          accessor: makeExternalStoreFieldAccessor("nested.a.b.c"),
        },
      ]);
      break;
    }
    case "single-same-value-noop": {
      measure(buildBaseState(), 120_000, () => [
        {
          fieldPath: "nested.a.b.c",
          nextValue: 0,
          accessor: makeExternalStoreFieldAccessor("nested.a.b.c"),
        },
      ]);
      break;
    }
    case "multi-2": {
      measure(buildMultiBaseState(2), 12_000, (iteration) =>
        Array.from({ length: 2 }, (_, index) => ({
          fieldPath: `f${index}`,
          nextValue: iteration + index + 1,
          accessor: makeExternalStoreFieldAccessor(`f${index}`),
        })),
      );
      break;
    }
    case "multi-8": {
      measure(buildMultiBaseState(8), 8_000, (iteration) =>
        Array.from({ length: 8 }, (_, index) => ({
          fieldPath: `f${index}`,
          nextValue: iteration + index + 1,
          accessor: makeExternalStoreFieldAccessor(`f${index}`),
        })),
      );
      break;
    }
    case "multi-64": {
      measure(buildMultiBaseState(64), 2_000, (iteration) =>
        Array.from({ length: 64 }, (_, index) => ({
          fieldPath: `f${index}`,
          nextValue: iteration + index + 1,
          accessor: makeExternalStoreFieldAccessor(`f${index}`),
        })),
      );
      break;
    }
  }

  const legacyP95Ms = percentile95(legacySamples);
  const optimizedP95Ms = percentile95(optimizedSamples);
  return {
    name,
    legacyP95Ms,
    optimizedP95Ms,
    ratio: optimizedP95Ms / legacyP95Ms,
  };
};

describe("StateTrait.externalStore single-field specialized path perf", () => {
  it("micro-bench keeps single-field faster without hurting multi-field neighbors", () => {
    const results = (
      [
        "single-shallow",
        "single-deep",
        "single-same-value-noop",
        "multi-2",
        "multi-8",
        "multi-64",
      ] as const
    ).map((name) => runCase(name));

    console.info("PERF_EXTERNAL_STORE_SINGLE_FIELD", JSON.stringify(results));

    const byName = new Map(results.map((entry) => [entry.name, entry]));
    expect(byName.get("single-shallow")?.ratio).toBeLessThan(0.9);
    expect(byName.get("single-deep")?.ratio).toBeLessThan(0.95);
    expect(byName.get("single-same-value-noop")?.ratio).toBeLessThan(0.85);
    expect(byName.get("multi-2")?.ratio).toBeLessThanOrEqual(1.75);
    expect(byName.get("multi-8")?.ratio).toBeLessThanOrEqual(1.08);
    expect(byName.get("multi-64")?.ratio).toBeLessThanOrEqual(1.15);
  });
});
