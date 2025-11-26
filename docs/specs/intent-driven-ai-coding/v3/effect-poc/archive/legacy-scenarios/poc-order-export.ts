import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

// 订单导出：读取当前筛选与可见列并提交导出任务
export const OrderExportPattern = definePattern<{}>({
  id: "poc/order-export",
  version: "1.0.0",
  tags: ["order", "export"],
  config: Schema.Struct({}),
  body: () =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      const filters = yield* dsl.call<Record<string, unknown>>(
        "FilterService",
        "getCurrentFilters",
        {}
      );

      const tableState = yield* dsl.call<{
        visibleColumns: string[];
      }>(
        "TableUiStateService",
        "getCurrentState",
        {}
      );

      yield* dsl.log(
        `exportOrdersFlow.start filters=${JSON.stringify(
          filters
        )} columns=${JSON.stringify(tableState.visibleColumns)}`
      );

      yield* dsl.call(
        "ExportService",
        "submitExportTask",
        {
          filters,
          columns: tableState.visibleColumns
        }
      );

      yield* dsl.log("exportOrdersFlow.done");
    })
});

