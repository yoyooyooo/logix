# Matrix Examples: Advanced Concurrency (v3 Standard Paradigm)

> **Focus**: Exhaust Map (提交防重), 并行服务调用
> **Note**: 本文示例已更新为 v3 Effect-Native 标准范式，使用 `Flow.Api` 和 `Effect.all` 来声明式地管理并发。

## S20: 提交防重 (Submit Exhaust)

**v3 标准模式**: 监听提交 `Action`，并使用 `flow.runExhaust` 来执行提交 Effect。`runExhaust` 会在前一个 Effect 完成前，自动忽略所有新的触发，从而天然地防止了重复提交。

```typescript
const $Form = Logic.forShape<FormShape, OrderApi>();

const submitLogic = Logic.make<FormShape, OrderApi>(
  Effect.gen(function* (_) {
    const submit$ = $.flow.fromAction(a => a._tag === 'submit');

    const submitEffect = Effect.gen(function* (_) {
      const api = yield* $Form.services(OrderApi);
      yield* $Form.state.mutate(draft => { draft.meta.isSubmitting = true; });

      // 将 API 调用和后续状态更新包装在一个可中断的 Effect 中
      const result = yield* Effect.either(api.submit());

      if (result._tag === 'Left') {
        yield* $Form.state.mutate(draft => {
          draft.meta.isSubmitting = false;
          draft.meta.error = result.left.message;
        });
      } else {
        yield* $Form.state.mutate(draft => { draft.meta.isSubmitting = false; });
      }
    });

    // 关键：使用 runExhaust，在 submitEffect 完成前，所有 submit$ 的新事件都将被忽略
    yield* submit$.pipe($.flow.runExhaust(submitEffect));
  })
);
```

## S21: 多服务并行 (Parallel Services)

**v3 标准模式**: 在一个 `Effect` 中，使用 `Effect.all` 来并行执行多个独立的异步任务。通过在每个任务内部分别使用 `Effect.catchAll`，可以实现部分成功、部分失败的健壮错误处理。

```typescript
const $Page = Logic.forShape<PageShape, UserApi | ConfigApi>();

const parallelLoadLogic = Logic.make<PageShape, UserApi | ConfigApi>(
  Effect.gen(function* (_) {
      const userApi = yield* $Page.services(UserApi);
      const configApi = yield* $Page.services(ConfigApi);
      const { userId } = yield* $Page.state.read;

      // Logic 初始化时，并行加载用户和配置
      yield* Effect.all(
        [
          // 第一个并行任务：加载用户
          userApi.fetch(userId).pipe(
            Effect.flatMap(user => $Page.state.mutate(draft => { draft.user = user; })),
            Effect.catchAll(error => $Page.state.mutate(draft => { draft.errors.user = error.message; }))
          ),
          // 第二个并行任务：加载配置
          configApi.fetch().pipe(
            Effect.flatMap(config => $Page.state.mutate(draft => { draft.config = config; })),
            Effect.catchAll(error => $Page.state.mutate(draft => { draft.errors.config = error.message; }))
          )
        ],
        { discard: true, concurrency: 'unbounded' } // 'unbounded' 允许所有任务并行
      );
    })
);
```
