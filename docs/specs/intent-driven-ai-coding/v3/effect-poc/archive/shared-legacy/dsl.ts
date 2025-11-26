import { Context, Effect, Ref, Stream } from "effect";
import type { Pattern } from "./pattern";

// 1. 定义 DSL Tag
export class LogicDSL extends Context.Tag("@logix/dsl")<LogicDSL, LogicDSL.Service>() {}

// 2. DSL 服务接口 (Pipeable & Data-First)
export namespace LogicDSL {
  export interface Service {
    // State Ops
    set: <T>(path: string | Ref.Ref<T>, value: T) => Effect.Effect<void>;
    get: <T>(path: string | Ref.Ref<T>) => Effect.Effect<T>;
    update: <T>(path: string | Ref.Ref<T>, fn: (old: T) => T) => Effect.Effect<void>;

    // Signal Ops
    emit: (signal: string, payload?: any) => Effect.Effect<void>;
    on: <P>(signal: string, handler: (payload: P) => Effect.Effect<void>) => Effect.Effect<unknown>;
    
    // Flow Ops
    sleep: (ms: number) => Effect.Effect<void>;
    log: (msg: string) => Effect.Effect<void>;
    call: <T>(service: string, method: string, args: unknown) => Effect.Effect<T>;
    
    // Composition Ops
    run: <C>(pattern: Pattern<C>, config: C) => Effect.Effect<void, any, LogicDSL>;
  }
}

// 3. Logic 命名空间 (User Facing API)
export const Logic = {
  set: (path: string, value: any) => Effect.gen(function*(_) {
    const impl = yield* _(LogicDSL);
    yield* impl.set(path, value);
  }),
  
  emit: (signal: string, payload?: any) => Effect.gen(function*(_) {
    const impl = yield* _(LogicDSL);
    yield* impl.emit(signal, payload);
  }),
  
  update: (path: string, fn: (old: any) => any) => Effect.gen(function*(_) {
    const impl = yield* _(LogicDSL);
    yield* impl.update(path, fn);
  }),

  // ... 其他算子
};

// 4. Flow 命名空间 (Stream Builder)
export const Flow = {
  // Source
  from: (trigger: Stream.Stream<any>) => trigger,
  
  // Transformers
  debounce: (ms: number) => (stream: Stream.Stream<any>) => 
    stream.pipe(Stream.debounce(ms)),
    
  // Sink
  run: (effect: Effect.Effect<void>) => (stream: Stream.Stream<any>) =>
    stream.pipe(Stream.runForEach(() => effect))
};
