import * as Effect from "effect/Effect";
import type * as Duration from "effect/Duration";
import type { FlowDescriptor } from "./core";
import { LoggerTag } from "./tags";
import { OrdersAuditServiceTag } from "./ordersTags";

/**
 * 极简版约束配置，仅用于 PoC：
 * - timeoutMs：Flow 整体超时时间；
 * - retryTimes：失败重试次数；
 * - auditType：是否记录审计日志以及类型标识。
 */
export interface FlowConstraints {
  timeoutMs?: number;
  retryTimes?: number;
  auditType?: string;
}

export interface ConstraintIntent {
  flow?: FlowConstraints;
}

export type ConstraintEnv = LoggerTag | OrdersAuditServiceTag;

export const withTimeout = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  timeoutMs: number,
): Effect.Effect<A, E | Error, R> =>
  effect.pipe(
    Effect.timeoutFail({
      duration: timeoutMs as Duration.DurationInput,
      onTimeout: () => new Error("Flow timeout"),
    }),
  );

export const withRetry = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  times: number,
): Effect.Effect<A, E, R> =>
  Effect.retry(effect, {
    times,
  });

export const withAudit = <R, E, A>(
  effect: Effect.Effect<A, E, R | OrdersAuditServiceTag | LoggerTag>,
  auditType: string,
): Effect.Effect<A, E, R | OrdersAuditServiceTag | LoggerTag> =>
  Effect.tap(effect, result =>
    Effect.gen(function* () {
      const audit = yield* OrdersAuditServiceTag;
      const logger = yield* LoggerTag;
      yield* Effect.promise(() =>
        audit.record({
          type: auditType as any,
          payload: {
            result,
          },
        }),
      );
      logger.info("flow.audit", { auditType });
    }),
  );

/**
 * 将 ConstraintIntent 应用到 FlowDescriptor 上，返回新的 FlowDescriptor。
 * 这里故意保持实现简单，优先保证组合方式清晰。
 */
export const applyConstraints = <R, E, I, O>(
  flow: FlowDescriptor<R, E, I, O>,
  intent: ConstraintIntent | undefined,
): FlowDescriptor<R | ConstraintEnv, E | Error, I, O> => {
  if (!intent?.flow) return flow as any;

  const { timeoutMs, retryTimes, auditType } = intent.flow;

  return {
    id: flow.id,
    run: (input: I) => {
      let fx: Effect.Effect<O, E | Error, R | ConstraintEnv> =
        flow.run(input) as any;

      if (timeoutMs != null) {
        fx = withTimeout(fx, timeoutMs);
      }
      if (retryTimes && retryTimes > 0) {
        fx = withRetry(fx, retryTimes);
      }
      if (auditType) {
        fx = withAudit(fx, auditType);
      }

      return fx;
    },
  };
};
