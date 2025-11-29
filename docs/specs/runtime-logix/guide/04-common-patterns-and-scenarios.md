# 04 · 常用配方 (v3 标准范式)

> **对应**: `core/scenarios/*.md`
> **目标**: 将场景文档中的“能力测试用例”翻译成日常可以直接复用的 v3 标准写法模板。

## 1. 字段联动与重置

**场景**: 选中某个字段时，重置一批相关字段（如国家变化时重置省份/城市）。

**v3 标准模式**: 
使用 `flow.fromChanges` 监听源字段，在 `flow.run` 中通过 `state.mutate` 更新目标字段。

```typescript
const $Form = Logic.forShape<FormShape>();

const resetProvinceLogic: Logic.Of<FormShape> =
  Effect.gen(function* (_) {
    const country$ = $Form.flow.fromChanges(s => s.country);

    yield* country$.pipe(
      $Form.flow.run(
        $Form.state.mutate(draft => {
          draft.province = "";
          draft.city = "";
        })
      )
    );
  })
);
```

## 2. 异步校验与错误状态

**场景**: 字段变化触发异步校验（用户名重名检查），结果写回 `errors.xxx`。

**v3 标准模式**: 
使用 `flow.fromChanges` 监听，链式调用 `debounce` 和 `filter`，最后用 `runLatest` 执行包含 API 调用的 Effect，自动处理竞态。

```typescript
const $Form = Logic.forShape<FormShape, UserApi>();

const validateUsernameLogic: Logic.Of<FormShape, UserApi> =
  Effect.gen(function* (_) {
    const username$ = $Form.flow.fromChanges(s => s.username);

    yield* username$.pipe(
      $Form.flow.debounce(500),
      $Form.flow.filter(username => username.length >= 3),
      $Form.flow.runLatest( // 确保只处理最后一次输入
        Effect.gen(function* (_) {
          const api = yield* $Form.services(UserApi);
          const { username } = yield* $Form.state.read;
          const isTaken = yield* api.checkUsername(username);
          yield* $Form.state.mutate(draft => {
            draft.errors.username = isTaken ? "Username already taken" : undefined;
          });
        })
      )
    );
  })
);
```

## 3. 多字段约束（如开始/结束时间）

**场景**: 多个字段之间存在约束（开始时间必须早于结束时间）。

**v3 标准模式**: 
使用 `flow.fromChanges` 监听一个包含多个字段的元组 `[s.startDate, s.endDate]`，然后在 `flow.run` 中执行校验逻辑。

```typescript
const $Form = Logic.forShape<FormShape>();

const validateDateRangeLogic: Logic.Of<FormShape> =
  Effect.gen(function* (_) {
    const datePair$ = $Form.flow.fromChanges(s => [s.startDate, s.endDate] as const);

    yield* datePair$.pipe(
      $Form.flow.run(
        $Form.state.mutate(draft => {
          if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
            draft.errors.dateRange = "Start date must be before end date";
          } else {
            delete draft.errors.dateRange;
          }
        })
      )
    );
  })
);
```

## 4. 数组聚合计算（列表行内计算）

**场景**: 商品列表中，任何行内字段变化时，都需要重新计算总价。

**v3 标准模式**: 
监听整个数组 `items` 的变化。在 `flow.run` 中，一次性完成所有派生状态（行内 `total` 和整体 `summary`）的计算，避免多次更新和重复渲染。

```typescript
const $Cart = Logic.forShape<CartShape>();

const calculateTotalsLogic: Logic.Of<CartShape> =
  Effect.gen(function* (_) {
    const items$ = $Cart.flow.fromChanges(s => s.items);

    yield* items$.pipe(
      $Cart.flow.debounce(50), // 轻微防抖，应对批量操作
      $Cart.flow.run(
        $Cart.state.mutate(draft => {
          let totalAmount = 0;
          draft.items.forEach(item => {
            item.total = item.price * item.quantity;
            if (item.checked) {
              totalAmount += item.total;
            }
          });
          draft.summary.totalAmount = totalAmount;
        })
      )
    );
  })
);
```

## 5. 初始化加载 (Init Load)

**场景**: Store 创建时自动加载一次数据（如详情页）。

**v3 标准模式**: 
在 Logic 程序的 `Effect.gen` 主体中，直接 `yield*` 一个加载数据的 Effect。这个 Effect 只会在 Logic 初始化时执行一次。

```typescript
const $Page = Logic.forShape<PageShape, PageApi>();

const initialLoadLogic: Logic.Of<PageShape, PageApi> =
  Effect.gen(function* (_) {
    const api = yield* $Page.services(PageApi);
    const pageId = (yield* $Page.state.read).pageId; // 假设 pageId 已在初始状态中

    // Logic 初始化时直接执行加载
    yield* $Page.state.mutate(draft => { draft.meta.isLoading = true; });
    const data = yield* api.fetchPage(pageId);
    yield* $Page.state.mutate(draft => {
      draft.data = data;
      draft.meta.isLoading = false;
    });

    // 此处可以继续定义其他流式逻辑...
  })
);
```

## 6. 外部源集成 (WebSocket / 轮询)

**场景**: 订阅 WebSocket 消息或轮询任务状态。

**v3 标准模式**: 
将外部源（WebSocket 连接、定时器）作为 `Effect.Service` 注入到 `Logic` 的环境中。在 Logic 程序中，从服务中获取 `Stream`，并使用 `flow.run` 将其事件映射到状态更新。

```typescript
// 1. 定义服务
class Ticker extends Context.Tag("Ticker")<Ticker, { readonly ticks$: Stream.Stream<number> }>() {}

// 2. 在 Logic 中消费
const $Ticker = Logic.forShape<TickerShape, Ticker>();

const tickerLogic: Logic.Of<TickerShape, Ticker> =
  Effect.gen(function* (_) {
    const ticker = yield* $Ticker.services(Ticker);

    // 将外部 ticks$ 流接入 Logix
    yield* ticker.ticks$.pipe(
      $Ticker.flow.run(tick =>
        $Ticker.state.mutate(draft => { draft.lastTick = tick; }),
      ),
    );
  })
);
```
