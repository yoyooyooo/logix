import { describe, it, expect } from "@effect/vitest";
import { Cause, Effect, Layer, Schema, Stream, SubscriptionRef } from "effect";
import { vi } from "vitest";
import * as Logix from "../../../src/index.js";
import * as ModuleRuntimeImpl from "../../../src/internal/runtime/ModuleRuntime.js";
import * as BoundApiRuntime from "../../../src/internal/runtime/BoundApiRuntime.js";
import {
  makeModuleInstanceKey,
  makeRuntimeStore,
  type ModuleInstanceKey,
  type RuntimeStoreModuleCommit,
  type RuntimeStorePendingDrain,
} from "../../../src/internal/runtime/core/RuntimeStore.js";
import * as StateTransaction from "../../../src/internal/runtime/core/StateTransaction.js";
import {
  flushAllHostScheduler,
  makeTestHostScheduler,
  testHostSchedulerLayer,
} from "../testkit/hostSchedulerTestKit.js";

const makeManualStore = <T>(initial: T) => {
  let current = initial;
  const listeners = new Set<() => void>();
  const store: Logix.ExternalStore.ExternalStore<T> = {
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const set = (next: T) => {
    current = next;
    for (const listener of listeners) {
      listener();
    }
  };
  return { store, set };
};

const installPathSplitCounter = (path: string) => {
  const originalSplit = String.prototype.split;
  let count = 0;
  const spy = vi.spyOn(String.prototype, "split").mockImplementation(
    (function (this: string, splitter: unknown, limit?: number) {
      if (splitter === "." && String(this) === path) {
        count += 1;
      }
      return originalSplit.call(this, splitter as any, limit);
    }) as any,
  );

  return {
    read: () => count,
    reset: () => {
      count = 0;
    },
    restore: () => {
      spy.mockRestore();
    },
  };
};

const flushMicrotasks = (times = 2): Effect.Effect<void> =>
  Effect.forEach(Array.from({ length: Math.max(0, times) }), () =>
    Effect.gen(function* () {
      yield* Effect.promise(() => new Promise<void>((r) => queueMicrotask(r)))
      yield* Effect.yieldNow
    })
  ).pipe(Effect.asVoid);

const waitUntil = (predicate: () => boolean, maxTicks = 64): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (let i = 0; i < maxTicks; i += 1) {
      if (predicate()) return;
      yield* flushMicrotasks(1);
    }
    return yield* Effect.die(new Error('waitUntil timed out'));
  });

type ExternalStoreIngestProxyPhaseSample = {
  readonly phaseSetMs: number;
  readonly phaseCommitMs: number;
  readonly phaseCommitWithStateMs: number;
  readonly phasePreStoreCommitMs: number;
  readonly phaseStoreCommitInnerMs: number;
  readonly phasePostStoreCommitMs: number;
  readonly phaseTickFlushLagMs: number;
  readonly phaseWaitForBatchOrEnqueueMs: number;
  readonly phaseYieldMicrotaskMs: number;
  readonly phaseFlushBeforeCommitMs: number;
  readonly phaseTailMs: number;
  readonly phaseTopicBumpMs: number;
  readonly phaseListenerSnapshotFlattenMs: number;
  readonly phaseListenerCallbackFanoutMs: number;
  readonly tickDelta: number;
  readonly finalValues: ReadonlyArray<number>;
};

const measureMs = (run: () => void): number => {
  const startedAt = process.hrtime.bigint();
  run();
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
};

const measureRuntimeStoreCommitProxyPhases = (): Pick<
  ExternalStoreIngestProxyPhaseSample,
  "phaseTopicBumpMs" | "phaseListenerSnapshotFlattenMs" | "phaseListenerCallbackFanoutMs"
