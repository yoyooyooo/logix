# Matrix Examples: Flow Control (v3 Standard Paradigm)

> **Focus**: 错误重试、竞态取消、错误回退  
> **Note**: 本文示例已更新为 v3 Effect-Native 标准范式，使用 `Flow` API 和 `Effect` 组合子来声明式地处理复杂的异步控制流。当前 PoC 中，实际代码应在对应 Module 上通过 `Module.logic(($)=>...)` 获取 `$`。

## S14: 失败重试 (Retry)

**v3 标准模式**: 在传递给 `flow.run` 的 `Effect` 内部，使用 `Effect.retry` 组合子。

```typescript
// 概念上，这里的 `$Form` 表示针对 FormShape + UserApi 预绑定的 Bound API。
const retryLogic: Logic.Of<FormShape, UserApi> =
  Effect.gen(function* (_) {
    const username$ = $.flow.fromState(s => s.username);

    const checkUsernameWithRetry = Effect.gen(function* (_) {
      const api = yield* $.services(UserApi);
      const { username } = yield* $.state.read;
      const result = yield* api.check(username).pipe(
        // Effect 原生的重试能力
        Effect.retry({ times: 3, schedule: Schedule.exponential('100 millis') })
      );
      yield* $.state.mutate(draft => { draft.isValid = result; });
    });

    yield* username$.pipe($.flow.run(checkUsernameWithRetry));
  })
);
```

## S15: 竞态取消 (SwitchMap)

**v3 标准模式**: 使用 `flow.runLatest` 代替 `flow.run`。`runLatest` 会自动取消前一个正在执行的 Effect，确保只有最新的流事件对应的逻辑在运行。

```typescript
// 概念上，这里的 `$Search` 表示针对 SearchShape + SearchApi 预绑定的 Bound API。
const switchMapLogic: Logic.Of<SearchShape, SearchApi> =
  Effect.gen(function* (_) {
    const keyword$ = $.flow.fromState(s => s.keyword);

    const searchEffect = Effect.gen(function* (_) {
      const api = yield* $.services(SearchApi);
      const { keyword } = yield* $.state.read;
      const result = yield* api.search(keyword);
      yield* $.state.mutate(draft => { draft.results = result; });
    });

    yield* keyword$.pipe(
      $.flow.debounce(300),
      // 关键：使用 runLatest 实现 SwitchMap 语义
      $.flow.runLatest(searchEffect)
    );
  })
);
```

## S16: 错误回退 (Error Fallback)

**v3 标准模式**: 在 `Effect` 内部使用 `Effect.catchAll` 或 `Effect.try` 来处理错误分支。

```typescript
// 概念上，这里的 `$Config` 表示针对 ConfigShape + ConfigApi 预绑定的 Bound API。
const fallbackLogic: Logic.Of<ConfigShape, ConfigApi> =
  Effect.gen(function* (_) {
    const configId$ = $.flow.fromState(s => s.configId);

    const fetchEffect = Effect.gen(function* (_) {
      const api = yield* $.services(ConfigApi);
      const { configId } = yield* $.state.read;

      const fetchWithFallback = api.fetch(configId).pipe(
        // 如果 API 调用失败，则回退到默认值
        Effect.catchAll(() => Effect.succeed(DEFAULT_CONFIG))
      );

      const config = yield* fetchWithFallback;
      yield* $.state.mutate(draft => { draft.config = config; });
    });

    yield* configId$.pipe($.flow.run(fetchEffect));
  })
);
```
