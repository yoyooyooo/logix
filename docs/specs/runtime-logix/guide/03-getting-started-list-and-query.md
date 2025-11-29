# 03 · 列表 + 筛选 + 分页 (v3 标准范式)

> **场景**: 一个典型的包含筛选、分页和加载状态的查询列表页面。
> **对应核心示例**: `core/examples/02-complex-list.md` (应基于 v3 范式重写)。

## 1. 场景复述 (用户语言)

- 用户更改筛选条件或点击“查询”按钮后，重新加载列表。
- 用户切换页码或每页条数时，自动重新加载。
- 页面需正确展示加载中、空状态或错误信息，并支持手动刷新。

## 2. 步骤一：设计 State 与 Action Schema

为列表页定义状态结构，区分查询条件、分页信息、列表数据和元数据。

```typescript
// State Schema
const ListStateSchema = Schema.Struct({
  filters: Schema.Struct({
    keyword: Schema.String,
    status: Schema.optional(Schema.String)
  }),
  pagination: Schema.Struct({
    page: Schema.Number,
    pageSize: Schema.Number,
    total: Schema.Number
  }),
  list: Schema.Array(Schema.Any), // 替换为具体的列表项 Schema
  meta: Schema.Struct({
    isLoading: Schema.Boolean,
    error: Schema.optional(Schema.String)
  })
});

// Action Schema
const ListActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('search') }),
  Schema.Struct({ _tag: Schema.Literal('refresh') })
);

// Store Shape
type ListShape = Logix.ModuleShape<typeof ListStateSchema, typeof ListActionSchema>;
```

## 3. 步骤二：设计 Logic 规则 (v3 Flow API)

在 `Logic` 中，我们将“触发加载”的多个来源（筛选变化、分页变化、手动刷新）汇聚成一个统一的数据加载流。

```typescript
// 伪代码，需在 Logic 程序（Domain.logic 或 Logic.Of）中实现
const $ = Logic.forShape<ListShape, ListApi>();

const listLogic: Logic.Of<ListShape, ListApi> =
  Effect.gen(function* (_) {
    // 1. 定义触发源
    const search$ = $.flow.fromAction(a => a._tag === 'search');
    const refresh$ = $.flow.fromAction(a => a._tag === 'refresh');
    const pagination$ = $.flow.fromChanges(s => [s.pagination.page, s.pagination.pageSize]);

    // 2. 将所有触发源合并为一个“需要加载”的信号流
    const loadTrigger$ = Stream.mergeAll([search$, refresh$, pagination$]);

    // 3. 定义一次加载操作的 Effect
    const loadEffect = Effect.gen(function* (_) {
      const api = yield* $.services(ListApi); // 注入的服务
      const { filters, pagination } = yield* $.state.read;

      yield* $.state.mutate(draft => {
        draft.meta.isLoading = true;
        draft.meta.error = undefined;
      });

      yield* Effect
        .tryPromise(() =>
          api.fetch({
            ...filters,
            page: pagination.page,
            pageSize: pagination.pageSize
          })
        )
        .pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              $.state.mutate(draft => {
                draft.meta.isLoading = false;
                draft.meta.error = "Failed to load data";
              }),
            onSuccess: (data) =>
              $.state.mutate(draft => {
                draft.list = data.items;
                draft.pagination.total = data.total;
                draft.meta.isLoading = false;
              })
          })
        );
    });

    // 4. 将加载流与加载操作绑定，并使用 runLatest 处理竞态
    const loadLogic = loadTrigger$.pipe(
      flow.debounce(50), // 轻微防抖，避免分页和筛选同时变更触发两次
      flow.runLatest(loadEffect)
    );

    // 5. (可选) 筛选条件变化时，自动重置页码到第一页
    const filters$ = flow.fromChanges(s => s.filters);
    const resetPageLogic = filters$.pipe(
      flow.run(state.mutate(draft => { draft.pagination.page = 1; }))
    );

    yield* Effect.all([loadLogic, resetPageLogic], { discard: true });
  })
);
```

## 4. 步骤三：在 React 中接入

UI 层的职责被简化为：

- **订阅状态**: 使用 `useSelector` 从 `Store` 中读取 `list`, `pagination`, `meta.isLoading` 等数据并渲染。
- **更新状态/派发动作**:
  - 筛选表单的输入变化时，调用 `state.mutate(draft => { draft.filters.keyword = '...' })`。
  - 点击“查询”按钮时，调用 `dispatch({ _tag: 'search' })`。
  - 分页组件变化时，调用 `state.mutate(draft => { draft.pagination.page = ... })`，这将自动触发 `pagination$` 流。

这种模式下，React 组件不关心“何时”以及“如何”加载数据，只负责表达用户的意图和渲染最终的状态。

## 5. 进一步阅读

- `core/examples/01-basic-form.md`: “黄金标准”示例，展示了完整的 v3 API 用法。
- `core/03-logic-and-flow.md`: `Flow` 和 `Control` API 的详细设计理念。
- `../react/01-hooks-api.md`: `useSelector` 的性能与最佳实践。