> => {
  const moduleCount = 4;
  const listenersPerTopic = 16;
  const iterations = 256;

  const makeStoreCase = (withListeners: boolean) => {
    const store = makeRuntimeStore();
    const topics: Array<ModuleInstanceKey> = Array.from({ length: moduleCount }, (_, index) => {
      const moduleId = `PerfRuntimeStoreCommitProxy.M${index}`;
      const instanceId = "instance";
      const moduleInstanceKey = makeModuleInstanceKey(moduleId, instanceId);
      store.registerModuleInstance({
        moduleId,
        instanceId,
        moduleInstanceKey,
        initialState: { value: index },
      });

      if (withListeners) {
        for (let i = 0; i < listenersPerTopic; i += 1) {
          store.subscribeTopic(moduleInstanceKey, () => {});
        }
      }

      return moduleInstanceKey;
    });

    return { store, topics };
  };

  const makeAccepted = (topics: ReadonlyArray<ModuleInstanceKey>, tickSeq: number): RuntimeStorePendingDrain => ({
    modules: new Map<ModuleInstanceKey, RuntimeStoreModuleCommit>(
      topics.map((topicKey, index) => [
        topicKey,
        {
          moduleId: `PerfRuntimeStoreCommitProxy.M${index}`,
          instanceId: "instance",
          moduleInstanceKey: topicKey,
          state: { value: tickSeq + index },
          meta: {
            txnSeq: tickSeq,
            txnId: `txn-${tickSeq}-${index}`,
            commitMode: "normal" as const,
            priority: "normal" as const,
            originKind: "trait-external-store",
            originName: "value",
          },
          opSeq: index + 1,
        },
      ]),
    ),
    dirtyTopics: new Map(topics.map((topicKey) => [topicKey, "normal" as const])),
  });

  const bumpCase = makeStoreCase(false);
  let tickSeq = 1;
  const topicBumpTotalMs = measureMs(() => {
    for (let i = 0; i < iterations; i += 1) {
      bumpCase.store.commitTick({
        tickSeq,
        accepted: makeAccepted(bumpCase.topics, tickSeq),
      });
      tickSeq += 1;
    }
  });

  const flattenCase = makeStoreCase(true);
  tickSeq = 1;
  let flattenedListeners = 0;
  const snapshotFlattenTotalMs = measureMs(() => {
    for (let i = 0; i < iterations; i += 1) {
      const committed = flattenCase.store.commitTick({
        tickSeq,
        accepted: makeAccepted(flattenCase.topics, tickSeq),
      });
      flattenedListeners += committed.changedTopicListeners.length;
      tickSeq += 1;
    }
  });

  const fanoutCase = makeStoreCase(true);
  tickSeq = 1;
  let callbackCount = 0;
  const callbackFanoutTotalMs = measureMs(() => {
    for (let i = 0; i < iterations; i += 1) {
      const committed = fanoutCase.store.commitTick({
        tickSeq,
        accepted: makeAccepted(fanoutCase.topics, tickSeq),
      });
      for (const listener of committed.changedTopicListeners) {
        listener();
        callbackCount += 1;
      }
      tickSeq += 1;
    }
  });

  if (flattenedListeners === 0 || callbackCount === 0) {
    throw new Error("runtimeStore proxy perf skeleton produced no listener fanout");
  }

  return {
    phaseTopicBumpMs: topicBumpTotalMs / iterations,
    phaseListenerSnapshotFlattenMs: Math.max(0, (snapshotFlattenTotalMs - topicBumpTotalMs) / iterations),
    phaseListenerCallbackFanoutMs: Math.max(0, (callbackFanoutTotalMs - snapshotFlattenTotalMs) / iterations),
  };
};

const makeTracingHostScheduler = () => {
  const base = makeTestHostScheduler();
  let firstMicrotaskScheduledAt: number | undefined;
  let firstMicrotaskInvokedAt: number | undefined;

  const scheduler = {
    ...base,
    scheduleMicrotask: (cb: () => void) => {
      const scheduledAt = performance.now();
      if (firstMicrotaskScheduledAt === undefined) {
        firstMicrotaskScheduledAt = scheduledAt;
      }
      base.scheduleMicrotask(() => {
        if (firstMicrotaskInvokedAt === undefined) {
          firstMicrotaskInvokedAt = performance.now();
        }
        cb();
      });
    },
  };

  return {
    scheduler,
    base,
    reset() {
      firstMicrotaskScheduledAt = undefined;
      firstMicrotaskInvokedAt = undefined;
    },
    read() {
      return {
        firstMicrotaskScheduledAt,
        firstMicrotaskInvokedAt,
      };
    },
  };
};

