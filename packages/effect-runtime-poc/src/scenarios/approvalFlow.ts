import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export type ApprovalDecision = "APPROVE" | "REJECT";

export interface ApprovalContext {
  taskId: string;
  comment?: string;
}

export interface ApprovalService {
  decide: (
    input: ApprovalContext & { decision: ApprovalDecision },
  ) => Promise<void>;
}

export interface TaskService {
  refreshList: () => Promise<void>;
}

export interface AuditService {
  record: (input: {
    taskId: string;
    decision: ApprovalDecision;
    comment?: string;
  }) => Promise<void>;
}

export class ApprovalServiceTag extends Context.Tag("ApprovalService")<
  ApprovalServiceTag,
  ApprovalService
>() {}

export class TaskServiceTag extends Context.Tag("TaskService")<
  TaskServiceTag,
  TaskService
>() {}

export class ApprovalAuditServiceTag extends Context.Tag("ApprovalAuditService")<
  ApprovalAuditServiceTag,
  AuditService
>() {}

export type ApprovalEnv =
  | LoggerTag
  | ApprovalServiceTag
  | TaskServiceTag
  | ApprovalAuditServiceTag;

export const approvalFlow = (
  ctx: ApprovalContext,
  decision: ApprovalDecision,
): Effect.Effect<void, never, ApprovalEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const approval = yield* ApprovalServiceTag;
    const tasks = yield* TaskServiceTag;
    const audit = yield* ApprovalAuditServiceTag;

    logger.info("approvalFlow.start", { taskId: ctx.taskId, decision });

    yield* Effect.promise(() =>
      approval.decide({ ...ctx, decision }),
    );
    yield* Effect.promise(() =>
      audit.record({
        taskId: ctx.taskId,
        decision,
        comment: ctx.comment,
      }),
    );
    yield* Effect.promise(() => tasks.refreshList());

    logger.info("approvalFlow.done", { taskId: ctx.taskId, decision });
  });
