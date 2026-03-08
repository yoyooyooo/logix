# 官方迁移差异解读（v3 -> v4）

> 来源：`https://github.com/Effect-TS/effect-smol/tree/main/migration`（12 篇迁移文档）

## 1. 高风险变化（不仅是重命名）

## 1.1 Service/Context 体系重构

- `Context.Tag / Context.GenericTag / Effect.Service / Context.Reference`
  -> `Context.Tag / Tag class / Context.Reference`
- 影响：服务定义、环境模型、Layer 装配入口都会变化。
- 对 Logix 的意义：不是简单替换名字，而是把“Runtime 环境面”统一映射到 `ServiceMap`，这会触发 core 与 react 适配层的结构性改造。

## 1.2 FiberRef 体系移除

- `FiberRef` + `Effect.locally` 迁移为 `Context.Reference` + `Effect.provideService`
- 影响：fiber-local 语义和上下文注入方式发生变化。
- 对 Logix 的意义：当前 runtime 内核大量依赖 FiberRef（调试级别、txn 语义、链路标识、诊断采样），需先做“引用模型重构”，否则后续迁移会碎片化。

## 1.3 Yieldable 取代“Effect 子类型”隐式行为

- v3 中一些类型可隐式当 Effect；v4 中仅 `Yieldable` 可 `yield*`，组合子场景需要 `.asEffect()` 或显式 API。
- 影响：旧写法会直接类型错误或语义变化。
- 对 Logix 的意义：并发测试与边界封装（尤其 `yield* fiber`）需要系统性扫描。

## 1.4 Cause 扁平化

- 树形 `Cause(Sequential/Parallel)` -> 扁平 `reasons[]`
- 影响：并行/顺序信息不再由 Cause 结构表达。
- 对 Logix 的意义：错误分类/诊断聚合仍可做，但若依赖结构语义（顺序/并行来源）需改为业务侧显式事件标注。

## 1.5 Layer memoization 默认行为变化

- v4 默认跨 `Effect.provide` 共享 memo（可 `local: true` 或 `Layer.fresh`）
- 影响：同一 layer 的构建次数和资源生命周期可能与 v3 不同。
- 对 Logix 的意义：`AppRuntime` 等多次 `provide` 路径必须做隔离审计。

## 1.6 Runtime 模型变化 + keep-alive 行为变化

- `Runtime<R>` 不再是主模型；`Runtime` 模块职责收缩。
- core runtime 在 v4 自动 keep-alive。
- 对 Logix 的意义：CLI/服务入口的退出策略需要重新确认，避免“程序不退出”。

## 2. 中风险变化（批量替换 + 行为校验）

- `Effect.catchAll -> Effect.catch`
- `Effect.catchAllCause -> Effect.catchCause`
- `Effect.fork -> Effect.forkChild`
- `Effect.forkDaemon -> Effect.forkDetach`
- `Scope.extend -> Scope.provide`
- 说明：看起来是 rename，但 fork 在 v4 新增 options，建议对竞态敏感测试显式配置。

## 3. 低风险变化（少量点状修正）

- `Effect.gen(this, fn)` -> `Effect.gen({ self: this }, fn)`（本仓暂未命中）
- `Equal.equivalence -> Equal.asEquivalence`
- `Exception` 命名到 `Error`（本仓命中较低）

## 4. 对 Logix 的迁移优先级建议（由高到低）

1. `ServiceMap + Reference` 主干改造（Context/FiberRef/locally）。
2. `Runtime` 边界适配（run*、ManagedRuntime、入口行为）。
3. `Cause` / `Layer memoization` 的语义回归。
4. `catch/fork/scope` 批量重命名与编译面清理。
5. `Equal` 和示例/文档统一收口。

## 5. 官方链接（原文）

- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/services.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/fiberref.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/yieldable.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/cause.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/layer-memoization.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/runtime.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/fiber-keep-alive.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/error-handling.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/forking.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/scope.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/equality.md
- https://raw.githubusercontent.com/Effect-TS/effect-smol/main/migration/generators.md

