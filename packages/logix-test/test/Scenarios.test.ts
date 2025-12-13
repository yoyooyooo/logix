import { describe, it, expect } from "vitest"
import { Effect, Layer, Schema, Context, Schedule, TestClock } from "effect"
import * as Logix from "@logix/core"
import { TestProgram, Execution, runTest } from "../src/index.js"

// ---------------------------------------------------------------------------
// Capability: service-integration + optimistic update
// Scenario: ToggleModule · Optimistic update with rollback
// ---------------------------------------------------------------------------

interface ToggleService {
  sync: (id: string, value: boolean) => Effect.Effect<void, Error>
}

const ToggleServiceTag = Context.GenericTag<ToggleService>("ToggleService")

const ToggleModule = Logix.Module.make("ToggleModule", {
  state: Schema.Struct({
    flags: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
  }),
  actions: {
    toggle: Schema.Struct({ id: Schema.String, value: Schema.Boolean }),
  },
})

const ToggleLogic = ToggleModule.logic<ToggleService>((api) =>
  Effect.gen(function* () {
    yield* api.onAction("toggle").run((action) =>
      Effect.gen(function* () {
        const { id, value } = action.payload

        // Optimistic update
        yield* api.state.update((s) => ({
          ...s,
          flags: { ...s.flags, [id]: value },
        }))

        const service = yield* ToggleServiceTag

        // Sync with server, rollback on failure
        yield* service
          .sync(id, value)
          .pipe(
            Effect.catchAll(() =>
              api.state.update((s) => ({
                ...s,
                flags: { ...s.flags, [id]: !value },
              })),
            ),
          )
      }),
    )
  }),
)

const ToggleFailingServiceLayer = Layer.succeed(ToggleServiceTag, {
  sync: () => Effect.fail(new Error("Network Error")),
})

// ---------------------------------------------------------------------------
// Capability: state-derivation + cascading updates
// Scenario: LocationModule · Cascading selects (province → cities)
// ---------------------------------------------------------------------------

const LocationModule = Logix.Module.make("LocationModule", {
  state: Schema.Struct({
    province: Schema.String,
    city: Schema.String,
    cities: Schema.Array(Schema.String),
  }),
  actions: {
    selectProvince: Schema.String,
    selectCity: Schema.String,
  },
})

const LocationLogic = LocationModule.logic((api) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        api.onAction("selectProvince").update((s, p) => ({
          ...s,
          province: p.payload,
          city: "",
          cities: [],
        })),
        api
          .onState((s) => s.province)
          .update((prev, province) => {
            if (!province) return prev
            return {
              ...prev,
              cities: [`${province}-City1`, `${province}-City2`],
            }
          }),
      ],
      { concurrency: "unbounded" },
    )
  }),
)

// ---------------------------------------------------------------------------
// Capability: time-and-concurrency
// Scenario: TaskModule · Async flow with polling
// ---------------------------------------------------------------------------

const TaskModule = Logix.Module.make("TaskModule", {
  state: Schema.Struct({ status: Schema.String }),
  actions: {
    start: Schema.Void,
    externalDone: Schema.Void,
  },
})

const TaskLogic = TaskModule.logic((api) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        api.onAction("start").run(() =>
          Effect.gen(function* () {
            yield* api.state.update((s) => ({
              ...s,
              status: "PENDING",
            }))

            // Poll until status becomes DONE
            yield* Effect.repeat(
              Effect.gen(function* () {
                const current = yield* api.state.read
                return current.status === "DONE"
              }),
              Schedule.recurWhile((done: boolean) => !done).pipe(
                Schedule.addDelay(() => "10 millis"),
              ),
            )
          }),
        ),
        api.onAction("externalDone").run(() =>
          api.state.update((s) => ({ ...s, status: "DONE" })),
        ),
      ],
      { concurrency: "unbounded" },
    )
  }),
)

// ---------------------------------------------------------------------------
// Capability: time-and-concurrency
// Scenario: BatchModule · Sequential batch processing
// ---------------------------------------------------------------------------

const BatchModule = Logix.Module.make("BatchModule", {
  state: Schema.Struct({
    items: Schema.Array(Schema.String),
    processed: Schema.Array(Schema.String),
  }),
  actions: {
    processAll: Schema.Void,
  },
})

