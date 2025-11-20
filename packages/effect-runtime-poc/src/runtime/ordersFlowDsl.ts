import * as Effect from "effect/Effect";
import { makeFlow, type FlowDescriptor } from "./core";
import { LoggerTag, ClockTag } from "./tags";
import {
  OrderFilterServiceTag,
  OrderListServiceTag,
  OrderSelectionServiceTag,
  OrderBulkUpdateServiceTag,
  OrderExportServiceTag,
  TableStateServiceTag,
  OrdersNotificationServiceTag,
  OrdersAuditServiceTag,
  type OrdersServicesEnv,
  type OrderFilter,
  type OrderListResult,
  type OrderExportStatus,
} from "./ordersTags";
import { applyConstraints, type ConstraintIntent } from "./constraints";

/**
 * 为了简化 PoC，这里只为“批量更新 + 导出 + 轮询”定义一个专用 FlowDsl。
 * 真正的 FlowDslV2 会更通用，但组合方式是一致的：steps[] → 解释为 Effect 程序。
 */

export type OrdersScope = "selected" | "allByFilter";

export interface OrdersBulkExportInput {
  nextStatus: string;
  scope: OrdersScope;
}

export interface OrdersBulkExportOutput {
  taskId: string;
}

export type OrdersBulkExportStep =
  | { kind: "loadFilters" }
  | { kind: "loadTableState" }
  | { kind: "loadSelectionIfNeeded" }
  | { kind: "ensureNonEmptySelectionIfNeeded" }
  | { kind: "bulkUpdate" }
  | { kind: "auditBulkUpdate" }
  | { kind: "export" }
  | { kind: "auditExport" };

export interface OrdersBulkExportFlowDsl {
  id: string;
  steps: OrdersBulkExportStep[];
  constraints?: ConstraintIntent;
}

export type OrdersRuntimeEnv = OrdersServicesEnv | LoggerTag;

/**
 * 一个具体的 FlowDsl 实例：订单批量更新 + 导出。
 */
export const ordersBulkExportFlowDsl: OrdersBulkExportFlowDsl = {
  id: "orders.bulkUpdateThenExport",
  steps: [
    { kind: "loadFilters" },
    { kind: "loadTableState" },
    { kind: "loadSelectionIfNeeded" },
    { kind: "ensureNonEmptySelectionIfNeeded" },
    { kind: "bulkUpdate" },
    { kind: "auditBulkUpdate" },
    { kind: "export" },
    { kind: "auditExport" },
  ],
  constraints: {
    flow: {
      timeoutMs: 30_000,
      retryTimes: 0,
      auditType: "ORDERS_BULK_EXPORT_FLOW",
    },
  },
};

interface OrdersFlowContext {
  filters?: OrderFilter;
  tableState?: { visibleColumns: string[] };
  ids?: string[];
  listResult?: OrderListResult;
  exportStatus?: OrderExportStatus;
  taskId?: string;
}

const interpretStep = (
  step: OrdersBulkExportStep,
  input: OrdersBulkExportInput,
  ctx: OrdersFlowContext,
): Effect.Effect<void, never, OrdersRuntimeEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    switch (step.kind) {
      case "loadFilters": {
        const service = yield* OrderFilterServiceTag;
        const filters = yield* Effect.promise(() =>
          service.getCurrentFilters(),
        );
        logger.info("orders.bulk.filters.loaded", { filters });
        ctx.filters = filters;
        return;
      }
      case "loadTableState": {
        const service = yield* TableStateServiceTag;
        const state = yield* Effect.promise(() =>
          service.getCurrentState(),
        );
        logger.info("orders.bulk.tableState.loaded", {
          columns: state.visibleColumns,
        });
        ctx.tableState = state;
        return;
      }
      case "loadSelectionIfNeeded": {
        if (input.scope !== "selected") return;
        const service = yield* OrderSelectionServiceTag;
        const ids = yield* Effect.promise(() =>
          service.getSelectedOrderIds(),
        );
        logger.info("orders.bulk.selection.loaded", { count: ids.length });
        ctx.ids = ids;
        return;
      }
      case "ensureNonEmptySelectionIfNeeded": {
        if (input.scope !== "selected") return;
        const ids = ctx.ids ?? [];
        const notification = yield* OrdersNotificationServiceTag;
        if (!ids.length) {
          notification.info("请先选择需要操作的订单");
          // 这里通过抛错交由上层约束/调用方决定是否拦截；
          throw new Error("NO_SELECTION");
        }
        return;
      }
      case "bulkUpdate": {
        const service = yield* OrderBulkUpdateServiceTag;
        const filters = ctx.filters;
        const ids = ctx.ids;
        logger.info("orders.bulk.update.start", {
          nextStatus: input.nextStatus,
          scope: input.scope,
          count: ids?.length,
        });
        yield* Effect.promise(() =>
          service.applyStatusChange({
            ids,
            filters: input.scope === "allByFilter" ? filters : undefined,
            nextStatus: input.nextStatus,
          }),
        );
        logger.info("orders.bulk.update.done", {});
        return;
      }
      case "auditBulkUpdate": {
        const audit = yield* OrdersAuditServiceTag;
        const filters = ctx.filters;
        const ids = ctx.ids;
        yield* Effect.promise(() =>
          audit.record({
            type: "BULK_UPDATE",
            payload: {
              nextStatus: input.nextStatus,
              scope: input.scope,
              filters,
              ids,
            },
          }),
        );
        return;
      }
      case "export": {
        const service = yield* OrderExportServiceTag;
        const filters = ctx.filters ?? ({} as OrderFilter);
        const columns = ctx.tableState?.visibleColumns ?? [];
        const ids = ctx.ids;

        logger.info("orders.bulk.export.start", {
          scope: input.scope,
          columns,
        });

        const { taskId } = yield* Effect.promise(() =>
          service.submitExportTask({
            filters,
            columns,
            ids,
          }),
        );

        ctx.taskId = taskId;
        logger.info("orders.bulk.export.submitted", { taskId });

        return;
      }
      case "auditExport": {
        const audit = yield* OrdersAuditServiceTag;
        const filters = ctx.filters;
        const ids = ctx.ids;
        const columns = ctx.tableState?.visibleColumns ?? [];
        const taskId = ctx.taskId!;

        yield* Effect.promise(() =>
          audit.record({
            type: "EXPORT",
            payload: {
              taskId,
              scope: input.scope,
              filters,
              ids,
              columns,
            },
          }),
        );

        return;
      }
    }
  });

