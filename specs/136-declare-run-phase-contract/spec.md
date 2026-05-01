# Feature Specification: Declare Run Phase Contract

**Feature Branch**: `136-declare-run-phase-contract`
**Created**: 2026-04-09
**Status**: Planned
**Input**: User description: "重定义 Logic 的声明期与运行期模型，统一 lifecycle、fields 声明与内部 descriptor 链路。"

## Supersession Notice

170 已接管 public lifecycle authoring surface。本文保留 declaration root、returned run effect、无 `{ setup, run }` public phase object、动态资源释放走 Scope 等相位事实；本文中关于 public `$.lifecycle.*` 与 `$.lifecycle.onInitRequired` 的拼写口径已被 [../170-runtime-lifecycle-authoring-surface/spec.md](../170-runtime-lifecycle-authoring-surface/spec.md) 覆盖。

当前 public readiness contribution 只写：

```ts
$.readyAfter(effect, { id?: string })
```

本文后续保留的 `$.lifecycle.*` 条目只作为 superseded history / removal witness 阅读，不作为当前实现或新文档示例。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8

## Context

当前内核已经真实执行两类不同工作：

- 一类是注册性工作，例如 readiness declaration、fields、effect wiring
- 一类是运行性工作，例如读取 Env、监听 action/state、执行长生命周期 fiber

但公开作者面仍保留 `setup / run` 这组相位对象，内部还有 `LogicPlanEffect` 递归解析、module-level `fields:`、run 中 late registration 诊断等兼容痕迹。结果是系统已经在逼近“声明区 + 运行区”的真实模型，语言层却还没完全收口。

这份 spec 的职责，是把 `Logic` 的最终相位契约一次性定死：

- 公开心智只保留 declaration 语义与 run 语义
- `readyAfter`、`fields` 等注册性 API 归到 declaration
- `onAction`、`onState`、`use`、`root.resolve` 等运行性 API 归到 run
- 内部若仍保留两段执行计划，也只能作为 internal normalized descriptor，不再作为公开心智对象
- 具体公开拼写可以在实施期从极少数候选里选出，但不得再保留第二个显式 phase object

## Scope

### In Scope

- `Logic` 的公开作者面相位模型
- `$.readyAfter(...)` 与历史 `$.lifecycle.*` 的 owner / phase supersession contract
- `$.fields(...)` 的 owner 与 phase contract
- `Module.make({ fields })` 在 canonical authoring 中的退出口径
- `LogicPlanEffect`、`setup / run` object form、normalized descriptor path 的最终方向
- `Platform` 在作者面中的定位

### Out of Scope

- 不在本 spec 内定义 Form 的包级作者面
- 不在本 spec 内定义 Query 的包级主输出
- 不在本 spec 内定义 I18n 的包级主输出
- 不在本 spec 内重开 host projection 与 verification control plane

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能用一句话讲清 Logic 的最终相位模型 (Priority: P1)

作为维护者，我希望能用一句稳定的话解释 Logic 作者面的相位模型，让人和 Agent 都知道什么放 declaration，什么放 run。

**Traceability**: NS-3, NS-4, KF-4

**Why this priority**: 这是这轮收口的最小生成元。若这层仍然含糊，Form、Query、I18n 只会在各自包里重复争论。

**Independent Test**: 维护者可以在 5 分钟内解释 declaration、run、`$.readyAfter`、platform signal 与 module-level fields 的边界。

**Acceptance Scenarios**:

1. **Given** 一个包含 readiness declaration 与 action 处理的 Logic，**When** 我按本 spec 分类，**Then** 我能明确哪些语句属于 declaration，哪些属于 run。
2. **Given** 一个只包含运行逻辑的 Logic，**When** 我按本 spec 分类，**Then** 我知道它是 declaration 为空的 run-only 子集。

---

### User Story 2 - 包作者能把 readiness 与 fields 声明放进同一条契约 (Priority: P2)

作为包作者，我希望 readiness、fields、effect wiring 这些注册动作有同一条公开契约，不再需要理解多套相位对象。

**Traceability**: NS-3, NS-10, KF-8

**Why this priority**: 包作者写 Form、Query、I18n 时真正需要的是一个足够小且可推导的声明面。继续把 `setup / run` 暴露给所有消费者，只会放大分叉。

**Independent Test**: 给定一个 package-level logic builder，作者能把注册动作全部归到 declaration contract，再把运行行为归到 run effect。

**Acceptance Scenarios**:

1. **Given** 一个需要注册 `$.readyAfter(...)` 与 `fields.declare` 的包逻辑，**When** 我按本 spec 设计，**Then** 两者都落在同一个 declaration contract 下。
2. **Given** 一个需要在运行时读取 Env 并监听 action 的逻辑，**When** 我按本 spec 设计，**Then** 我知道这些语句只能放到 run。

---

### User Story 3 - reviewer 能拒绝旧相位对象与兼容分支继续留在主叙事 (Priority: P3)

