---
title: runtime-logix 规范可调整点与修订建议（草稿）
status: superseded
version: 2025-11-30T00:00:00.000Z
superseded_by: ../L5/runtime-core-evolution.md
priority: 1900
---

## 背景

- 当前 `docs/specs/runtime-logix` 中的一些规范条目，是在缺少完整实现反馈的情况下先行拍板的；随着 `@logix/core` / `@logix/react` / `@logix/test` PoC 推进，部分细节暴露出“实现负担偏大”或“与工程习惯略脱节”的问题。
- 本草稿针对这些“值得优化/重写”的规范点做一次集中整理，目的是：
  - 区分哪些属于“设计方向正确，细节可放松”的部分；
  - 哪些应当在文档层面收紧或改成“示例”，避免约束过死；
  - 为后续 v3.x 规范修订提供待决列表。

> 注：这里只列“我认为规范本身可以调整/需要复盘”的点，那些“实现偏离、但规范方向明确正确”的内容已经在 `docs/specs/review/runtime-logix-impl-review.md` / `runtime-logix-spec-todo.md` 里覆盖。

## 1. `ModuleRuntime.make` 的签名与职责边界

### 1.1 现有规范形态

- `core/05-runtime-implementation.md` 中的草图将 `ModuleRuntime.make` 定义为：
  - 接收 `stateLayer` / `actionLayer` / `logicLayers` 等多个 Layer；
  - 在内部完成 State 初始化、Action 通道建立、Runtime 构造和 Logic 启动。
- 这种形态在“概念解释”上非常清晰：State/Actions/Logic 三者如何被组装到一起一目了然。

### 1.2 问题与风险

- 对实现方而言，这个签名有比较强的“侵入性约束”：
  - 所有围绕 `ModuleRuntime` 的构造都被绑到一个统一的 `make` 上，扩展空间有限；
  - 将 Logic 启动强行塞入 `ModuleRuntime.make`，会让 `Module.live` / 上层容器的职责变得模糊。
- 对使用者而言，这个签名并不是日常需要理解的接口：
  - 业务代码只关心 `Module.live(initial, ...logics)`；
  - 适配作者可以直接构造 `ModuleRuntime<S, A>` 或通过 Adapter 工具，不一定要走“Layer + make”这条路。

### 1.3 建议调整方向

- 把 `ModuleRuntime.make` 的“Layer 组合 + Logic 启动”部分，从规范硬约束降级为“推荐实现草图”：
  - 文档保留这段伪代码，用来解释 Runtime 内部是如何工作的；
  - 但在“契约”层，只要求 `ModuleRuntime<S, A>` 满足接口与语义不变式。
- 在规范中明确两层边界：
  1. **硬边界**：`ModuleRuntime` 接口与语义（`getState` / `setState` / `dispatch` / `actions$` / `changes` / `ref`）；
  2. **软建议**：如何基于 Effect Layer 组合得到标准实现（可以有多种变体，不要求唯一）。
- 在 `impl` 文档中给出一个更现实的分层：
  - 可以是当前 PoC 的形态：`ModuleRuntime.make(initialState)` 只负责心脏，`Module.live` 负责“绑定 Shape + Logic + Runtime.make”；
  - 或者未来合并成“Layer 级 make”，但都不应在规范里被当作唯一正确姿势。

## 2. 自定义 `ModuleRuntime` 的构造路径

### 2.1 现有规范形态

- 当前规范强调：
  - `ModuleRuntime` 可以被替换/自定义，但必须满足一组语义不变式；
  - 同时示意图暗示“最好通过统一的 `ModuleRuntime.make`”来构造。

### 2.2 问题与风险

- 实际上，自定义 Runtime 有多种合法路径：
  - 直接提供 `Layer<Tag, E, R>`，在其中构造任意符合接口的不变实现；
  - 通过中间 Adapter（例如 `RuntimeAdapter`）包装远程 Store / 调试 Runtime；
  - 在测试环境用专用 `TestRuntime` 封装。
- 如果规范把“构造方式”也当成硬约束，会让适配作者背负额外心智负担，且限制 PoC 阶段的快速试错。

### 2.3 建议调整方向

