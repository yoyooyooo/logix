import * as Effect from "effect/Effect";

/**
 * FlowDescriptor 是行为层的统一抽象：
 * - id：Flow 标识，用于 Intent / 运行时路由；
 * - run：给定输入 I，返回一个 Effect 程序。
 */
export interface FlowDescriptor<R, E, I, O> {
  id: string;
  run: (input: I) => Effect.Effect<O, E, R>;
}

export const makeFlow = <R, E, I, O>(config: {
  id: string;
  run: (input: I) => Effect.Effect<O, E, R>;
}): FlowDescriptor<R, E, I, O> => config;
