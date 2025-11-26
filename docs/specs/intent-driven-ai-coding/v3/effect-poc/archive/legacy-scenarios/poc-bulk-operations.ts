import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export interface BulkOperationConfig {
  operation: string;
  emptyMessage?: string;
}

// 批量操作：从 SelectionService 读取选中项并调用 BulkOperationService
export const BulkOperationPattern = definePattern<BulkOperationConfig>({
  id: "poc/bulk-operations",
  version: "1.0.0",
  tags: ["bulk", "selection"],
  config: Schema.Struct({
    operation: Schema.String,
    emptyMessage: Schema.optional(Schema.String)
  }),
  body: config =>
    Effect.gen(function*(_) {
      const dsl = yield* _(LogicDSL);

      const ids = yield* dsl.call<ReadonlyArray<string>>(
        "SelectionService",
        "getSelectedIds",
        {}
      );

      yield* dsl.log(
        `bulkOperation.start operation=${config.operation} count=${ids.length}`
      );

      if (ids.length === 0) {
        // 没有选中项时提示用户
        yield* dsl.call(
          "NotificationService",
          "info",
          { message: config.emptyMessage ?? "请先选择记录" }
        );
        return;
      }

      yield* dsl.call(
        "BulkOperationService",
        "applyToMany",
        { ids: Array.from(ids), operation: config.operation }
      );

      yield* dsl.log(
        `bulkOperation.done operation=${config.operation}`
      );
    })
});

