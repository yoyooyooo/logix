---
title: 长链路实现笔记 · B｜执行面（Runtime Execution Plane）
status: draft
version: 1
---

# 长链路实现笔记 · B｜执行面（Runtime Execution Plane）

> **主产物**：Logic/Flow 的执行与调度（含 phase guard、middleware、并发控制）。
>
> **不覆盖**：state 写入细节（见 A 数据面）、EffectOp 总线（见 D 副作用面）。

## 目录

- 1. 三跳入口（public → internal → tests）
- 2. LogicPlan（setup/run）与 Phase Guard
- 3. FlowRuntime 与 Middleware（如何把“声明”变成可跑的执行图）
- 4. 并发控制（bounded/unbounded）与 TaskRunner
- 5. 常见坑与排查
- 6. auggie 查询模板

## 1) 三跳入口（public → internal → tests）

- **public**
  - `packages/logix-core/src/Logic.ts`
  - `packages/logix-core/src/Bound.ts`
- **internal（执行面内核）**
  - Logic 归一/装配：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`
  - phase guard：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
  - logic 调度：`packages/logix-core/src/internal/runtime/ModuleRuntime.logics.ts`
  - FlowRuntime：`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - middleware：`packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts`、`packages/logix-core/src/Middleware.ts`、`packages/logix-core/src/Middleware.Query.ts`
  - 并发与 runner：`packages/logix-core/src/internal/runtime/core/TaskRunner.ts`、`packages/logix-core/src/internal/runtime/core/env.ts`
- **tests**
  - phase guard：`packages/logix-core/test/Lifecycle.PhaseGuard.test.ts`、`packages/logix-core/test/Bound.test.ts`
  - FlowRuntime：`packages/logix-core/test/FlowRuntime.test.ts`
  - 并发策略：`packages/logix-core/test/ConcurrencyPolicy.*.test.ts`

## 2) LogicPlan（setup/run）与 Phase Guard

执行面最容易踩坑的地方是“把 setup 当 run 用、把 run 当 setup 用”。

- **setup 段（注册/描述期）**
  - 只做同步注册：reducers、lifecycle hook、debug hook、trait 声明等。
  - 约束：避免 IO；避免依赖 Env 的解析（否则会出现“rootContextNotReady/死锁/不可诊断等待”）。
- **run 段（运行/订阅期）**
  - 允许 fork 长期 Fiber、订阅 action/state、跨模块协作、访问 Env/Service。
- **Phase Guard**
  - 在 `$` 上的敏感 API 做相位检查，把“语义错但能跑”变成结构化错误（便于 Devtools 与测试断言）。
  - 入口：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`

## 3) FlowRuntime 与 Middleware

把 Flow/Logic 当作“可组合的执行图”，middleware 是对执行图的正交切面：

- **FlowRuntime**：负责把 `$.onAction/$.onState/...` 之类声明转成可运行的流与 fiber。
- **LogicMiddleware**：把执行过程包裹成“洋葱模型”，用于注入诊断、并发约束、统计、降级策略等。
- **Query Middleware**：把 query 类能力以 middleware 方式接入，避免在业务逻辑里散落 cache/invalidate 细节。

读 middleware 时优先确认：

1. 它是不是只做“横切关注点”（不偷偷写业务语义）
2. 它是否保持可诊断（错误通道/事件口径/trace 能回溯）
3. 它是否不破坏 A 数据面的约束（尤其事务窗口禁 IO/单次提交）

## 4) 并发控制（bounded/unbounded）与 TaskRunner

并发面经常是“现象像数据竞争，但根因是执行面把 fiber 放飞了”。

- **实例内写入串行**（A 面保证），但 **watchers/tasks** 可以并发。
- **ConcurrencyPolicy** 用于给“并发部分”加边界：默认收敛到 bounded，显式 opt-in 才允许 unbounded。
- **TaskRunner** 是执行面实现并发策略的关键落点（例如 runLatest、backpressure 等）。

## 5) 常见坑与排查

- **setup 段等待 root/Env**：通常是误用；如果确实要在 run 段等待，走 `Root.resolve(...,{ waitForReady: true })` 的语义路径（见 C 模块图谱面）。
- **并发策略看似失效**：优先查 runtime options 与 module overrides 的合并点（`packages/logix-core/src/Runtime.ts`），再查 TaskRunner 是否走了 unbounded opt-in 分支。
- **middleware 顺序导致行为变化**：确认 middlewareStack 的构造处（public `Middleware.*` 与 internal `LogicMiddleware`）以及是否被 devtools 自动注入了 observer/logger。

## 6) auggie 查询模板

- “`ModuleFactory` 如何把各种 logic 写法归一成 `LogicPlan(setup/run)`？归一 marker 在哪？”
- “`BoundApiRuntime` 的 phase 判定依赖什么状态？非法 phase 错误如何结构化？”
- “`FlowRuntime` 的核心执行路径在哪？从 `$.onAction` 到 fork fiber 的关键跳点是什么？”
- “`LogicMiddleware` 是如何构造洋葱链的？每一层的输入/输出契约是什么？”
- “并发策略（bounded/unbounded）在哪注入？TaskRunner 如何实现 runLatest/backpressure？”
