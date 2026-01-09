# Feature Specification: Busy Indicator Policy（延迟显示/最短显示/防闪烁）

**Feature Branch**: `091-busy-indicator-policy`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: 标准化 Busy Indicator（忙碌指示）策略：定义延迟显示阈值、最短显示时间、避免闪烁/过度反馈的默认规则，并允许按网络速度/交互类型自适应；策略应由框架/设计系统承载，业务只声明动作与期望体验，不再到处手写 spinner/骨架/闪烁兜底。

## Context

Async UI 的“体验问题”往往不是缺少 loading，而是 loading 的节奏不协调：

- 快网/快操作：不应出现闪烁的 spinner（过度反馈）。
- 慢网/慢操作：需要稳定、可预测的 busy 指示（并避免频繁切换）。
- 多并发：不能在页面到处冒出 busy 指示（噪音/遮挡/不可访问）。

Logix 已有优先级通知与 RuntimeProvider 的 fallback，但 busy 指示的 UX 策略仍容易散落在业务组件里（手写 setTimeout、手写最短显示、手写“别闪”逻辑）。本特性把 busy 指示策略收敛为框架层的统一规则，并要求与 088 Async Action 协调面合流（busy 的事实源应来自 ActionRun/Resource，而非业务布尔拼凑）。

## Terminology

- **Busy Policy**：统一的 busy 显示/隐藏规则（delay/minDuration/maxDelay 等）。
- **Busy Boundary**：在 UI 中承载 busy 协调的边界（可用于聚合多个 action/resource 的 pending）。
- **Over-feedback**：页面到处闪烁 spinner/骨架，导致用户注意力被打散。

## Assumptions

- 依赖 088：busy 的事实源优先来自 ActionRun 的 pending/settle（或资源 pending），而不是业务自管布尔。
- 允许有不同渲染策略：本 spec 不强制具体视觉样式，只规范“何时出现/何时消失/如何避免闪烁”。

## Clarifications

### Session 2026-01-10

- AUTO: Q: BusyPolicy 的默认参数是多少？ → A: 默认 `delay=150ms`、`minDuration=300ms`（可覆盖）；目标是在快操作下避免闪烁、在慢操作下提供稳定反馈。
- AUTO: Q: BusyBoundary 如何聚合多个 pending 源？ → A: BusyBoundary 默认聚合其作用域内所有 ActionRun/Resource 的 pending；当任一源 pending 超过 delay 时进入 busy，并在所有源 settle 后满足 minDuration 才退出（保证行为可测且不抖动）。
- AUTO: Q: 嵌套 BusyBoundary 的默认裁决是什么？ → A: 默认“外层可见优先”：若祖先 boundary 已处于 busy-可见状态，则子 boundary 默认抑制其 busy UI（避免重复/过度反馈）；可通过显式选项允许嵌套展示。
- AUTO: Q: busy 是否产生新的 runtime 诊断事件？ → A: 默认不新增（避免噪音与并行真相源）；busy 的可解释性优先复用 action/resource 的事件链路，必要时仅做 UI 层派生解释（不导出为事实源）。
- AUTO: Q: 最小可访问语义是什么？ → A: BusyBoundary 默认提供最小可访问语义（例如在容器上设置 `aria-busy`）；Action Props 组件在 pending 时提供禁用态/可感知状态，但不得制造屏幕阅读器噪音风暴。

## Out of Scope

- 视觉设计稿/具体 UI 组件库（可在后续 Design System spec 中细化）；本 spec 先交付最小可复用策略与参考实现。
- View Transition 动画（可作为增强，不作为门槛）。

## User Scenarios & Testing _(mandatory)_

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

### User Story 1 - 快操作无闪烁，慢操作有稳定 busy（Priority: P1）

作为最终用户，当操作很快完成时我不应看到忙碌指示闪一下；当操作较慢时我应看到稳定的忙碌指示，并在完成后自然消失。

**Why this priority**: 这是“从混乱到协调”的直观体验指标；若不统一策略，业务会到处手写并产生不一致。

**Independent Test**: 在同一 UI 场景下模拟快/慢两种耗时，验证 busy 的 delay/minDuration 行为稳定且不闪烁。

**Acceptance Scenarios**:

