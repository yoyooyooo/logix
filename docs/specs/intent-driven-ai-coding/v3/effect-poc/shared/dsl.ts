import { Context, Effect, Ref } from "effect";

// 1. 定义 DSL Tag，与服务契约通过 namespace 关联
export class LogicDSL extends Context.Tag("@logix/dsl")<LogicDSL, LogicDSL.Service>() {}

// 2. DSL 服务接口（The Contract）
export namespace LogicDSL {
  export interface Service {
    // State Ops
    set: <T>(ref: Ref.Ref<T> | string, value: T) => Effect.Effect<void>;
    get: <T>(ref: Ref.Ref<T> | string) => Effect.Effect<T>;

    // Service Ops
    call: <T>(service: string, method: string, args: any) => Effect.Effect<T>;

    // Flow Ops
    branch: (
      cond: boolean,
      thenEff: Effect.Effect<void>,
      elseEff: Effect.Effect<void>
    ) => Effect.Effect<void>;

    // Event Ops
    emit: (event: string, payload?: unknown) => Effect.Effect<void>;
    on: (event: string, handler: Effect.Effect<void>) => Effect.Effect<void>;

    // Utils
    sleep: (ms: number) => Effect.Effect<void>;
    log: (msg: string) => Effect.Effect<void>;
  }
}
