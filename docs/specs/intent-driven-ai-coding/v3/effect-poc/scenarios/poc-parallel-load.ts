import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import { ParallelLoadPattern } from "../patterns/parallel-load";

// PoC：并行加载用户相关数据的 Pattern。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("poc.parallelLoad.start");

  yield* ParallelLoadPattern({
    userId: "user-123"
  });

  yield* dsl.log("poc.parallelLoad.done");
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);

