---
title: Canonical Authoring
status: living
version: 1
---

# Canonical Authoring

## 目标

冻结新的 canonical authoring 主骨架。

## 主骨架

新的公开 authoring 主链收敛为：

- `Module`
- `Logic`
- `Program`

它们分别承接：

- `Module`：定义期对象
- `Logic`：可复用行为片段
- `Program`：装配期对象

## 装配入口

公开装配入口固定为：

```ts
Program.make(Module, {
  initial: { ... },
  capabilities: { ... },
  logics: [ ... ],
})
```

规则：

- `Program.make(Module, config)` 是唯一公开装配入口
- 不新增 `Module.program(...)` 一类第二入口

## Logic 入口

标准拼写固定为：

```ts
const SearchLogic = Search.logic('search-query', ($) => ({
  rules: [ ... ],
  lifecycle: [ ... ],
  tasks: [ ... ],
}))
```

规则：

- `Module.logic(id, build)` 是标准 logic 入口
- `rules / lifecycle / tasks` 是标准逻辑分区
- `logic(...)` 只作为概念名，不再额外引入第二套顶层构造入口

## 同步与异步

新的 authoring 主链坚持这条约束：

- 同步写入与异步任务强分离

对应到作者面：

- 同步规则进入 `rules`
- 长链路任务也挂在 `rules`，但显式使用 task 形态
- 没有明确触发源、因 program 生命周期存在的后台职责进入 `logic.tasks`

## process 的位置

- `process` 不进入 canonical 主写法
- `process` 保留独立的 expert/orchestration family

## capabilities 的位置

`Program` 的标准装配面只承接：

- `initial`
- `capabilities`
- `logics`

其中：

- 默认注入面是 `services`
- `imports / roots` 属于显式升级能力

## 当前一句话结论

新的 canonical authoring 已经收敛为 `Module / Logic / Program`，并以 `Program.make(Module, config)` 作为唯一公开装配入口。
