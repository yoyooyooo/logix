---
title: ModuleRuntime 适配与自定义扩展点（规划草稿）
status: superseded
version: 2025-11-30T00:00:00.000Z
superseded_by: ../L5/runtime-core-evolution.md
priority: 1200
---

## 背景与动机

- 当前 Logix 的运行时“心脏”是 `Logix.ModuleRuntime<S, A>`，标准实现通过 `ModuleRuntime.make` + `Module.live` 提供：
  - 本地状态 → `SubscriptionRef`；
  - Action 通道 → `PubSub` + `actions$`；
  - Logic 挂载 → 在 Scope 内 `forkScoped` 一组 `Logic.Of`。
- 在一些更复杂的场景下，我们需要让 Logix 的 Logic/Flow 运行在“非本地 Store”之上，例如：
  - 已存在的远程状态机 / 后端推送 Store（只读或部分可写）；
  - 既有前端状态管理库（Redux / Zustand 等）；
  - 带时间旅行 / 录制 / 持久化等能力的调试 / 测试环境。
- 目前在实现层可以直接手写 `ModuleRuntime<S, A>` 或通过 `Layer<ModuleRuntime<S, A>, E, R>` 注入，但这对适配作者比较底层，缺乏统一的封装与约束。

本草稿尝试规划一套“对适配作者友好”的 ModuleRuntime 扩展形态，同时确保：

- 规划层（spec）→ PoC 类型草案 → 实际实现源码 三层对齐；
- 普通业务工程师仍然只需要 `Module` / `Module.logic` / `Module.live`，不会被 Runtime 细节打扰。

## 目标与非目标

**目标**

- 在 runtime-logix 体系内，明确一条“自定义 ModuleRuntime”的推荐路径，适用于：
  - 远程 Store / 既有状态机适配；
  - 测试 / 调试专用 Runtime（时间旅行、录制、回放）；
  - 特殊平台的持久化 / 懒加载 Runtime。
- 给出一个中间层抽象（Adapter 形态），避免每个适配作者都从零实现完整的 `ModuleRuntime` 接口。
- 在文档中明确语义不变式和扩展边界，防止业务模块滥用 Runtime 扩展点。

**非目标**

- 不把 Runtime 扩展点暴露为业务日用 API；
  业务层仍以 `Module.live` / `Logix.app` / React hooks 为主，不直接操作 `ModuleRuntime`。
- 不在这一轮引入多种 Runtime 变体的“运行时插件系统”；本次仅提供适配/封装能力。

## 核心设计草案

### 1. ModuleRuntime 语义不变式（已写入 core/05）

在 `docs/specs/runtime-logix/core/05-runtime-implementation.md` 中，已经补充了：

- `ModuleRuntime<S, A>` 可以被替换/自定义，但必须满足：
  - `getState` / `setState`：单一一致 State 树，`setState` 后后续 `getState` / `changes` 可见；
  - `dispatch` / `actions$`：所有经 `dispatch` 派发的 Action 以正确顺序出现在 `actions$` 中；
  - `changes(selector)`：是基于 State 的视图变化流，而不是任意事件流；
  - `ref()`：提供 `SubscriptionRef` 视图，无法提供 selector 变体时至少要保证“整棵 State 的 Ref”正确。

该约束已经作为 Runtime 层的“契约边界”固化下来，后续扩展必须遵守。

### 2. Adapter 形态：RuntimeAdapter → ModuleRuntime

为降低适配门槛，规划一个中间层抽象（示意）：

```ts
interface RuntimeAdapter<S, A> {
  getState: Effect.Effect<S>
  setState?: (s: S) => Effect.Effect<void>
  actions$: Stream.Stream<A>
  changes$?: Stream.Stream<S>
}

namespace ModuleRuntime {
  export function fromAdapter<S, A>(
    adapter: RuntimeAdapter<S, A>,
  ): Logix.ModuleRuntime<S, A> { /* impl in runtime-logix/impl */ }
}
```

