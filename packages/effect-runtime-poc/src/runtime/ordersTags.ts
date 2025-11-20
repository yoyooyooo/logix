import * as Context from "effect/Context";

/**
 * 订单场景领域类型与 Service 契约定义。
 * 这些类型既用于场景 Flow，也用于 Tag / Layer 作为统一契约。
 */

export interface OrderFilter {
  [key: string]: unknown;
}

export interface OrderSummary {
  id: string;
  code: string;
  status: string;
  [key: string]: unknown;
}

export interface OrderListResult {
  items: OrderSummary[];
  total: number;
}

export interface OrderFilterService {
  getCurrentFilters: () => Promise<OrderFilter>;
}

export interface OrderListService {
  listOrders: (filters: OrderFilter) => Promise<OrderListResult>;
}

export interface OrderSelectionService {
  getSelectedOrderIds: () => Promise<string[]>;
}

export interface OrderBulkUpdateService {
  applyStatusChange: (input: {
    ids?: string[];
    filters?: OrderFilter;
    nextStatus: string;
  }) => Promise<void>;
}

export type OrderExportStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface OrderExportService {
  submitExportTask: (input: {
    filters: OrderFilter;
    columns: string[];
    ids?: string[];
  }) => Promise<{ taskId: string }>;
  getExportStatus: (taskId: string) => Promise<{ status: OrderExportStatus }>;
}

export interface TableStateService {
  getCurrentState: () => Promise<{ visibleColumns: string[] }>;
}

export interface OrdersNotificationService {
  info: (msg: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

export interface OrdersAuditService {
  record: (input: {
    type: "BULK_UPDATE" | "EXPORT";
    payload: Record<string, unknown>;
  }) => Promise<void>;
}

/**
 * 订单场景相关 Service Tag 定义。
 * 这些 Tag 是 FlowDsl / Flow 程序与具体实现之间的契约。
 */

export class OrderFilterServiceTag extends Context.Tag("OrderFilterService")<
  OrderFilterServiceTag,
  OrderFilterService
>() {}

export class OrderListServiceTag extends Context.Tag("OrderListService")<
  OrderListServiceTag,
  OrderListService
>() {}

export class OrderSelectionServiceTag extends Context.Tag(
  "OrderSelectionService",
)<OrderSelectionServiceTag, OrderSelectionService>() {}

export class OrderBulkUpdateServiceTag extends Context.Tag(
  "OrderBulkUpdateService",
)<OrderBulkUpdateServiceTag, OrderBulkUpdateService>() {}

export class OrderExportServiceTag extends Context.Tag("OrderExportService")<
  OrderExportServiceTag,
  OrderExportService
>() {}

export class TableStateServiceTag extends Context.Tag("TableStateService")<
  TableStateServiceTag,
  TableStateService
>() {}

export class OrdersNotificationServiceTag extends Context.Tag(
  "OrdersNotificationService",
)<OrdersNotificationServiceTag, OrdersNotificationService>() {}

export class OrdersAuditServiceTag extends Context.Tag("OrdersAuditService")<
  OrdersAuditServiceTag,
  OrdersAuditService
>() {}

/**
 * 订单场景 Flow 运行时常用的环境类型别名。
 */
export type OrdersServicesEnv =
  | OrderFilterServiceTag
  | OrderListServiceTag
  | OrderSelectionServiceTag
  | OrderBulkUpdateServiceTag
  | OrderExportServiceTag
  | TableStateServiceTag
  | OrdersNotificationServiceTag
  | OrdersAuditServiceTag;
