import * as Effect from "effect/Effect";
import * as Clock from "effect/Clock";
import { LoggerTag } from "../runtime/tags";
import {
  OrderFilterServiceTag,
  OrderListServiceTag,
  OrderSelectionServiceTag,
  OrderBulkUpdateServiceTag,
  OrderExportServiceTag,
  TableStateServiceTag,
  OrdersNotificationServiceTag,
  OrdersAuditServiceTag,
  type OrderListResult,
  type OrderExportStatus,
} from "../runtime/ordersTags";

export type OrdersComplexEnv =
  | LoggerTag
  | OrderFilterServiceTag
  | OrderListServiceTag
  | OrderSelectionServiceTag
  | OrderBulkUpdateServiceTag
  | OrderExportServiceTag
  | TableStateServiceTag
  | OrdersNotificationServiceTag
  | OrdersAuditServiceTag;

export const refreshListFlow: Effect.Effect<
  OrderListResult,
  never,
  OrdersComplexEnv
> = Effect.gen(function* () {
  const logger = yield* LoggerTag;
  const filterService = yield* OrderFilterServiceTag;
  const listService = yield* OrderListServiceTag;

  const filters = yield* Effect.promise(() =>
    filterService.getCurrentFilters(),
  );
  logger.info("ordersComplex.list.start", { filters });
  const list = yield* Effect.promise(() =>
    listService.listOrders(filters),
  );
  logger.info("ordersComplex.list.done", { total: list.total });
  return list;
});

export const bulkUpdateThenExportFlow = (
  input: {
    nextStatus: string;
    scope: "selected" | "allByFilter";
  },
): Effect.Effect<{ taskId: string } | null, never, OrdersComplexEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const filterService = yield* OrderFilterServiceTag;
    const tableStateService = yield* TableStateServiceTag;
    const selectionService = yield* OrderSelectionServiceTag;
    const bulkService = yield* OrderBulkUpdateServiceTag;
    const exportService = yield* OrderExportServiceTag;
    const notification = yield* OrdersNotificationServiceTag;
    const audit = yield* OrdersAuditServiceTag;

    const filters = yield* Effect.promise(() =>
      filterService.getCurrentFilters(),
    );
    const columnsState = yield* Effect.promise(() =>
      tableStateService.getCurrentState(),
    );

    let ids: string[] | undefined;
    if (input.scope === "selected") {
      ids = yield* Effect.promise(() =>
        selectionService.getSelectedOrderIds(),
      );
      if (!ids.length) {
        notification.info("请先选择需要操作的订单");
        return null;
      }
    }

    logger.info("ordersComplex.bulkUpdate.start", {
      nextStatus: input.nextStatus,
      scope: input.scope,
      count: ids?.length,
    });

    yield* Effect.promise(() =>
      bulkService.applyStatusChange({
        ids,
        filters: input.scope === "allByFilter" ? filters : undefined,
        nextStatus: input.nextStatus,
      }),
    );

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

    notification.success("批量更新已提交");

    logger.info("ordersComplex.export.start", {
      filters,
      columns: columnsState.visibleColumns,
      scope: input.scope,
    });

    const { taskId } = yield* Effect.promise(() =>
      exportService.submitExportTask({
        filters,
        columns: columnsState.visibleColumns,
        ids,
      }),
    );

    yield* Effect.promise(() =>
      audit.record({
        type: "EXPORT",
        payload: {
          taskId,
          scope: input.scope,
          filters,
          ids,
          columns: columnsState.visibleColumns,
        },
      }),
    );

    logger.info("ordersComplex.export.submitted", { taskId });

    return { taskId };
  });

export const pollExportStatusFlow = (
  taskId: string,
): Effect.Effect<OrderExportStatus, never, OrdersComplexEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const exportService = yield* OrderExportServiceTag;

    logger.info("ordersComplex.export.poll.start", { taskId });

    let status = yield* Effect.promise(() =>
      exportService.getExportStatus(taskId),
    );

    while (status.status === "PENDING" || status.status === "RUNNING") {
      yield* Clock.sleep(1000);
      status = yield* Effect.promise(() =>
        exportService.getExportStatus(taskId),
      );
    }

    logger.info("ordersComplex.export.poll.done", {
      taskId,
      status: status.status,
    });

    return status.status;
  });
