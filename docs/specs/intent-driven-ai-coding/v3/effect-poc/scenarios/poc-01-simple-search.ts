import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import { DebouncedSearch } from "../patterns/debounced-search";

// 业务逻辑：使用统一 DSL + Pattern 触发一次防抖搜索
const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("User typed input...");

  // 使用 Pattern（黑盒积木）
  yield* DebouncedSearch({
    delay: 500,
    service: "CustomerService",
    method: "search"
  });
});

// PoC 运行入口
void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);