作为 reviewer，我希望能直接拒绝继续保留 `setup / run` object form、module-level `fields:` 默认写法和递归 plan 兼容分支的方案。

**Traceability**: NS-4, NS-10, KF-4, KF-8

**Why this priority**: 这轮目标是“一口气收拾干净”。若继续保留旧相位对象做默认写法，包级收口永远都会反复回流。

**Independent Test**: reviewer 可以基于本 spec 直接判断某个 API 或实现分支是否属于应该删除的旧相位残留。

**Acceptance Scenarios**:

1. **Given** 有人提议继续把 `{ setup, run }` 当成 canonical public form，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合终局方向。
2. **Given** 有人提议保留 `Module.make({ fields })` 作为默认作者面，**When** reviewer 对照本 spec，**Then** 能判定该提议不符合终局方向。

### Edge Cases

- `$.readyAfter(...)` 表达 blocking readiness gate，属于 declaration hook，不形成第三个公开 phase。
- `suspend / resume / reset` 是 Platform signal，不属于新的作者面阶段。
- run 阶段的动态资源释放走 `Effect.acquireRelease` 或 Scope finalizer，不允许 late lifecycle registration。
- direct field-kernel expert path 可以保留，但不能再借由公开 phase model 抬升成默认作者面。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-4) 系统 MUST 将 `Logic` 的公开时间角色压缩为 declaration 与 run 两类，并用这一口径解释所有作者面 API。
- **FR-002**: 系统 MUST 将公开 Logic 作者面收成单一 builder surface：允许同步声明 declaration 语义，并收束到唯一的 run effect；具体拼写可在实施期确定，但不得保留第二个显式 phase object。
- **FR-003**: 系统 MUST 让 `{ setup, run }` object form 退出 canonical public authoring；若内部仍保留两段执行计划，也只能停在 internal normalized descriptor 层。
- **FR-004**: (NS-3, KF-4) 系统 MUST 将 `$.readyAfter(...)`、`$.fields(...)` 与其他注册性 wiring 归入 declaration-only contract。历史 `$.lifecycle.*` 只保留为 superseded / negative witness。
- **FR-005**: 系统 MUST 将 `$.use(...)`、`$.onAction(...)`、`$.onState(...)`、`$.on(...)`、`$.root.resolve(...)` 等运行性行为归入 run-only contract。
- **FR-006**: 系统 MUST 保留 readiness blocking 语义，当前 public spelling 为 `$.readyAfter(effect, { id?: string })`，它 MUST 继续作为 declaration hook，不得升级成第三个公开 phase。
- **FR-007**: 系统 MUST 将 `Module.make({ fields })` 退出 canonical docs/examples/package defaults；direct field-kernel path 若保留，只能停在 expert 路由。
- **FR-008**: (NS-4, NS-10, KF-8) 系统 MUST 用确定性、可诊断的 normalized descriptor path 取代递归且不透明的 logic plan 兼容链路。
- **FR-009**: 系统 MUST 固定 `Platform` 只表达宿主 signal source，不定义新的业务作者面相位。
- **FR-010**: 若公开表面需要命名 declaration 语义与 run 语义，命名选择 MUST 服从“单一 builder、无第二 phase object、对人和 LLM 更小更稳”的原则；现有 `setup / run` 不能因语法熟悉度继续保留在 canonical 路由。

### Key Entities _(include if feature involves data)_

- **Logic Declaration Block**: 用于承接 readiness、fields、effect wiring 等注册性动作的同步声明区。
- **Run Effect**: 用于承接 Env 读取、action/state 监听和长生命周期任务的运行期 effect。
- **Logic Descriptor**: declaration 与 run 统一归一化后的内部描述对象，用于 runtime 安装与诊断。

### Non-Functional Requirements (Determinism & Forward-Only Cutover)

- **NFR-001**: (NS-10, KF-8) declaration 与 run 的边界必须可解释、可诊断，并在 diagnostics 关闭时保持近零额外心智成本。
- **NFR-002**: declaration 收集顺序、freeze 时机、run 启动顺序必须保持确定性，便于证据和调试对齐。
- **NFR-003**: 本轮收口不得保留兼容层、弃用期或双轨 canonical 写法。
- **NFR-004**: docs、examples、tests 与 root export 对 phase model 的叙述必须完全一致，不能一处讲 declaration/run，另一处继续讲 setup/run。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-4) 维护者可以在 5 分钟内把任一 Bound API 归类为 declaration-only、run-only 或 expert-only。
- **SC-002**: canonical docs/examples 不再把 `{ setup, run }` object form 与 module-level `fields:` 作为默认写法。
- **SC-003**: reviewer 可直接依据本 spec 否决任何试图保留旧相位对象作为默认主叙事的方案。
- **SC-004**: runtime diagnostics 能以 declaration/run 语言解释 phase 违规和 registration freeze，不再依赖旧术语。