/**
 * 将 OrdersBulkExportFlowDsl 编译成 FlowDescriptor：
 * - DSL 负责表达步骤结构；
 * - Effect 解释器负责具体执行逻辑；
 * - ConstraintIntent 决定是否应用超时/重试/审计等横切策略。
 */
export const compileOrdersBulkExportFlow = (
  dsl: OrdersBulkExportFlowDsl,
): FlowDescriptor<OrdersRuntimeEnv, Error, OrdersBulkExportInput, OrdersBulkExportOutput> => {
  const base = makeFlow<OrdersRuntimeEnv, Error, OrdersBulkExportInput, OrdersBulkExportOutput>(
    {
      id: dsl.id,
      run: (input: OrdersBulkExportInput) =>
        Effect.gen(function* () {
          const logger = yield* LoggerTag;
          const ctx: OrdersFlowContext = {};

          for (const step of dsl.steps) {
            try {
              yield* interpretStep(step, input, ctx);
            } catch (error) {
              // 对 NO_SELECTION 这类业务错误，可在调用方或 Constraint 层特殊处理。
              logger.error("orders.bulk.step.error", {
                step: step.kind,
                error,
              });
              throw error;
            }
          }

          if (!ctx.taskId) {
            throw new Error("EXPORT_TASK_NOT_CREATED");
          }

          return { taskId: ctx.taskId };
        }),
    },
  );

  return applyConstraints(base, dsl.constraints);
};

/**
 * 最终导出的 FlowDescriptor：供平台运行时 / 出码运行时共同消费。
 */
export const OrdersBulkExportFlowDescriptor = compileOrdersBulkExportFlow(
  ordersBulkExportFlowDsl,
);

/**
 * 导出任务轮询 FlowDescriptor：独立于导出发起 Flow，可在 UI / 长任务框架中复用。
 */
export interface OrdersPollExportInput {
  taskId: string;
  intervalMs?: number;
}

export interface OrdersPollExportOutput {
  status: OrderExportStatus;
}

export type OrdersPollExportEnv = OrdersRuntimeEnv | ClockTag;

export const OrdersPollExportStatusFlowDescriptor = makeFlow<
  OrdersPollExportEnv,
  Error,
  OrdersPollExportInput,
  OrdersPollExportOutput
>({
  id: "orders.pollExportStatus",
  run: (input: OrdersPollExportInput) =>
    Effect.gen(function* () {
      const logger = yield* LoggerTag;
      const exportService = yield* OrderExportServiceTag;
      const interval = input.intervalMs ?? 1000;

      logger.info("orders.export.poll.start", {
        taskId: input.taskId,
        interval,
      });

      let current = yield* Effect.promise(() =>
        exportService.getExportStatus(input.taskId),
      );

      while (current.status === "PENDING" || current.status === "RUNNING") {
        yield* Effect.sleep(interval);
        current = yield* Effect.promise(() =>
          exportService.getExportStatus(input.taskId),
        );
      }

      logger.info("orders.export.poll.done", {
        taskId: input.taskId,
        status: current.status,
      });

      return { status: current.status };
    }),
});