1. **Given** 一个 action 在 delay 阈值内完成，**When** 用户触发 action，**Then** busy 指示不出现。
2. **Given** 一个 action 超过 delay 阈值才完成，**When** 用户触发 action，**Then** busy 指示出现并至少持续 minDuration，完成后消失。

---

### User Story 2 - 业务不写计时器（Priority: P2）

作为业务开发者，我只需要声明 action/resource，并在 UI 中放置一个 Busy Boundary（或使用 Action Props 组件），就能获得一致的 busy 行为，不需要手写 `setTimeout` / “最短显示” / “别闪”逻辑。

**Why this priority**: 把复杂性封装到框架层，才能避免到处出现不同版本的 busy 协调代码。

**Independent Test**: 在示例中，业务代码不出现任何 busy 相关计时器逻辑，仍能满足 US1 的行为。

**Acceptance Scenarios**:

1. **Given** 业务只提供 action/resource，**When** 放置 Busy Boundary，**Then** busy 行为由框架一致控制且可覆盖默认策略。

---

### User Story 3 - 可访问性与可诊断性（Priority: P3）

作为维护者，我能确保 busy 指示可访问（可被辅助技术感知，不造成焦点/输入错误），并能在诊断开启时解释“为什么此刻显示 busy”（关联到 action/resource）。

**Why this priority**: busy 指示一旦不可访问或不可解释，会造成用户与开发双重成本。

**Independent Test**: 在诊断开启时，busy 显示/隐藏能产出 Slim 事件（或复用 action/resource 事件）；在诊断关闭时不引入常态开销。

**Acceptance Scenarios**:

1. **Given** busy boundary 聚合多个 pending 源，**When** busy 显示，**Then** 能解释其来源（actionId/resourceKey）且不破坏交互关键路径。

### Edge Cases

- 嵌套 Busy Boundary：内外边界如何裁决（外层聚合、内层局部提示）以避免重复指示。
- 并发 pending：多个 action/resource 同时 pending 时如何合并显示（避免 over-feedback）。
- 快速翻转：pending 很短但连续发生（抖动）；策略如何避免频繁闪烁同时保证最终一致。
- 用户取消：取消时 busy 如何收敛（可能需要最短显示仍满足）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 Busy Policy 的默认参数：至少包含 delay（延迟显示）与 minDuration（最短显示），并提供可覆盖机制（按 boundary/action/resource 覆盖）；默认值固定为 `delay=150ms`、`minDuration=300ms`。
- **FR-002**: 系统 MUST 提供 Busy Boundary（或等价能力）用于聚合多个 pending 源（action/resource），并默认避免 over-feedback（不允许页面到处冒 busy）。
- **FR-003**: 系统 MUST 与 088 合流：busy 的事实源必须来自 ActionRun/Resource 的 pending（或等价稳定信号），禁止业务手写布尔作为唯一事实源。
- **FR-004**: 系统 MUST 在快操作下避免闪烁：delay 内完成不得显示 busy；慢操作显示后必须满足 minDuration 才能消失。
- **FR-005**: 系统 MUST 保持 React 无 tearing：busy 状态读写必须锚定同一快照版本，不得造成同一 commit 读到不一致的 busy/状态组合。
- **FR-006**: 系统 MUST 支持可访问性：busy 状态必须可被辅助技术感知且不破坏输入/焦点；默认实现需提供最小可访问语义（例如 aria busy）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: busy 策略不得引入常态计时器风暴：同一 boundary 内应去重调度，且在 `diagnostics=off` 下接近零成本。
- **NFR-002**: busy 状态的诊断（若有）必须 Slim/可序列化；优先复用 action/resource 事件链路，不新增并行真相源。
- **NFR-003**: 默认策略必须可预测：同一输入序列下 busy 的出现/消失行为稳定可测。

### Key Entities _(include if feature involves data)_

- **BusyPolicy**：delay/minDuration 等参数集合（可覆盖）。
- **BusyBoundary**：聚合 pending 源并应用 BusyPolicy 的 UI 边界。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 快操作（小于 delay）下 busy 不出现；慢操作（大于 delay）下 busy 出现且至少持续 minDuration（可自动化测试断言）。
- **SC-002**: 业务示例中不出现手写 busy 计时器逻辑（busy 由框架策略统一控制），仍满足 SC-001。
- **SC-003**: busy 聚合多个 pending 源时不会产生过度反馈（默认行为可预测且可测）。
