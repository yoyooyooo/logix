# Feature Specification: 限定 scope 的全局：路由 Host(imports) 弹框 keepalive + ModuleScope

**Feature Branch**: `[037-route-scope-eviction]`  
**Created**: 2025-12-26  
**Status**: Complete  
**Input**: User description: "实现真实业务里的“限定 scope 的全局”：同一路由内多个弹框模块 keepalive（反复打开/关闭不丢状态），离开路由后统一销毁；补齐由浅入深的用户文档，并提供可复用的 Scope 工具减少 props 透传。"

**Acceptance**: `specs/037-route-scope-eviction/acceptance.md`

## Assumptions

- 不考虑向后兼容：允许调整或新增对外 API 与文档写法，但必须给出清晰的迁移/替代建议。
- “路由 scope”是业务边界：默认等价于“页面/路由视图的生命周期”，但允许业务通过显式信号结束该 scope（例如 keep-alive 场景）。
- 本需求仅涉及内存生命周期与可观测性；不引入持久化存储，不跨页面刷新保状态。

## Out of Scope

- 不实现具体路由框架的适配（例如自动监听路由切换事件）；由业务在边界处决定何时结束 route scope。
- 不新增“路由专用”的运行时 API/Hook；路由仅作为 scope 边界的一种场景示例。
- 不引入第二套全局状态系统；仍以模块实例 scope（父实例 + 子模块）表达“限定 scope 的全局”。
- 不新增 UI 组件库级的弹框管理器；本需求只提供运行时/缓存能力与文档最佳实践。
- 本阶段不实现 React ModuleCache 的显式 eviction/clear API（如后续仍需要，将单独开 spec 或作为后续 phase 再评估）。

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 路由范围的“限定 scope 全局” (Priority: P1)

作为最终用户，我在同一个路由内打开/关闭多个弹框时，弹框内部状态应尽可能保持（体验稳定）；但当我离开该路由后，该路由下所有弹框相关模块实例必须被统一销毁，避免跨路由串状态与后台残留副作用。

**Why this priority**: 这是业务真实高频场景：弹框经常被反复打开/关闭，且同一路由下弹框之间可能共享会话上下文；但跨路由必须彻底隔离，避免“回来发现上次弹框状态还在”或后台任务继续跑。

**Independent Test**: 用一个“路由 A + 两个弹框（A1/A2）+ 路由 B”的最小示例即可独立验证：在 A 内反复开关弹框不丢状态；切到 B 后 A 的弹框模块不再存活；返回 A 后从初始状态重新开始。

**Acceptance Scenarios**:

1. **Given** 用户位于路由 A 且弹框 A1 已经写入非默认状态，**When** 用户关闭弹框 A1 并在同一路由 A 内再次打开 A1，**Then** A1 的状态保持不变（不回到初始值）。
2. **Given** 用户位于路由 A 且弹框 A1/A2 都已写入非默认状态，**When** 用户切换到路由 B（路由 A 的 scope 结束），**Then** 路由 A 下所有弹框模块实例被立即销毁（不等待被动保活窗口），且它们不再产生后台副作用（例如轮询/订阅停止）。
3. **Given** 用户从路由 A 切换到路由 B 后又返回路由 A，**When** 再次打开弹框 A1/A2，**Then** 它们必须以初始状态开始（不得复用上一轮路由 A 的实例）。

---

### User Story 2 - 文档化可落地的最佳实践 (Priority: P2)

作为业务开发者，我希望可以直接从用户文档与 API 文档中学会：如何把“路由范围的全局状态 + 多个弹框子模块”组织成清晰的 scope，并理解与“全局单例模块/局部会话模块/父子 imports 模块”的差异与取舍。

**Why this priority**: 目前能力分散在多个概念（全局/局部/多实例/imports/Root 单例语义）里，容易让业务误用（例如把子模块当全局单例读，导致多实例串用）。文档必须把“路由 scope”这一业务心智模型收敛成一条可复制的推荐路径。

**Independent Test**: 仅通过文档与示例，业务开发者可以在一个空白页面里复刻 User Story 1 的验收场景，并能解释“为什么这样写不会串实例/为什么离开路由会销毁”。

**Acceptance Scenarios**:

1. **Given** 开发者阅读文档并按“路由 scope + 弹框子模块”推荐写法实现示例，**When** 运行示例并执行 User Story 1 的三个场景，**Then** 行为与预期一致，且无需阅读引擎内部实现。
2. **Given** 开发者需要在 keep-alive 或“离开但不卸载”的场景中对齐边界清理，**When** 查阅文档，**Then** 能找到“如何显式结束 scope”的推荐写法（例如卸载/替换边界 Provider、或通过稳定 scopeId 的切换开启新 scope），以及常见误用与排错。

---

### User Story 3 - Scope 工具化（减少 props 透传） (Priority: P3)

作为业务开发者，我希望有一套“可复用的 Scope 组合件”：在路由/页面边界创建一次 Host 实例并通过 Provider 暴露；任意深度的子组件都能用一个 hook 拿到该 Host 句柄（无需层层 props 透传）；如果忘记包 Provider，应立即抛出可读错误，避免静默拿到错误实例。

**Why this priority**: 真实业务团队的主要风险不是“不会写 API”，而是“写得语义不清、最后串实例”；把 Host 创建 + Context Provider + useHost() 打包成标准模式，可以显著降低心智负担与误用概率。

**Independent Test**: 在一个最小 React 页面里定义 RouteHostScope 并包裹路由内容；在深层弹框组件中直接 useHost 并通过 host.imports.get 获取子模块句柄；验证“不开 Provider 会报错、开 Provider 能稳定复用、离开边界后统一销毁”。

**Acceptance Scenarios**:

