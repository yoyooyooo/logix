import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import { LoggerTag } from "../runtime/tags";

export interface ToggleService {
  toggleFlag: (input: { id: string; nextValue: boolean }) => Promise<void>;
}

export class ToggleServiceTag extends Context.Tag("ToggleService")<
  ToggleServiceTag,
  ToggleService
>() {}

export type OptimisticToggleEnv = LoggerTag | ToggleServiceTag;

// 乐观切换开关：调用方在 UI 层先更新本地 state，再调用此 Flow；
// 若失败，可根据返回的错误信息在 UI 层恢复原值。
export const toggleFlagFlow = (
  id: string,
  nextValue: boolean,
): Effect.Effect<void, unknown, OptimisticToggleEnv> =>
  Effect.gen(function* () {
    const logger = yield* LoggerTag;
    const toggle = yield* ToggleServiceTag;

    logger.info("toggleFlag.start", { id, nextValue });
    try {
      yield* Effect.promise(() =>
        toggle.toggleFlag({
          id,
          nextValue,
        }),
      );
      logger.info("toggleFlag.done", { id, nextValue });
    } catch (error) {
      logger.error("toggleFlag.failed", { id, nextValue, error });
      // 这里不直接恢复 UI，由调用方根据错误决定是否回滚。
      throw error;
    }
  });