- 在规范（特别是 `core/05-runtime-implementation.md`）中：
  - 保留语义不变式和“合法/不推荐用法”列表，作为自定义 Runtime 的唯一硬约束；
  - 将“应该通过 `ModuleRuntime.make` 构造”的语气改为“推荐实现之一”，并明确允许：
    - 适配作者自行在 Layer 中构建 `ModuleRuntime` 实例；
    - 使用 `ModuleRuntime.fromAdapter` 之类的工具函数（详见 `docs/specs/drafts/L9/module-runtime-adapter-and-customization.md` 草稿）。
- 增补一节“自定义 Runtime 设计指南”：
  - 包含远程 Store 包装、测试 Runtime、只读 Runtime 等示例；
  - 强调如何验证不变式，而不是规定必须在哪个函数里构造。

## 3. Debug / Inspector 的位置与粒度

### 3.1 现有规范形态

- `core/09-debugging.md` + `impl/v3-scope-lock.md` 描述了相对完整的调试体系：
  - Debug 事件流、Inspector、Scope Lock、Replay 等；
  - 较多能力是偏终局形态的设计。

### 3.2 问题与风险

- 对当前仓库状态而言：
  - Runtime 核心契约还在演进中，过早在规范里锁死 Debug 协议会增加重构成本；
  - 现有实现已经倾向于在核心路径里写临时 `console.log`，说明“正式 Debug 接口”尚未形成心智共识。

### 3.3 建议调整方向

- 将 Debug 相关规范拆为两层：
  1. **短期硬约束**：
     - 核心 Runtime / BoundApi / React Adapter 中禁止直接 `console.log`；
     - 所有调试输出都应通过 Effect 日志或可插拔 Layer 提供；
     - 可以只定义一条简单 Debug 事件流（如 Action/State 变化），其余能力留待后续迭代。
  2. **长期蓝图**：
     - Inspector / Scope Lock / Replay 等保持在 `impl` 或 Topics 草稿中；
     - 明确标记为“v3.x+ 目标设计”，避免被误解为当下必须实现的契约。
- 规范文本中对 Debug API 的描述尽量聚焦“边界”（例如不影响业务语义、不破坏性能），而不是一次性规定完整协议。

## 4. React & Test 规范的“强度”

### 4.1 React Hook 契约

- `core/07-react-integration.md` 中为 `useModule` / `useSelector` / `useDispatch` 设计了一套比较理想的 API：
  - `useModule(handle)` 返回 Runtime；
  - `useModule(handle, selector, equalityFn?)` 做订阅；
  - `useSelector(runtime, selector, equalityFn?)` 基于 `useSyncExternalStore` 实现。
- 这套形状我认为方向是正确的，但可以在规范中明确区分：
  - 哪些是“必须满足的行为约束”（例如避免 tearing，保证 Runtime 引用稳定）；
  - 哪些是“当前推荐的 API 形状”（允许将来根据 React 生态演进微调）。

### 4.2 Test Kit 契约

- `runtime-logix/test/01-test-kit-design.md` 早期以 `defineTest` / `Scenario` 为入口描述了一套能力蓝图，包括：
  - TestClock、trace、服务 mock、ExecutionResult 结构等。
- 当前实现已切换到 `TestProgram` + `runTest` 为主入口，旧稿仍可作为能力清单参考，但具体 API 形状以 `impl/test-package.md` 为准。

### 4.3 建议调整方向

- 在 React / Test 相关规范里引入“层级”标记：
  - Level 1：必须遵守的行为边界（例如 hook 不得造成状态撕裂、测试不得依赖外部全局状态等）；
  - Level 2：推荐 API 形状（允许未来小改）；
  - Level 3：长期能力（例如完整 trace / 可视化集成）；
- 对当前实现，优先对齐 Level 1/2，将 Level 3 保持在 drafts/topics 中逐步演进。

## 5. 后续动作建议

- 将本草稿作为 L9 起点，后续在梳理 runtime-logix 规范时：
  - 若有新的实现经验，优先在此文件中追加“利弊分析”和“替代方案”；
  - 成熟后（L6-L4）再将其中稳定结论迁移到：
    - `core/05-runtime-implementation.md`（Runtime 边界与构造）；
    - `core/07-react-integration.md`（React Hook 行为边界与 API）；
    - `runtime-logix/test/*`（测试工具包）。
- 对已经实现的 PoC，如果发现与规范存在张力，可以先在此草稿中记录“偏差原因”和“可能的规范修订方向”，避免直接把实现硬拗向旧规范。
