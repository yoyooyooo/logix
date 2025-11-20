import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface BulkOperationService {
  applyToMany: (input: { ids: string[]; operation: string }) => Promise<void>;
}

export interface SelectionService {
  getSelectedIds: () => Promise<string[]>;
}

export interface NotificationService {
  info?: (msg: string) => void;
}

export class BulkOperationServiceTag extends Context.Tag("BulkOperationService")<
  BulkOperationServiceTag,
  BulkOperationService
>() {}

export class SelectionServiceTag extends Context.Tag("SelectionService")<
  SelectionServiceTag,
  SelectionService
>() {}

export class NotificationServiceTag extends Context.Tag("NotificationService")<
  NotificationServiceTag,
  NotificationService
>() {}

export type BulkEnv =
  | LoggerTag
  | BulkOperationServiceTag
  | SelectionServiceTag
  | NotificationServiceTag;

export const bulkOperationFlow = (
  operation: string,
): Effect.Effect<void, never, BulkEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const bulk = yield* BulkOperationServiceTag;
    const selection = yield* SelectionServiceTag;
    const notification = yield* NotificationServiceTag;

    const ids = yield* Effect.promise(() => selection.getSelectedIds());
    logger.info("bulkOperation.start", { operation, count: ids.length });
    if (!ids.length) {
      notification.info?.("请先选择记录");
      return;
    }
    yield* Effect.promise(() =>
      bulk.applyToMany({
        ids,
        operation,
      }),
    );
    logger.info("bulkOperation.done", { operation });
  });
