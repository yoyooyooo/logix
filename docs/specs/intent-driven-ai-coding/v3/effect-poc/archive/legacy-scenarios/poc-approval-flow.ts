import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export const ApprovalDecisionSchema = Schema.Union(
  Schema.Literal("APPROVE" as const),
  Schema.Literal("REJECT" as const)
);

export interface ApprovalPatternConfig {
  taskId: string;
  comment?: string;
  decision: "APPROVE" | "REJECT";
}

// 审批流：提交审批决定、记录审计日志并刷新任务列表
export const ApprovalFlowPattern = definePattern<ApprovalPatternConfig>({
  id: "poc/approval-flow",
  version: "1.0.0",
  tags: ["approval", "audit"],
  config: Schema.Struct({
    taskId: Schema.String,
    comment: Schema.optional(Schema.String),
    decision: ApprovalDecisionSchema
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      yield* dsl.log(
        `approvalFlow.start taskId=${config.taskId} decision=${config.decision}`
      );

      // 业务决策
      yield* dsl.call(
        "ApprovalService",
        "decide",
        {
          taskId: config.taskId,
          comment: config.comment,
          decision: config.decision
        }
      );

      // 审计记录
      yield* dsl.call(
        "AuditService",
        "record",
        {
          taskId: config.taskId,
          decision: config.decision,
          comment: config.comment
        }
      );

      // 刷新任务列表
      yield* dsl.call(
        "TaskService",
        "refreshList",
        {}
      );

      yield* dsl.log(
        `approvalFlow.done taskId=${config.taskId} decision=${config.decision}`
      );
    })
});