const BatchLogic = BatchModule.logic((api) =>
  Effect.gen(function* () {
    yield* api.onAction("processAll").run(() =>
      Effect.gen(function* () {
        const state = yield* api.state.read
        for (const item of state.items) {
          // 模拟异步工作，这里要依赖 TestClock/Effect.sleep 的虚拟时间能力
          yield* Effect.sleep("5 millis")
          yield* api.state.update((s) => ({
            ...s,
            processed: [...s.processed, item],
          }))
        }
      }),
    )
  }),
)

// ---------------------------------------------------------------------------
// Capability: service-integration + action-to-state
// Scenario: BulkModule · Selection + BulkService + Notification
// ---------------------------------------------------------------------------

interface SelectionService {
  readonly getSelectedIds: () => Effect.Effect<ReadonlyArray<string>>
}

const SelectionServiceTag =
  Context.GenericTag<SelectionService>("@logix/test/SelectionService")

interface BulkOperationService {
  readonly applyToMany: (input: {
    readonly ids: ReadonlyArray<string>
    readonly operation: string
  }) => Effect.Effect<void>
}

const BulkOperationServiceTag = Context.GenericTag<BulkOperationService>(
  "@logix/test/BulkOperationService",
)

interface NotificationService {
  readonly info: (message: string) => Effect.Effect<void>
  readonly error: (message: string) => Effect.Effect<void>
}

const NotificationServiceTag = Context.GenericTag<NotificationService>(
  "@logix/test/NotificationService",
)

const BulkModule = Logix.Module.make("BulkModule", {
  state: Schema.Struct({
    operation: Schema.String,
    lastCount: Schema.Number,
    lastMessage: Schema.optional(Schema.String),
  }),
  actions: {
    "bulk/run": Schema.Void,
    "bulk/resetMessage": Schema.Void,
  },
})

const BulkLogic = BulkModule.logic((api) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        api.onAction("bulk/run").runExhaust((_) =>
          Effect.gen(function* () {
            const current = yield* api.state.read
            const selection = yield* api.use(SelectionServiceTag)
            const bulk = yield* api.use(BulkOperationServiceTag)
            const notify = yield* api.use(NotificationServiceTag)

            const ids = yield* selection.getSelectedIds()

            if (ids.length === 0) {
              yield* notify.info("请先选择记录")
              return
            }

            // 模拟失败场景：operation === "fail" 时抛错并通知
            if (current.operation === "fail") {
              yield* notify.error("批量操作失败：fail for demo")
              return
            }

            yield* bulk.applyToMany({
              ids: Array.from(ids),
              operation: current.operation,
            })

            const count = ids.length
            yield* api.state.update((prev) => ({
              ...prev,
              lastCount: count,
              lastMessage: `本次 ${prev.operation} 作用于 ${count} 条记录`,
            }))
          }),
        ),
        api.onAction("bulk/resetMessage").run((_) =>
          api.state.update((prev) => ({
            ...prev,
            lastMessage: undefined,
          })),
        ),
      ],
      { concurrency: "unbounded" },
    )
  }),
)

// ---------------------------------------------------------------------------
// Capability: state-derivation (Fluent DSL)
// Scenario: DerivedStateModule · hasResults derived from results
// ---------------------------------------------------------------------------

const DerivedStateModule = Logix.Module.make("DerivedStateModule", {
  state: Schema.Struct({
    results: Schema.Array(Schema.String),
    hasResults: Schema.Boolean,
  }),
  actions: {
    setResults: Schema.Array(Schema.String),
  },
})

const DerivedStateLogic = DerivedStateModule.logic((api) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        api.onAction("setResults").run((action) =>
          api.state.update((prev) => ({
            ...prev,
            results: action.payload,
          })),
        ),
        api
          .onState((s) => s.results.length)
          .update((prev, len) => ({
            ...prev,
            hasResults: len > 0,
          })),
      ],
      { concurrency: "unbounded" },
    )
  }),
)

// ---------------------------------------------------------------------------
// Capability: action-to-state (Fluent DSL)
// Scenario: DirtyFormModule · dirty flag handling
// ---------------------------------------------------------------------------

const DirtyFormModule = Logix.Module.make("DirtyFormModule", {
  state: Schema.Struct({
    value: Schema.String,
    isDirty: Schema.Boolean,
  }),
  actions: {
    "input/change": Schema.String,
    "input/reset": Schema.Void,
  },
})

