# Contracts: 001-module-traits-runtime

> 本特性主要引入的是 **库级 TypeScript API 契约**（而非 HTTP/GraphQL 接口）。因此，这里的 "contracts" 更侧重于列出对外可见的运行时 API 形状与行为约束，而不是 OpenAPI/GraphQL schema。

当前对外重要契约包括（后续在实现阶段通过 d.ts 与文档进一步细化）：

1. `StateTrait.from(StateSchema)`
   - 职责：将模块 State Schema 收敛为可用的 Trait DSL 入口，约束合法字段路径与字段类型。
2. `StateTrait.build(stateSchema, traitsSpec)`
   - 职责：在不依赖 Runtime 环境的前提下，把 Module 图纸中的 `state + traits` 编译为 `StateTraitProgram`，输出包含 `stateSchema` / `StateTraitSpec` / `StateTraitGraph` / `StateTraitPlan`。
   - 约束：纯函数；对致命结构错误直接 fail，对非致命问题产生 warnings（参见 spec Clarifications 与 FR-015）。
3. `StateTrait.install($, program)`
   - 职责：在 Logix Runtime 中，根据 `StateTraitProgram` 将 computed / source / link 行为编译为 Bound API 上的 watcher / Flow / Effect 行为，并通过 EffectOp/Middleware 总线对接 Debug / Resource / Query 等能力。
4. EffectOp / Middleware 契约（概要）
   - `EffectOp`: 统一表示 Action / Flow / State / Service 等边界行为的运行时事件，携带 `kind`、名称、payload 与 Trace 元信息。
   - Middleware: 按 Observer / Runner / Guard 三类语义分型，对 EffectOp 进行观测、运行策略调整与准入控制。
5. Devtools 数据契约
   - StateTraitProgram / StateTraitGraph 导出格式；
   - moduleId + instanceId 的 runtime envelope；
   - Graph 节点与 EffectOp 事件之间的关联元数据（源位置、Trait 节点引用等）。

如后续需要对外暴露 HTTP/GraphQL 等远程接口（例如用于远程导出 TraitGraph 或跨进程 Debug），相关 OpenAPI/GraphQL schema 也会按本目录约定补充，但本轮特性暂不涉及。

