import { Effect, Schema } from "effect";
import { LogicDSL } from "../shared/dsl";
import { definePattern } from "../shared/pattern";

export const DebouncedSearch = definePattern({
  id: "std/search/debounced",
  version: "1.0.0",
  tags: ["search", "debounce"],
  config: Schema.Struct({
    delay: Schema.Number,
    service: Schema.String,
    method: Schema.String
  }),
  body: config =>
    Effect.gen(function*(_) {
    const dsl = yield* _(LogicDSL);
    
    yield* dsl.log(`Starting search with delay ${config.delay}ms...`);
    yield* dsl.sleep(config.delay);
    
    yield* dsl.set("ui.loading", true);
    const result = yield* dsl.call(config.service, config.method, { query: "test" });
    yield* dsl.set("ui.loading", false);
    
    yield* dsl.log("Search complete");
  })
});
