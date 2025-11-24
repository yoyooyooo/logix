import { Effect, Layer, Ref } from "effect";
import { LogicDSL } from "./dsl";

// 模拟 Store
const store = new Map<string, unknown>();
// 模拟事件总线
const eventHandlers = new Map<string, Array<Effect.Effect<void>>>();

const consoleLogicDSL: LogicDSL.Service = {
  set: <T>(ref: Ref.Ref<T> | string, value: T) =>
    Effect.sync(() => {
      const key = typeof ref === "string" ? ref : "Ref";
      store.set(key, value);
      console.log(`[Runtime] SET ${key} =`, value);
    }),

  get: <T>(ref: Ref.Ref<T> | string) =>
    Effect.sync(() => {
      const key = typeof ref === "string" ? ref : "Ref";
      const val = store.get(key) as T | undefined;
      console.log(`[Runtime] GET ${key} ->`, val);
      return val as T;
    }),

  call: <T>(svc: string, method: string, args: unknown) =>
    Effect.sync(() => {
      console.log(`[Runtime] CALL ${svc}.${method}`, args);
      return { success: true } as unknown as T; // Mock return
    }),

  branch: (cond: boolean, t: Effect.Effect<void>, e: Effect.Effect<void>) =>
    Effect.sync(() => {
      console.log(`[Runtime] BRANCH condition=${cond}`);
    }).pipe(Effect.flatMap(() => (cond ? t : e))),

  emit: (event: string, payload?: unknown) =>
    Effect.gen(function*() {
      yield* Effect.sync(() => {
        console.log(`[Runtime] EMIT ${event}`, payload);
      });
      const handlers = eventHandlers.get(event) ?? [];
      for (const handler of handlers) {
        // 顺序触发所有监听器
        yield* handler;
      }
    }),

  on: (event: string, handler: Effect.Effect<void>) =>
    Effect.sync(() => {
      const list = eventHandlers.get(event) ?? [];
      list.push(handler);
      eventHandlers.set(event, list);
      console.log(`[Runtime] ON ${event} (total handlers=${list.length})`);
    }),

  sleep: (ms: number) =>
    Effect.promise(
      () => new Promise<void>(resolve => setTimeout(resolve, ms))
    ),

  log: (msg: string) =>
    Effect.sync(() => console.log(`[Runtime] LOG: ${msg}`))
};

export const ConsoleRuntime = Layer.succeed(LogicDSL, consoleLogicDSL);
