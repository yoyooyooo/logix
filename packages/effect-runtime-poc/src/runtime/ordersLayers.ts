import * as Layer from "effect/Layer";
import * as Effect from "effect/Effect";
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
} from "./ordersTags";
import type {
  OrdersBulkExportInput,
  OrdersBulkExportOutput,
  OrdersPollExportInput,
  OrdersPollExportOutput,
} from "./ordersFlowDsl";
import {
  OrdersBulkExportFlowDescriptor,
  OrdersPollExportStatusFlowDescriptor,
} from "./ordersFlowDsl";

/**
 * 平台级基础 Layer：Logger + Clock。
 */
export const ConsoleLoggerLayer = Layer.succeed(LoggerTag, {
  info: (msg: string, meta?: Record<string, unknown>) => {
    // 在 PoC 中直接使用全局 console，避免引入额外依赖。
    (globalThis as any).console?.log?.(msg, meta ?? {});
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    (globalThis as any).console?.error?.(msg, meta ?? {});
  },
});

export const SystemClockLayer = Layer.succeed(ClockTag, {
  now: () => new Date(),
});

/**
 * 订单场景 Demo 级领域服务实现：
 * - 这里只提供内存/假数据，实现重点在于 Tag + Layer 组合方式。
 */
export const OrdersDemoServicesLayer = Layer.mergeAll(
  Layer.succeed(OrderFilterServiceTag, {
    getCurrentFilters: async () => ({ status: "PENDING" } as Record<
      string,
      unknown
    >),
  }),
  Layer.succeed(OrderListServiceTag, {
    listOrders: async () => ({
      items: [],
      total: 0,
    }),
  }),
  Layer.succeed(OrderSelectionServiceTag, {
    getSelectedOrderIds: async () => ["order-1", "order-2"],
  }),
  Layer.succeed(OrderBulkUpdateServiceTag, {
    applyStatusChange: async () => {
      // no-op
    },
  }),
  Layer.succeed(OrderExportServiceTag, {
    submitExportTask: async () => ({ taskId: "demo-task-id" }),
    getExportStatus: async () => ({ status: "SUCCESS" as const }),
  }),
  Layer.succeed(TableStateServiceTag, {
    getCurrentState: async () => ({
      visibleColumns: ["id", "status", "updatedAt"],
    }),
  }),
  Layer.succeed(OrdersNotificationServiceTag, {
    info: (_msg: string) => {},
    success: (_msg: string) => {},
    error: (_msg: string) => {},
  }),
  Layer.succeed(OrdersAuditServiceTag, {
    record: async () => {
      // no-op
    },
  }),
);

export const OrdersRuntimeLayer = Layer.mergeAll(
  ConsoleLoggerLayer,
  SystemClockLayer,
  OrdersDemoServicesLayer,
);

/**
 * 方便在 PoC 中直接运行的入口函数。
 */
export const runOrdersBulkExport = (
  input: OrdersBulkExportInput,
): Promise<OrdersBulkExportOutput> =>
  Effect.runPromise(
    Effect.provide(OrdersBulkExportFlowDescriptor.run(input), OrdersRuntimeLayer),
  );

export const runOrdersPollExportStatus = (
  input: OrdersPollExportInput,
): Promise<OrdersPollExportOutput> =>
  Effect.runPromise(
    Effect.provide(
      OrdersPollExportStatusFlowDescriptor.run(input),
      OrdersRuntimeLayer,
    ),
  );