设计意图：

- 适配作者关注“如何从外部系统读/写状态、监听 action/state 流”，其余由 `fromAdapter` 补齐：
  - 若只提供 `actions$`，`dispatch` 可以由适配层封装（例如往外部 EventBus 写）；
  - 若只提供 `changes$`，可以在内部叠加 `distinctUntilChanged`、selector 投影等；
  - `ref()` 可以统一基于 `SubscriptionRef` 封装，避免各自为政。
- `fromAdapter` 的具体实现放在 runtime-logix 实现层（`docs/specs/runtime-logix/impl` + `packages/logix-core` 或专用子包），供平台/适配作者使用。

### 3. 提供路径：Module + Logix.app

规划对外推荐的使用方式：

1. 对于“标准本地 Store”：
   - 使用 `Logix.Module('Id', { state, actions })` + `Module.logic` + `Module.live(initial, ...logics)`；
   - 在 `Logix.app` 中通过 `Module.live` 返回的 Layer 提供 Runtime。
2. 对于“自定义 Runtime / 远程 Store 适配”：
   - 由适配层实现 `RuntimeAdapter<S, A>` + `ModuleRuntime.fromAdapter`，得到 `ModuleRuntime<S, A>`；
   - 通过 `Logix.provide(Module, runtime)` 或组装成 Layer 后注入到 `Logix.app`；
   - 业务 Logic 仍通过 `Module.logic(($) => ...)` / Bound API `$` 编排，不感知底层 Runtime 差异。

## 分层落地计划

1. **规划层（现阶段，本草稿）**
   - 已在 `core/05-runtime-implementation.md` 中增加「1.3 扩展点：自定义 ModuleRuntime 的边界」，明确契约与合法用例；
   - 本草稿作为对此扩展点的更具体设计草稿，描述 Adapter 形态与提供路径。
2. **PoC 类型层**
   - 在 `docs/specs/intent-driven-ai-coding/v3/effect-poc/shared/logix-v3-core.ts` 中预留 `ModuleRuntime.fromAdapter` 的类型占位（仅类型，不实现）；
   - 或在 `runtime-logix/impl` 文档中给出伪代码级实现草图；
   - 补一个简短的 demo：例如“基于外部 EventBus 的只读 ModuleRuntime”或“记录所有 actions 的 TestRuntime”。
3. **实现源码层**
   - 在 `packages/logix-core` 或未来的 `@logix/runtime-extensions` 包中，实现 `ModuleRuntime.fromAdapter`；
   - 补充针对 Adapter Runtime 的测试用例，验证：
     - `actions$` 顺序性；
     - `changes(selector)` 的 selector 语义；
     - 与 `BoundApi` / `$.flow` / `Link` 等能力的协作。

## 与业务开发者的边界

- 明确：`ModuleRuntime` / `RuntimeAdapter` / `fromAdapter` 属于“引擎/适配层 API”，默认不出现在业务开发文档中；
- 业务开发者只需要：
  - 定义 Module：`Logix.Module`；
  - 编写 Logic：`Module.logic(($)=>...)`；
  - 通过 `Module.live` / `Logix.app` / React Adapter 使用运行时；
  - 如需特殊 Runtime，由平台/适配团队提供对应的 Module 封装（对业务透明）。

## 待决问题 / TODO

- Adapter 接口的最小形状是否足够：
  - 是否需要为“只读 Runtime”提供单独的标记或约束；
  - 是否需要支持“lazy 初始化”/“按需挂载”。
- `ModuleRuntime.fromAdapter` 应放在哪个包：
  - 直接放在 `@logix/core`；
  - 还是放在 `@logix/runtime-ext` 这类扩展包，以保持核心包精简。
- 是否需要在 Intent/Universe 视角中标记“非标准 Runtime”的 Module，以便平台做差异化可观测性（例如提示“该 Store 来自远程系统”）。