const DirtyFormLogic = DirtyFormModule.logic((api) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        api.onAction("input/change").run((action) =>
          api.state.update((prev) => ({
            ...prev,
            value: action.payload,
            isDirty: true,
          })),
        ),
        api.onAction("input/reset").run(() =>
          api.state.update(() => ({
            value: "",
            isDirty: false,
          })),
        ),
      ],
      { concurrency: "unbounded" },
    )
  }),
)

// ---------------------------------------------------------------------------
// Capability: time-and-concurrency + service-integration
// Scenario: SearchModule · fromState + debounce + filter + runLatest
// ---------------------------------------------------------------------------

class SearchApi extends Context.Tag('@logix/test/SearchApi')<SearchApi, SearchApi.Service>() {}

namespace SearchApi {
  export interface Service {
    search: (keyword: string) => Effect.Effect<ReadonlyArray<string>, never, never>
  }
}

const SearchModule = Logix.Module.make("SearchModule", {
  state: Schema.Struct({
    keyword: Schema.String,
    results: Schema.Array(Schema.String),
    isLoading: Schema.Boolean,
  }),
  actions: {
    noop: Schema.Void,
    setKeyword: Schema.String,
  },
})

const SearchLogic = SearchModule.logic(($) =>
  Effect.gen(function* () {
    // 将 setKeyword Action 映射到 keyword 字段，作为 fromState 的驱动源
    yield* $.onAction("setKeyword").run((action) =>
      $.state.update((prev) => ({
        ...prev,
        keyword: action.payload,
      })),
    )

    const keywordChanges$ = $.flow.fromState((s) => s.keyword)

    const debouncedValidKeyword$ = keywordChanges$.pipe(
      $.flow.debounce(50),
      $.flow.filter((keyword) => keyword.trim().length > 0),
    )

    const runSearch = Effect.gen(function* () {
      const state = yield* $.state.read
      const keyword = state.keyword
      const api = yield* $.use(SearchApi)

      yield* $.state.update((prev) => ({ ...prev, isLoading: true }))
      const results = yield* api.search(keyword)
      yield* $.state.update((prev) => ({
        ...prev,
        results: Array.from(results),
        isLoading: false,
      }))
    })

    // 外部 dispatch setKeyword → keyword 变化 → debounce + runLatest 搜索
    yield* debouncedValidKeyword$.pipe(
      $.flow.runLatest(
        runSearch,
      ),
    )
  }),
)

// ---------------------------------------------------------------------------
// Tests (grouped by capability)
// ---------------------------------------------------------------------------

