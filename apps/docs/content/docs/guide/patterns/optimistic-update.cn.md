---
title: 乐观更新
description: 使用 Logix 实现乐观更新与回滚策略。
---

乐观更新让 UI 立即响应用户操作，同时在后台执行实际请求。如果请求失败，则回滚到之前的状态。

## 核心思路

1. **立即更新 UI**：用户操作后立即修改状态
2. **后台请求**：异步执行实际操作
3. **失败回滚**：请求失败时恢复原状态 + 提示用户

## 基础实现

```ts
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

const TodoDef = Logix.Module.make('Todo', {
  state: Schema.Struct({
    items: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        text: Schema.String,
        done: Schema.Boolean,
      }),
    ),
  }),
  actions: {
    toggle: Schema.String, // itemId
  },
})

const TodoLogic = TodoDef.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(TodoApi)

    yield* $.onAction('toggle').run(({ payload: itemId }) =>
      Effect.gen(function* () {
        // 1. 保存原状态
        const original = yield* $.state.read

        // 2. 乐观更新
        yield* $.state.mutate((d) => {
          const item = d.items.find((i) => i.id === itemId)
          if (item) item.done = !item.done
        })

        // 3. 执行实际请求，失败则回滚
        yield* api.toggleTodo(itemId).pipe(
	          Effect.catchAll(() =>
	            Effect.gen(function* () {
	              // 回滚到原状态（整棵替换：用 update）
	              yield* $.state.update(() => original)
	              // 可以触发 toast 通知
	              yield* Effect.log('Toggle failed, rolled back')
	            }),
	          ),
        )
      }),
    )
  }),
)
```

## 带重试的增强版

```ts
yield*
  api.toggleTodo(itemId).pipe(
    Effect.retry({ times: 2 }), // 自动重试 2 次
      Effect.catchAll(() =>
        Effect.gen(function* () {
          yield* $.state.update(() => original)
          yield* $.dispatchers.showError('操作失败，请稍后重试')
        }),
      ),
  )
```

## 批量乐观更新

```ts
yield*
  $.onAction('batchToggle').run(({ payload: itemIds }) =>
    Effect.gen(function* () {
      const original = yield* $.state.read

      // 乐观更新所有项
      yield* $.state.mutate((d) => {
        for (const id of itemIds) {
          const item = d.items.find((i) => i.id === id)
          if (item) item.done = !item.done
        }
      })

	      // 批量请求
	      yield* api.batchToggle(itemIds).pipe(Effect.catchAll(() => $.state.update(() => original)))
	    }),
	  )
```

## 最佳实践

1. **只对简单操作使用乐观更新**：复杂的级联操作难以回滚
2. **保留完整的原状态快照**：确保可以完整回滚
3. **给用户反馈**：回滚时通过 toast/notification 告知
4. **考虑竞态**：多次操作时使用 `runLatest` 或加锁

## 相关模式

- [分页加载](./pagination)
- [搜索+详情联动](./search-detail)

## 可运行示例

- 索引：[可运行示例索引](../recipes/runnable-examples)
- 代码：
  - `examples/logix/src/scenarios/optimistic-toggle.ts`
  - `examples/logix/src/scenarios/optimistic-toggle-from-pattern.ts`
  - `examples/logix/src/patterns/optimistic-toggle.ts`