const runExternalStoreIngestProxyPhaseSample = (): Effect.Effect<ExternalStoreIngestProxyPhaseSample> =>
  Effect.scoped(
    Effect.gen(function* () {
      const moduleCount = 4;
      const StateSchema = Schema.Struct({ value: Schema.Number });
      type State = Schema.Schema.Type<typeof StateSchema>;
      const tracingHostScheduler = makeTracingHostScheduler();

      const stores = Array.from({ length: moduleCount }, (_, index) => makeManualStore(index));
      const modules = stores.map((entry, index) =>
        Logix.Module.make(`ExternalStoreIngestProxyPerf.M${index}`, {
          state: StateSchema,
          actions: {},
          traits: Logix.StateTrait.from(StateSchema)({
            value: Logix.StateTrait.externalStore({ store: entry.store }),
          }),
        }),
      );

      const Root = Logix.Module.make("ExternalStoreIngestProxyPerf.Root", {
        state: Schema.Void,
        actions: {},
      });

      const runtime = Logix.Runtime.make(
        Root.implement({
          initial: undefined,
          imports: modules.map((moduleDef, index) =>
            moduleDef.implement({
              initial: { value: index },
              imports: [],
              logics: [],
            }).impl,
          ),
        }),
        {
          layer: testHostSchedulerLayer(tracingHostScheduler.scheduler as any),
        },
      );

      yield* Effect.addFinalizer(() => Effect.promise(() => runtime.dispose()).pipe(Effect.orDie));

      const moduleRuntimes = (yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.all(
            modules.map((moduleDef) => Effect.service(moduleDef.tag).pipe(Effect.orDie)),
            { concurrency: "unbounded" },
          ) as any,
        ),
      ).pipe(Effect.orDie)) as ReadonlyArray<Logix.ModuleRuntime<State, any>>;

      const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime as any);
      const mutableRuntimeStore = runtimeStore as any;
      const originalCommitTick = mutableRuntimeStore.commitTick.bind(runtimeStore);
      const originalCommitWithState = StateTransaction.commitWithState;
      let firstCommitEnteredAt: number | undefined;
      let lastCommitExitedAt: number | undefined;
      let firstCommitWithStateStartedAt: number | undefined;
      let lastCommitWithStateEndedAt: number | undefined;

      mutableRuntimeStore.commitTick = ((args: {
        readonly tickSeq: number;
        readonly accepted: RuntimeStorePendingDrain;
        readonly onListener?: (listener: () => void) => void;
      }): ReturnType<typeof originalCommitTick> => {
        const enteredAt = performance.now();
        if (firstCommitEnteredAt === undefined) {
          firstCommitEnteredAt = enteredAt;
        }
        const committed = originalCommitTick(args);
        lastCommitExitedAt = performance.now();
        return committed;
      }) as typeof originalCommitTick;

      const commitWithStateSpy = vi
        .spyOn(StateTransaction, "commitWithState")
        .mockImplementation(((ctx, stateRef) =>
          Effect.gen(function* () {
            const startedAt = performance.now();
            if (firstCommitWithStateStartedAt === undefined) {
              firstCommitWithStateStartedAt = startedAt;
            }
            const result = yield* originalCommitWithState(ctx as any, stateRef as any);
            lastCommitWithStateEndedAt = performance.now();
            return result;
          })) as typeof StateTransaction.commitWithState);

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          commitWithStateSpy.mockRestore();
        }),
      );

      yield* flushAllHostScheduler(tracingHostScheduler.base);
      const baseTick = runtimeStore.getTickSeq();
      tracingHostScheduler.reset();

      const setStartedAt = performance.now();
      stores.forEach((entry, index) => {
        entry.set(100 + index);
      });
      const setFinishedAt = performance.now();

      const readStateValue = (moduleRuntime: Logix.ModuleRuntime<State, any>): number => {
        const state = runtimeStore.getModuleState(`${moduleRuntime.moduleId}::${moduleRuntime.instanceId}` as any) as State | undefined;
        return state?.value ?? Number.NaN;
      };

      yield* waitUntil(
        () =>
          runtimeStore.getTickSeq() > baseTick &&
          moduleRuntimes.every((moduleRuntime, index) => readStateValue(moduleRuntime) === 100 + index),
        128,
      );
      yield* flushAllHostScheduler(tracingHostScheduler.base);
      const committedAt = performance.now();

      const tailStartedAt = performance.now();
      const finalTick = runtimeStore.getTickSeq();
      const finalValues = moduleRuntimes.map((moduleRuntime) => readStateValue(moduleRuntime));
      const tailFinishedAt = performance.now();
      const commitProxy = measureRuntimeStoreCommitProxyPhases();
      const commitEnteredAt = firstCommitEnteredAt ?? committedAt;
      const commitExitedAt = lastCommitExitedAt ?? commitEnteredAt;
      const commitWithStateStartedAt = firstCommitWithStateStartedAt ?? commitEnteredAt;
      const commitWithStateEndedAt = lastCommitWithStateEndedAt ?? commitWithStateStartedAt;
      const { firstMicrotaskScheduledAt, firstMicrotaskInvokedAt } = tracingHostScheduler.read();
      const microtaskScheduledAt = firstMicrotaskScheduledAt ?? commitWithStateEndedAt;
      const microtaskInvokedAt = firstMicrotaskInvokedAt ?? microtaskScheduledAt;

      const sample = {
        phaseSetMs: setFinishedAt - setStartedAt,
        phaseCommitMs: committedAt - setFinishedAt,
        phaseCommitWithStateMs: Math.max(0, commitWithStateEndedAt - commitWithStateStartedAt),
        phasePreStoreCommitMs: Math.max(0, commitWithStateStartedAt - setFinishedAt),
        phaseStoreCommitInnerMs: Math.max(0, commitExitedAt - commitEnteredAt),
        phasePostStoreCommitMs: Math.max(0, commitWithStateEndedAt - commitExitedAt),
        phaseTickFlushLagMs: Math.max(0, commitEnteredAt - commitWithStateEndedAt),
        phaseWaitForBatchOrEnqueueMs: Math.max(0, microtaskScheduledAt - commitWithStateEndedAt),
        phaseYieldMicrotaskMs: Math.max(0, microtaskInvokedAt - microtaskScheduledAt),
        phaseFlushBeforeCommitMs: Math.max(0, commitEnteredAt - microtaskInvokedAt),
        phaseTailMs: tailFinishedAt - tailStartedAt,
        phaseTopicBumpMs: commitProxy.phaseTopicBumpMs,
        phaseListenerSnapshotFlattenMs: commitProxy.phaseListenerSnapshotFlattenMs,
        phaseListenerCallbackFanoutMs: commitProxy.phaseListenerCallbackFanoutMs,
        tickDelta: finalTick - baseTick,
        finalValues,
      } satisfies ExternalStoreIngestProxyPhaseSample;

      console.info("PERF_EXTERNAL_STORE_INGEST_PROXY", JSON.stringify(sample));

      return sample;
    }),
  );