1. **Given** 子组件调用 `RouteHostScope.use()` 但上层未挂载 `RouteHostScope.Provider`，**When** React render，**Then** 必须抛出明确错误（提示缺少 Provider）。
2. **Given** `RouteHostScope.Provider` 已挂载且 scope 未结束，**When** 弹框 UI 反复卸载/挂载，**Then** 弹框模块实例应持续复用同一个 Host(imports) scope（状态保持）。
3. **Given** scope 结束（路由卸载或业务显式结束边界），**When** 再次进入同一路由并打开弹框，**Then** 必须以初始状态重新开始（不得复用上一轮 scope 的实例）。

---

### Edge Cases

- 子组件在缺少 Scope Provider 的情况下直接调用 `use()`：应立即抛出错误（不允许静默兜底到“全局单例”）。
- 误用 `useModule(Child.tag)`：容易把弹框挂到 Provider 级单例导致跨路由串状态；文档必须给出反例与纠正路径。
- 弹框数量较多：Host(imports) 可能偏 eager；文档需要明确取舍与可选的“按需拆分 Host”策略（不要求本阶段实现自动优化）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 支持用“父实例 scope + 子模块集合”的方式表达“限定 scope 的全局”，使同一路由内多个弹框可复用/共享其所属 scope 下的模块实例。
- **FR-002**: 当父实例 scope 结束时，系统 MUST 支持其 scope 下的子模块实例被立即统一销毁（不依赖默认被动保活窗口），并停止所有与之绑定的长期流程/后台副作用。
- **FR-003**: 系统 MUST 提供一个可复用的 React Scope 工具（Provider + hook），用于“创建 Host 实例 + 暴露给深层组件使用”，以减少 props 透传与手写 Context 的样板代码。
- **FR-004**: 系统 MUST 在用户文档中明确三类“拿模块句柄”的语义差异，并提供默认推荐路径与反例：
  - Host(imports) 子模块句柄（绑定父实例 scope）；
  - `useModule(Impl)` 的局部/会话实例（绑定组件 retain/release）；
  - `useModule(Tag/Def)` 的 Provider 环境单例（绑定 Provider scope）。
- **FR-005**: 系统 MUST 文档化“keep-alive/离开但不卸载”场景如何显式结束 scope，并说明其与“路由 unmount 自动结束”的差异。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 不引入对 `useModule(Impl)` 热路径的可观测性能回退；Scope 工具应是薄封装，不在 render 热路径引入额外 O(n) 工作。
- **NFR-002**: 系统 MUST 不依赖进程级全局单例；scope 行为必须按运行容器（runtime tree）与实例范围工作，便于测试与多实例隔离。
- **NFR-003**: 系统 MUST 在实例/事务/操作序列等诊断面使用确定性标识（不得默认随机/时间），以保证多实例与 scope 的可解释性。
- **NFR-004**: scope 结束/销毁不得引入新的“事务窗口内 IO”或跨边界写入逃逸；本需求仅调整生命周期/使用方式与文档，不改变事务边界规则。

### Key Entities *(include if feature involves data)*

- **路由 scope**：业务边界（页面/路由视图的一段生命周期），用于限定“可共享但可整体销毁”的全局状态范围。
- **父实例（Host）**：承载该 scope 的拥有者实例；其生命周期结束时，scope 下所有子模块应统一销毁。
- **弹框子模块实例**：挂在父实例 scope 下的模块实例；在路由内可保状态，跨路由必须隔离。
- **Scope 工具（Provider + hook）**：把“创建 Host 实例 + 暴露给子组件”收敛成可复用模式，降低业务心智负担。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在示例或最小演示中，User Story 1 的三个验收场景全部可复现通过，且不出现跨路由串状态。
- **SC-002**: Scope 工具可在“无 props 透传”的前提下复刻 SC-001，且缺少 Provider 时抛错可读（能在 30 秒内定位问题）。
- **SC-003**: 文档覆盖：用户文档至少包含一篇可复制配方，明确“甜点区/高级区”分层，并给出常见误用与排错指引。
- **SC-004**: 多实例隔离：同一路由内若显式提供不同 scope key（例如多 Tab），不同 key 对应的 Host/imports 必须完全隔离（状态不互串）。

## Clarifications

### Session 2025-12-26

- Q: 路由切换后“销毁时限”期望？（A 立即 / B ≤1秒 / C 允许默认短保活窗口） → A: A（立即，无默认保活窗口）
- Q: “路由 scope”是否需要特殊运行时对待？推荐的最佳实践形态是什么？ → A: 路由不特殊，只是一个 scope 边界场景；推荐以路由 Host 模块承载 scope，并将弹框模块作为 `imports` 子模块；组件侧通过 `host.imports.get(Modal.tag)` / `useImportedModule(host, Modal.tag)` 获取“属于该 Host 实例”的句柄，关闭弹框不销毁模块实例，离开路由（Host scope 结束）统一销毁。
- Q: 弹框关闭（UI 卸载）后是否要求模块实例继续保活？ → A: 是；只要路由 Host 未卸载（scope 未结束），imports 下的弹框模块实例全部 keepalive（状态保留）。
- Q: 主推的最佳实践选型？ → A: 主推 `Host(imports)`（路由/页面作为 scope 场景）+ Scope 工具（Provider + hook）降低 props 透传；keep-alive 场景通过“卸载/替换边界 Provider 或切换稳定 scopeId”显式结束 scope（显式 eviction/clear API 暂缓评估）。
- Q: 用户文档如何降低误用与心智成本？ → A: 提供由浅入深的教程级内容，显式划分“甜点区（日常业务）”与“高级区”；默认写法在甜点区避免暴露 `useModule(ModuleTag)` 等需要理解 Env/Scope 的高级入口，并用清晰的反例/排错说明覆盖常见误用。
