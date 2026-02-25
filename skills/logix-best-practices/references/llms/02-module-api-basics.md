---
title: Module / Logic 基础写法（LLM 版）
---

# Module / Logic 基础写法（LLM 版）

## 1) 最小定义

```ts
const CounterDef = Module.make('Counter', { state, actions })
const CounterLogic = CounterDef.logic(($) => ({ setup, run }))
const Counter = CounterDef.implement({ initial, logics: [CounterLogic] })
```

## 2) setup/run 规则

- `setup` 允许：`reducer`、`lifecycle`、trait 声明。
- `setup` 禁止：`$.use`、`$.onAction`、`$.onState`、`$.flow`、IO。
- `run` 允许：watcher/flow、service 调用、`run*Task`。

## 3) 状态写入策略

- 优先 `mutate/reducer` 处理高频局部写。
- 仅在整棵替换或回滚时使用 `update`。
- 业务代码不要直接写 `SubscriptionRef`。

## 4) 服务注入

- 模块只依赖 Tag 契约。
- 具体实现在组合层用 Layer 提供。
- 错误类型在服务边界语义化，不冒泡裸 `unknown`。