describe("StateTrait.externalStore runtime semantics", () => {
  it.effect(
    "init is atomic (no missed updates between getSnapshot and subscribe)",
    () =>
      Effect.gen(function* () {
        const StateSchema = Schema.Struct({ value: Schema.Number });
        type State = Schema.Schema.Type<typeof StateSchema>;

        type Shape = Logix.Module.Shape<
          typeof StateSchema,
          { noop: typeof Schema.Void }
        >;
        type Action = Logix.Module.ActionOf<Shape>;

        let current = 0;
        const listeners = new Set<() => void>();
        const store: Logix.ExternalStore.ExternalStore<number> = {
          getSnapshot: () => current,
          subscribe: (listener) => {
            // Simulate an update happening just before subscription is fully registered.
            current = 1;
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          },
        };

        const program = Logix.StateTrait.build(
          StateSchema,
          Logix.StateTrait.from(StateSchema)({
            value: Logix.StateTrait.externalStore({ store }),
          })
        );

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
          { value: -1 },
          {
            moduleId: "StateTraitExternalStoreAtomicInitTest",
          }
        );

        const bound = BoundApiRuntime.make<Shape, never>(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: { noop: Schema.Void } as any,
          } as any,
          runtime as any,
          {
            getPhase: () => "run",
            moduleId: "StateTraitExternalStoreAtomicInitTest",
          }
        );

        yield* Logix.StateTrait.install(bound as any, program);

        const afterInstall = (yield* runtime.getState) as State;
        expect(afterInstall.value).toBe(1);
        expect(listeners.size).toBe(1);
      })
  );

  it.effect("select/equals gating avoids redundant commits", () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number });
      type State = Schema.Schema.Type<typeof StateSchema>;

      type Shape = Logix.Module.Shape<
        typeof StateSchema,
        { noop: typeof Schema.Void }
      >;
      type Action = Logix.Module.ActionOf<Shape>;

      const { store, set } = makeManualStore({ a: 1, b: 0 });

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          value: Logix.StateTrait.externalStore({
            store,
            select: (s: any) => (s as any).a,
            equals: (a, b) => a === b,
          }),
        })
      );

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: 0 },
        {
          moduleId: "StateTraitExternalStoreSelectEqualsTest",
        }
      );

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => "run",
          moduleId: "StateTraitExternalStoreSelectEqualsTest",
        }
      );

      yield* Logix.StateTrait.install(bound as any, program);

      const commits: Array<{
        readonly value: number;
        readonly originKind?: string;
      }> = [];
      yield* Effect.forkScoped(
        Stream.runForEach(
          runtime.changesWithMeta((s) => s.value),
          ({ value, meta }) =>
            Effect.sync(() =>
              commits.push({ value, originKind: meta.originKind })
            )
        )
      );
      yield* flushMicrotasks(1);
      commits.length = 0;

      set({ a: 1, b: 1 });
      yield* flushMicrotasks(6);
      const afterNoChange = (yield* runtime.getState) as State;
      expect(afterNoChange.value).toBe(1);

      set({ a: 2, b: 1 });
      yield* waitUntil(() => commits.length === 1, 64);
      const afterChange = (yield* runtime.getState) as State;
      expect(afterChange.value).toBe(2);

      // Only the second update should commit (a:1->a:2); b-only changes are gated.
      expect(commits.map((c) => c.value)).toEqual([2]);
    })
  );

  it.effect("single-field shallow writeback should not re-parse fieldPath at runtime", () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number });
      type State = Schema.Schema.Type<typeof StateSchema>;

      type Shape = Logix.Module.Shape<
        typeof StateSchema,
        { noop: typeof Schema.Void }
      >;
      type Action = Logix.Module.ActionOf<Shape>;

      const { store, set } = makeManualStore(0);

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          value: Logix.StateTrait.externalStore({ store }),
        }),
      );

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: -1 },
        {
          moduleId: "StateTraitExternalStoreShallowPathParseGuardTest",
        },
      );

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => "run",
          moduleId: "StateTraitExternalStoreShallowPathParseGuardTest",
        },
      );

      yield* Logix.StateTrait.install(bound as any, program);
      yield* flushMicrotasks(2);

      const commits: Array<number> = [];
      yield* Effect.forkScoped(
        Stream.runForEach(
          runtime.changesWithMeta((s) => s.value),
          ({ value }) => Effect.sync(() => commits.push(value)),
        ),
      );
      yield* flushMicrotasks(1);
      commits.length = 0;

      const counter = installPathSplitCounter("value");
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          counter.restore();
        }),
      );
      counter.reset();

      set(1);
      yield* waitUntil(() => commits.length === 1, 64);

      const after = (yield* runtime.getState) as State;
      expect(after.value).toBe(1);
      expect(commits).toEqual([1]);
      expect(counter.read()).toBe(0);
    }),
  );

  it.effect("single-field deep same-value no-op should not re-parse fieldPath at runtime", () =>
    Effect.gen(function* () {
      const InnerSchema = Schema.Struct({ value: Schema.Number });
      const StateSchema = Schema.Struct({ nested: InnerSchema });
      type State = Schema.Schema.Type<typeof StateSchema>;

      type Shape = Logix.Module.Shape<
        typeof StateSchema,
        { noop: typeof Schema.Void }
      >;
      type Action = Logix.Module.ActionOf<Shape>;

      const { store, set } = makeManualStore(1);

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          "nested.value": Logix.StateTrait.externalStore({ store }),
        } as any),
      );

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { nested: { value: -1 } },
        {
          moduleId: "StateTraitExternalStoreDeepNoopPathParseGuardTest",
        },
      );

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => "run",
          moduleId: "StateTraitExternalStoreDeepNoopPathParseGuardTest",
        },
      );

      yield* Logix.StateTrait.install(bound as any, program);
      yield* flushMicrotasks(2);

      const commits: Array<number> = [];
      yield* Effect.forkScoped(
        Stream.runForEach(
          runtime.changesWithMeta((s) => s.nested.value),
          ({ value }) => Effect.sync(() => commits.push(value)),
        ),
      );
      yield* flushMicrotasks(1);
      commits.length = 0;

      const counter = installPathSplitCounter("nested.value");
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          counter.restore();
        }),
      );
      counter.reset();

      set(1);
      yield* flushMicrotasks(6);

      const after = (yield* runtime.getState) as State;
      expect(after.nested.value).toBe(1);
      expect(commits).toEqual([]);
      expect(counter.read()).toBe(0);
    }),
  );

  it.effect("invalid externalStore fieldPath should fail fast with patch-first contract error", () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number });
      type State = Schema.Schema.Type<typeof StateSchema>;

      type Shape = Logix.Module.Shape<
        typeof StateSchema,
        { noop: typeof Schema.Void }
      >;
      type Action = Logix.Module.ActionOf<Shape>;

      const { store } = makeManualStore(0);

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          "value[0][": Logix.StateTrait.externalStore({ store }),
        } as any),
      );

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: 0 },
        {
          moduleId: "StateTraitExternalStoreInvalidPathContractTest",
        },
      );

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => "run",
          moduleId: "StateTraitExternalStoreInvalidPathContractTest",
        },
      );

      const exit = yield* Effect.exit(Logix.StateTrait.install(bound as any, program));
      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure") {
        const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect);
        expect(
          defects.some(
            (defect) =>
              defect instanceof Error &&
              defect.message.includes("Patch-first contract requires a normalized trackable path"),
          ),
        ).toBe(true);
      }
    }),
  );

  it.effect(
    "Signal Dirty dedups bursts within the same microtask (writes latest only once)",
    () =>
      Effect.gen(function* () {
        const StateSchema = Schema.Struct({ value: Schema.Number });
        type State = Schema.Schema.Type<typeof StateSchema>;

        type Shape = Logix.Module.Shape<
          typeof StateSchema,
          { noop: typeof Schema.Void }
        >;
        type Action = Logix.Module.ActionOf<Shape>;

        const { store, set } = makeManualStore(0);

        const program = Logix.StateTrait.build(
          StateSchema,
          Logix.StateTrait.from(StateSchema)({
            value: Logix.StateTrait.externalStore({ store }),
          })
        );

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
          { value: -1 },
          {
            moduleId: "StateTraitExternalStoreSignalDedupTest",
          }
        );

        const bound = BoundApiRuntime.make<Shape, never>(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: { noop: Schema.Void } as any,
          } as any,
          runtime as any,
          {
            getPhase: () => "run",
            moduleId: "StateTraitExternalStoreSignalDedupTest",
          }
        );

        yield* Logix.StateTrait.install(bound as any, program);

        const commits: Array<number> = [];
        yield* Effect.forkScoped(
          Stream.runForEach(
            runtime.changesWithMeta((s) => s.value),
            ({ value }) => Effect.sync(() => commits.push(value))
          )
        );
        yield* flushMicrotasks(1);
        commits.length = 0;

        for (let i = 1; i <= 100; i++) {
          set(i);
        }

        yield* waitUntil(() => commits.length === 1, 64);

        const after = (yield* runtime.getState) as State;
        expect(after.value).toBe(100);
        expect(commits).toEqual([100]);
      })
  );

  it.effect("perf skeleton: externalStore ingest proxy phases", () =>
    Effect.gen(function* () {
      const sample = yield* runExternalStoreIngestProxyPhaseSample();

      expect(sample.phaseSetMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseCommitMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseCommitWithStateMs).toBeGreaterThanOrEqual(0);
      expect(sample.phasePreStoreCommitMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseStoreCommitInnerMs).toBeGreaterThanOrEqual(0);
      expect(sample.phasePostStoreCommitMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseTickFlushLagMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseWaitForBatchOrEnqueueMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseYieldMicrotaskMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseFlushBeforeCommitMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseTailMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseTopicBumpMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseListenerSnapshotFlattenMs).toBeGreaterThanOrEqual(0);
      expect(sample.phaseListenerCallbackFanoutMs).toBeGreaterThanOrEqual(0);
      expect(sample.tickDelta).toBeGreaterThanOrEqual(1);
      expect(sample.finalValues.every((value, index) => value === 100 + index)).toBe(true);
    })
  );

  it.effect("committed transaction patches stay stable across later transactions", () =>
    Effect.gen(function* () {
      type State = { readonly value: number };

      const ctx = StateTransaction.makeContext<State>({
        instrumentation: "full",
      });
      const ref = yield* SubscriptionRef.make<State>({ value: 0 });

      StateTransaction.beginTransaction(ctx, { kind: "perf", name: "first" }, { value: 0 });
      StateTransaction.updateDraft(ctx, { value: 1 });
      StateTransaction.recordPatch(ctx, "value", "reducer", 0, 1);
      const firstTxn = yield* StateTransaction.commit(ctx, ref);

      expect(firstTxn?.patches).toHaveLength(1);
      const firstPatch = firstTxn?.patches[0];

      StateTransaction.beginTransaction(ctx, { kind: "perf", name: "second" }, { value: 1 });
      StateTransaction.updateDraft(ctx, { value: 2 });
      StateTransaction.recordPatch(ctx, "value", "reducer", 1, 2);
      const secondTxn = yield* StateTransaction.commit(ctx, ref);

      expect(secondTxn?.patches).toHaveLength(1);
      expect(firstTxn?.patches).toHaveLength(1);
      expect(firstTxn?.patches[0]).toBe(firstPatch);
      expect(firstTxn?.patches[0]).toMatchObject({ from: 0, to: 1 });
      expect(secondTxn?.patches[0]).toMatchObject({ from: 1, to: 2 });
      expect(firstTxn?.patches).not.toBe(secondTxn?.patches);
    })
  );

  it.effect("getSnapshot throw fuses the trait (no further writebacks)", () => {
    const ring = Logix.Debug.makeRingBufferSink(256);
    const DebugLayer = Logix.Debug.replace([ring.sink]);

    return Effect.gen(function* () {
      const StateSchema = Schema.Struct({ value: Schema.Number });
      type State = Schema.Schema.Type<typeof StateSchema>;

      type Shape = Logix.Module.Shape<
        typeof StateSchema,
        { noop: typeof Schema.Void }
      >;
      type Action = Logix.Module.ActionOf<Shape>;

      let current = 0;
      let calls = 0;
      const listeners = new Set<() => void>();
      const store: Logix.ExternalStore.ExternalStore<number> = {
        getSnapshot: () => {
          calls += 1;
          if (calls >= 3) {
            throw new Error("boom");
          }
          return current;
        },
        subscribe: (listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };

      const program = Logix.StateTrait.build(
        StateSchema,
        Logix.StateTrait.from(StateSchema)({
          value: Logix.StateTrait.externalStore({ store }),
        })
      );

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
        { value: 0 },
        {
          moduleId: "StateTraitExternalStoreFuseTest",
        }
      );

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          getPhase: () => "run",
          moduleId: "StateTraitExternalStoreFuseTest",
        }
      );

      yield* Logix.StateTrait.install(bound as any, program);

      const commits: Array<number> = [];
      yield* Effect.forkScoped(
        Stream.runForEach(
          runtime.changesWithMeta((s) => s.value),
          ({ value }) => Effect.sync(() => commits.push(value))
        )
      );

      current = 1;
      for (const listener of listeners) listener();

      yield* flushMicrotasks(4);

      const after = (yield* runtime.getState) as State;
      expect(after.value).toBe(0);
      expect(commits).toEqual([]);

      const events = ring.getSnapshot();
      expect(
        events.some(
          (e) =>
            e.type === "diagnostic" &&
            (e as any).code === "external_store::snapshot_threw"
        )
      ).toBe(true);
    }).pipe(Effect.provide(DebugLayer));
  });

  it("ExternalStore.fromStream fails fast when missing { initial/current }", () => {
    let thrown: unknown;
    try {
      Logix.ExternalStore.fromStream(Stream.empty as any);
    } catch (err) {
      thrown = err;
    }
    expect((thrown as any)?._tag).toBe("ExternalStoreRuntimeError");
    expect((thrown as any)?.code).toBe("external_store::missing_initial");
  });

  it("Static IR export includes ExternalStore policy (ownership/lane/source)", () => {
    const StateSchema = Schema.Struct({ value: Schema.Number });
    const store = Logix.ExternalStore.fromStream(Stream.empty as any, {
      current: 1,
    });

    const program = Logix.StateTrait.build(
      StateSchema,
      Logix.StateTrait.from(StateSchema)({
        value: Logix.StateTrait.externalStore({ store }),
      })
    );

    const ir = Logix.StateTrait.exportStaticIr(
      program,
      "StateTraitExternalStoreStaticIrTest",
      { version: "009" }
    );
    const node = ir.nodes.find((n) => n.kind === "externalStore");

    expect(node?.nodeId).toBe("external-store:value");
    expect(node?.policy && (node.policy as any).ownership).toBe(
      "external-owned"
    );
    expect(node?.policy && (node.policy as any).lane).toBe("urgent");
    expect(node?.policy && typeof (node.policy as any).storeId).toBe("string");
    expect(node?.policy && (node.policy as any).source?.kind).toBe("external");
  });

  it.effect(
    "priority: nonUrgent externalStore writeback maps to low commit priority",
    () =>
      Effect.gen(function* () {
        const StateSchema = Schema.Struct({ value: Schema.Number });
        type State = Schema.Schema.Type<typeof StateSchema>;

        type Shape = Logix.Module.Shape<
          typeof StateSchema,
          { noop: typeof Schema.Void }
        >;
        type Action = Logix.Module.ActionOf<Shape>;

        const { store, set } = makeManualStore(0);

        const program = Logix.StateTrait.build(
          StateSchema,
          Logix.StateTrait.from(StateSchema)({
            value: Logix.StateTrait.externalStore({
              store,
              priority: "nonUrgent",
            }),
          })
        );

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
          { value: 0 },
          {
            moduleId: "StateTraitExternalStoreNonUrgentPriorityTest",
          }
        );

        const bound = BoundApiRuntime.make<Shape, never>(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: { noop: Schema.Void } as any,
          } as any,
          runtime as any,
          {
            getPhase: () => "run",
            moduleId: "StateTraitExternalStoreNonUrgentPriorityTest",
          }
        );

        yield* Logix.StateTrait.install(bound as any, program);

        const priorities: Array<Logix.StateCommitPriority> = [];
        yield* Effect.forkScoped(
          Stream.runForEach(
            runtime.changesWithMeta((s) => (s as any).value),
            ({ meta }) =>
              Effect.sync(() => {
                priorities.push(meta.priority);
              })
          )
        );

        yield* flushMicrotasks(2);
        priorities.length = 0;

        set(1);
        yield* waitUntil(() => priorities.length === 1, 64);

        const after = (yield* runtime.getState) as State;
        expect(after.value).toBe(1);
        expect(priorities).toEqual(["low"]);
      })
  );

  it.effect(
    "ownership guard surfaces as a defect (ExternalOwnedWriteError)",
    () =>
      Effect.gen(function* () {
        const StateSchema = Schema.Struct({ value: Schema.Number });
        type State = Schema.Schema.Type<typeof StateSchema>;

        type Shape = Logix.Module.Shape<
          typeof StateSchema,
          { noop: typeof Schema.Void }
        >;
        type Action = Logix.Module.ActionOf<Shape>;

        const { store } = makeManualStore(0);

        const program = Logix.StateTrait.build(
          StateSchema,
          Logix.StateTrait.from(StateSchema)({
            value: Logix.StateTrait.externalStore({ store }),
          })
        );

        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(
          { value: 0 },
          {
            moduleId: "StateTraitExternalStoreGuardDefectTest",
          }
        );

        const bound = BoundApiRuntime.make<Shape, never>(
          {
            stateSchema: StateSchema,
            actionSchema: Schema.Never as any,
            actionMap: { noop: Schema.Void } as any,
          } as any,
          runtime as any,
          {
            getPhase: () => "run",
            moduleId: "StateTraitExternalStoreGuardDefectTest",
          }
        );

        yield* Logix.StateTrait.install(bound as any, program);

        const exit = yield* Effect.exit(
          bound.state.mutate((draft: any) => {
            draft.value = 1;
          })
        );

        expect(exit._tag).toBe("Failure");
        if (exit._tag === "Failure") {
          const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect);
          expect(
            defects.some(
              (d: unknown) => (d as any)?.name === "ExternalOwnedWriteError"
            )
          ).toBe(true);
        }
      })
  );
});