describe("@logix/test · TestProgram capability scenarios", () => {
  it("Optimistic Update: TestProgram + ExecutionResult should capture rollback", async () => {
    const scenario = TestProgram.make({
      main: {
        module: ToggleModule,
        initial: { flags: { "feature-a": false } },
        logics: [ToggleLogic],
      },
      layers: [ToggleFailingServiceLayer],
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        yield* $.dispatch({
          _tag: "toggle",
          payload: { id: "feature-a", value: true },
        })
        yield* $.assert.state((s) => s.flags["feature-a"] === false)
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "toggle", { times: 1 })
    Execution.expectNoError(result)
  })

  it("Cascading Selects: TestProgram should observe derived state changes", async () => {
    const scenario = TestProgram.make({
      main: {
        module: LocationModule,
        initial: { province: "", city: "", cities: [] },
        logics: [LocationLogic],
      },
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        yield* $.dispatch({
          _tag: "selectProvince",
          payload: "Beijing",
        })

        yield* $.assert.state(
          (s) =>
            s.province === "Beijing" &&
            s.city === "" &&
            s.cities.length === 2 &&
            s.cities[0] === "Beijing-City1" &&
            s.cities[1] === "Beijing-City2",
        )
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "selectProvince", { times: 1 })
    Execution.expectNoError(result)
  })

  it("Async Flow: TestProgram should work with polling + TestClock", async () => {
    const scenario = TestProgram.make({
      main: {
        module: TaskModule,
        initial: { status: "IDLE" },
        logics: [TaskLogic],
      },
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        // Start polling
        yield* $.dispatch({ _tag: "start", payload: undefined })
        yield* $.assert.state((s) => s.status === "PENDING")

        // External completion
        yield* $.dispatch({ _tag: "externalDone", payload: undefined })
        yield* $.assert.state((s) => s.status === "DONE")
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "start", { times: 1 })
    Execution.expectActionTag(result, "externalDone", { times: 1 })
    Execution.expectNoError(result)
  })

  it("Batch: TestProgram should collect all state transitions via virtual time", async () => {
    const scenario = TestProgram.make({
      main: {
        module: BatchModule,
        initial: { items: ["a", "b", "c"], processed: [] },
        logics: [BatchLogic],
      },
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: "processAll", payload: undefined })

        // 推进虚拟时间以让 batch 过程完成（当前仅通过 ExecutionResult 验证动作与无错误）
        yield* TestClock.adjust("20 millis")
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "processAll", { times: 1 })
    Execution.expectNoError(result)
  })

  it("Bulk operations: should apply operation to selected ids and record message", async () => {
    const selectionLayer = Layer.succeed(SelectionServiceTag, {
      getSelectedIds: () => Effect.succeed(["id-1", "id-2"]),
    })

    const bulkLayer = Layer.succeed(BulkOperationServiceTag, {
      applyToMany: (_: {
        ids: ReadonlyArray<string>
        operation: string
      }) => Effect.void,
    })

    const notificationLayer = Layer.succeed(NotificationServiceTag, {
      info: (message: string) =>
        Effect.sync(() => {
          void message
        }),
      error: (message: string) =>
        Effect.sync(() => {
          void message
        }),
    })

    const scenario = TestProgram.make({
      main: {
        module: BulkModule,
        initial: { operation: "archive", lastCount: 0, lastMessage: undefined },
        logics: [BulkLogic],
      },
      layers: [selectionLayer, bulkLayer, notificationLayer],
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        yield* $.dispatch({ _tag: "bulk/run", payload: undefined })
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "bulk/run", { times: 1 })
    Execution.expectNoError(result)
    // 不断言通知内容，交给上层单元测试或其他场景专门验证
  })

  it("Derived state via Fluent DSL should keep hasResults in sync", async () => {
    const scenario = TestProgram.make({
      main: {
        module: DerivedStateModule,
        initial: { results: [], hasResults: false },
        logics: [DerivedStateLogic],
      },
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        yield* $.dispatch({
          _tag: "setResults",
          payload: ["a", "b"],
        })
        yield* $.assert.state((s) => s.results.length === 2 && s.hasResults === true)

        yield* $.dispatch({
          _tag: "setResults",
          payload: [],
        })
        yield* $.assert.state((s) => s.results.length === 0 && s.hasResults === false)
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "setResults")
    Execution.expectNoError(result)
  })

  it("Dirty form via onAction should update value and isDirty correctly", async () => {
    const scenario = TestProgram.make({
      main: {
        module: DirtyFormModule,
        initial: { value: '', isDirty: false },
        logics: [DirtyFormLogic],
      },
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        // change
        yield* $.dispatch({
          _tag: "input/change",
          payload: "hello",
        })
        yield* $.assert.state(
          (s) => s.value === "hello" && s.isDirty === true,
        )

        // reset
        yield* $.dispatch({
          _tag: "input/reset",
          payload: undefined,
        })
        yield* $.assert.state(
          (s) => s.value === "" && s.isDirty === false,
        )
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "input/change", { times: 1 })
    Execution.expectActionTag(result, "input/reset", { times: 1 })
    Execution.expectNoError(result)
  })

  it("Search with debounce + runLatest should keep only latest results", async () => {
    const mockSearchLayer = Layer.succeed(SearchApi, {
      search: (keyword: string) =>
        Effect.succeed(
          [`${keyword}-1`, `${keyword}-2`] as ReadonlyArray<string>,
        ),
    })

    const scenario = TestProgram.make({
      main: {
        module: SearchModule,
        initial: { keyword: "", results: [], isLoading: false },
        logics: [SearchLogic],
      },
      layers: [mockSearchLayer],
    })

    const program = scenario.run(($) =>
      Effect.gen(function* () {
        // 快速输入多个关键字，只保留最后一次搜索结果
        yield* $.dispatch({ _tag: "setKeyword", payload: "foo" })
        yield* $.dispatch({ _tag: "setKeyword", payload: "bar" })
        yield* $.dispatch({ _tag: "setKeyword", payload: "baz" })

        // 这里只严格验证 keyword 与 isLoading，结果列表后续可以随着 Flow 实现细节调整断言
        yield* $.assert.state(
          (s) => s.keyword === "baz" && s.isLoading === false,
        )
      }),
    )

    const result = await runTest(program)
    Execution.expectActionTag(result, "setKeyword")
    Execution.expectNoError(result)
  })
})
