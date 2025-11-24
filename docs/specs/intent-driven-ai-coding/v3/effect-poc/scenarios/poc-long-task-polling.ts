import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface LongTaskStatus {
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
}

// 启动长任务并轮询状态直到结束
export const StartAndPollLongTaskPattern = definePattern<{
  payload?: Record<string, unknown>;
}>({
  id: "poc/long-task/start-and-poll",
  version: "1.0.0",
  tags: ["long-task", "polling"],
  config: Schema.Struct({
    payload: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: Schema.Unknown
      })
    )
  }),
  body: ({ payload }) =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log("longTask.start");

      const { taskId } = yield* dsl.call<{ taskId: string }>(
        "LongTaskService",
        "startTask",
        payload ?? {}
      );

      let status = yield* dsl.call<LongTaskStatus>(
        "LongTaskService",
        "getStatus",
        { taskId }
      );

      // 极简轮询示意：真实实现需要超时 / 退避 / 取消等策略
      while (status.status === "PENDING" || status.status === "RUNNING") {
        yield* dsl.sleep(1_000);
        status = yield* dsl.call<LongTaskStatus>(
          "LongTaskService",
          "getStatus",
          { taskId }
        );
      }

      yield* dsl.log(
        `longTask.done taskId=${taskId} status=${status.status}`
      );

      yield* dsl.set("ui.longTask.status", {
        taskId,
        status: status.status
      });
    })
});

