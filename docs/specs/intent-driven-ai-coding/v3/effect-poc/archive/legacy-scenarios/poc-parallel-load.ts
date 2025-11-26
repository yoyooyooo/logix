import { Effect } from "effect";
import { LogicDSL } from "../shared/dsl";
import { ConsoleRuntime } from "../shared/runtime";
import {
  ParallelLoadPattern,
  type ParallelLoadConfig
} from "../patterns/parallel-load";

// PoC：并行加载用户相关数据的 Pattern。

const program = Effect.gen(function*(_) {
  const dsl = yield* _(LogicDSL);

  yield* dsl.log("poc.parallelLoad.start");

  const config: ParallelLoadConfig = {
    userId: "user-123"
  };
  yield* dsl.run(ParallelLoadPattern, config);

  yield* dsl.log("poc.parallelLoad.done");
});

void Effect.runPromise(
  program.pipe(Effect.provide(ConsoleRuntime))
);
