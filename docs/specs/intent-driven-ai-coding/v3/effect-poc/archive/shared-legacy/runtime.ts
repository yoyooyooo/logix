import { Effect, Layer, Ref } from "effect";
import { LogicDSL } from "./dsl";
import type { Pattern } from "./pattern";

// 模拟 Store
const store = new Map<string, unknown>();
// 模拟事件总线
const eventHandlers = new Map<string, Array<(payload: any) => Effect.Effect<void>>>();

const consoleLogicDSL: LogicDSL.Service = {
  set: <T>(ref: Ref.Ref<T> | string, value: T, meta?: any) =>
    Effect.sync(() => {
      const key = typeof ref === "string" ? ref : "Ref";
      store.set(key, value);
      console.log(`[Runtime] SET ${key} =`, value, meta ? `(meta: ${JSON.stringify(meta)})` : "");
    }),

  get: <T>(ref: Ref.Ref<T> | string) =>
    Effect.sync(() => {
      const key = typeof ref === "string" ? ref : "Ref";
      const val = store.get(key) as T | undefined;
      console.log(`[Runtime] GET ${key} ->`, val);
      return val as T;
    }),

  update: <T>(ref: Ref.Ref<T> | string, fn: (old: T) => T) =>
    Effect.sync(() => {
      const key = typeof ref === "string" ? ref : "Ref";
      const oldVal = store.get(key) as T;
      const newVal = fn(oldVal);
      store.set(key, newVal);
      console.log(`[Runtime] UPDATE ${key} =`, newVal);
    }),

  call: <T>(service: string, method: string, args: unknown) =>
    Effect.sync(() => {
      console.log(`[Runtime] CALL ${service}.${method}`, args);
      return { success: true } as unknown as T;
    }),

  emit: (event: string, payload?: unknown) =>
    Effect.gen(function*() {
      yield* Effect.sync(() => {
        console.log(`[Runtime] EMIT ${event}`, payload);
      });
      const handlers = eventHandlers.get(event) ?? [];
      for (const handler of handlers) {
        // 顺序触发所有监听器
        yield* handler(payload);
      }
    }),

  on: <P>(event: string, handler: (payload: P) => Effect.Effect<void>) =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        const list = eventHandlers.get(event) ?? [];
        list.push(handler as any);
        eventHandlers.set(event, list);
        console.log(`[Runtime] ON ${event} (total handlers=${list.length})`);
        return handler;
      }),
      () => Effect.void,
      (h) =>
        Effect.sync(() => {
          const list = eventHandlers.get(event) ?? [];
          const idx = list.indexOf(h as any);
          if (idx !== -1) {
            list.splice(idx, 1);
            console.log(`[Runtime] OFF ${event}`);
          }
        })
    ),

  sleep: (ms: number) =>
    Effect.promise(
      () => new Promise<void>(resolve => setTimeout(resolve, ms))
    ),

  log: (msg: string) =>
    Effect.sync(() => console.log(`[Runtime] LOG: ${msg}`)),

  run: <C>(pattern: Pattern<C>, config: C) =>
    Effect.gen(function*() {
      console.log(`[Runtime] RUN Pattern ${pattern.meta.id}`);
      yield* pattern(config);
    })
};

export const ConsoleRuntime = Layer.succeed(LogicDSL, consoleLogicDSL);
