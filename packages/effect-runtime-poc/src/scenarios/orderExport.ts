import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface FilterService {
  getCurrentFilters: () => Promise<Record<string, unknown>>;
}

export interface TableUiStateService {
  getCurrentState: () => Promise<{ visibleColumns: string[] }>;
}

export interface ExportService {
  submitExportTask: (input: {
    filters: Record<string, unknown>;
    columns: string[];
  }) => Promise<void>;
}

export class FilterServiceTag extends Context.Tag("FilterService")<
  FilterServiceTag,
  FilterService
>() {}

export class TableUiStateServiceTag extends Context.Tag("TableUiStateService")<
  TableUiStateServiceTag,
  TableUiStateService
>() {}

export class ExportServiceTag extends Context.Tag("ExportService")<
  ExportServiceTag,
  ExportService
>() {}

export type OrderExportEnv =
  | LoggerTag
  | FilterServiceTag
  | TableUiStateServiceTag
  | ExportServiceTag;

export const exportOrdersFlow: Effect.Effect<
  void,
  never,
  OrderExportEnv
> = Effect.gen(function* () {
  const logger = yield* LoggerTag;
  const filterService = yield* FilterServiceTag;
  const tableStateService = yield* TableUiStateServiceTag;
  const exportService = yield* ExportServiceTag;

  const filters = yield* Effect.promise(() =>
    filterService.getCurrentFilters(),
  );
  const tableState = yield* Effect.promise(() =>
    tableStateService.getCurrentState(),
  );

  logger.info("exportOrdersFlow.start", {
    filters,
    columns: tableState.visibleColumns,
  });

  yield* Effect.promise(() =>
    exportService.submitExportTask({
      filters,
      columns: tableState.visibleColumns,
    }),
  );

  logger.info("exportOrdersFlow.done", {});
});
