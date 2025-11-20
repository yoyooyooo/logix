import * as Effect from "effect/Effect";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface LongTaskService {
  startTask: (
    payload: Record<string, unknown>,
  ) => Promise<{ taskId: string }>;
  getStatus: (taskId: string) => Promise<{
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  }>;
}

export class LongTaskServiceTag extends Context.Tag("LongTaskService")<
  LongTaskServiceTag,
  LongTaskService
>() {}

export type LongTaskEnv = LoggerTag | LongTaskServiceTag;

export const startAndPollLongTaskFlow: Effect.Effect<
  void,
  never,
  LongTaskEnv
> = Effect.gen(function* () {
  const logger = yield* LoggerTag;
  const service = yield* LongTaskServiceTag;

  logger.info("longTask.start", {});
  const { taskId } = yield* Effect.promise(() =>
    service.startTask({}),
  );

  // 极简轮询示意，真实实现应考虑超时/退避/取消等
  // 这些策略在正式实现中应来自 ConstraintIntent + Layer。
  let status = yield* Effect.promise(() =>
    service.getStatus(taskId),
  );
  while (status.status === "PENDING" || status.status === "RUNNING") {
    yield* Clock.sleep(1000);
    status = yield* Effect.promise(() =>
      service.getStatus(taskId),
    );
  }

  logger.info("longTask.done", { taskId, status: status.status });
});
