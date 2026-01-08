import { describe, it, expect } from "@effect/vitest";
import { Cause, Effect, Schema, Stream } from "effect";
import * as Logix from "../../../src/index.js";
import * as ModuleRuntimeImpl from "../../../src/internal/runtime/ModuleRuntime.js";
import * as BoundApiRuntime from "../../../src/internal/runtime/BoundApiRuntime.js";

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

const flushMicrotasks = (times = 2): Effect.Effect<void> =>
  Effect.forEach(Array.from({ length: Math.max(0, times) }), () =>
    Effect.promise(() => new Promise<void>((r) => queueMicrotask(r)))
  ).pipe(Effect.asVoid);

describe("StateTrait.externalStore runtime semantics", () => {
  it.scoped(
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

  it.scoped("select/equals gating avoids redundant commits", () =>
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
      yield* flushMicrotasks(6);
      const afterChange = (yield* runtime.getState) as State;
      expect(afterChange.value).toBe(2);

      // Only the second update should commit (a:1->a:2); b-only changes are gated.
      expect(commits.map((c) => c.value)).toEqual([2]);
    })
  );

  it.scoped(
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

        yield* flushMicrotasks(6);

        const after = (yield* runtime.getState) as State;
        expect(after.value).toBe(100);
        expect(commits).toEqual([100]);
      })
  );

  it.scoped("getSnapshot throw fuses the trait (no further writebacks)", () => {
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

  it.scoped(
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
        yield* flushMicrotasks(6);

        const after = (yield* runtime.getState) as State;
        expect(after.value).toBe(1);
        expect(priorities).toEqual(["low"]);
      })
  );

  it.scoped(
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
          const defects = Array.from(Cause.defects(exit.cause));
          expect(
            defects.some(
              (d: unknown) => (d as any)?.name === "ExternalOwnedWriteError"
            )
          ).toBe(true);
        }
      })
  );
});
