# Spec Group: Logix Control Laws v1（UI→React，Logic→Logix）

**Feature Branch**: `077-logix-control-laws-v1`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: “用一个可迭代的系统方程长期指导演进；UI 交给 React；逻辑交给 Logix；逻辑编排更声明式。”

## Why: 为什么要有一个 Group Spec

我们已经把关键能力拆成多个 feature spec（073/075/076）。风险在于：

- 参考系（tick）与控制律（Flow/时间算子）各自演化，最终形成“双真相源/影子时间线”；
- 命名/证据口径（tickSeq/txnSeq/opSeq、Static IR/Dynamic Trace）漂移，Devtools 无法稳定解释；
- Query/Form 继续用 watcher 胶水填坑，回到“从静态推断动态”的痛苦。

因此需要一个 **总控入口**：

- 只负责“最高层裁决 + 依赖关系 + 里程碑与 gate + 单入口导航”；
- 不复制 member 的实现任务（避免并行真相源）。

## THE ONE: 系统方程（长期指导，可迭代）

形式化工作模型的 SSoT 在：

- `docs/ssot/platform/contracts/00-execution-model.md` 的 “1.2 最小系统方程”

本 group spec 只做落地映射与分层裁决复述（不新增第二套公式）：

```text
F: 参考系（tick）
Π: 控制律（Programs）
C_T: 约束闭包（Traits）
Ω: 观测/投影（React 读取的快照）

Ops_t  = Π(E_t, S_t, t)
S_{t+1}= Close_{C_T}( S_t ⊕ Δ(Ops_t) )
Obs_t  = Ω_F(S_t)
```

注：SSoT 在 `docs/ssot/platform/foundation/01-the-one.md` 中进一步扩展为 `Σ_t=(S_t,I_t)`（开放系统/并发/定时器/背压等在途态，见 “3.1”）。本 group 默认采用该扩展心智，不另写第二套公式。

裁决（防漂移）：

- `React = Ω_F`：只负责观测/渲染/DOM integration；不再承担“数据胶水同步”。
- `Logix = Π + Δ + Close_{C_T}`：只负责控制律、事务化应用与约束收敛；禁止“在 trait meta 里塞自由工作流再反射解释”。
- `tickSeq` 是 simultaneity 的锚点：同一次 render/commit 只能观测到同一 tick 的快照；任何时间算子必须进入同一证据链（禁止影子 setTimeout/Promise 链）。

## Tape：时间线可控（快进/倒退/分叉）的最低门槛

我们正在引入一种“可回放磁带（Tape）”能力：它不是诊断 trace，也不是结构 IR，而是 **足以 deterministic replay 的客观记录**。

对本 group 来说，Tape 的意义是把 “时间算子/并发/IO” 从黑盒变成可控、可解释、可回放的系统能力：

- `E_t`（外部输入与 IO/timer outcome）必须能被事件化并记录；
- `Δ`（事务提交 patch）必须可记录并关联 tickSeq；
- `I_t`（timers/fibers/backlog/cancel…）至少要有 Slim 锚点记录，否则“latest/debounce/delay/timeout”无法在回放中解释与复现。

对应契约入口：

- 长期模型：`docs/ssot/platform/foundation/01-the-one.md`
- 时间旅行交互/愿景：`docs/ssot/platform/contracts/02-time-travel.md`
- Program 侧 Tape 口径（可回放最小记录）：`specs/075-flow-program-codegen-ir/contracts/tape.md`

## Members（本 group 调度的 specs）

关系 SSoT：`specs/077-logix-control-laws-v1/spec-registry.json`（机器可读）。  
人读阐述：`specs/077-logix-control-laws-v1/spec-registry.md`。

- `specs/073-logix-external-store-tick/`：建立参考系 `F`（`RuntimeStore + tickSeq`，no-tearing）
- `specs/075-flow-program-codegen-ir/`：建立通用控制律 `Π_general`（FlowProgram Codegen IR：出码层 + 时间算子进入证据链）
- `specs/076-logix-source-auto-trigger-kernel/`：建立受限控制律 `Π_source`（source 自动触发内核化，消灭 Query/Form 胶水）

## Spec 快速裁决（三问，避免“只做微调”的幻觉）

当你在评审/推进任何与 **控制律（Π）/时间语义/自动触发/Watcher** 相关的 spec 时，先用三问做裁决：

1. **能否降解到统一最小 IR？**（Static IR + Slim Trace/Tape；纯数据可序列化；无运行期闭包；tickSeq 可归因）
2. **是否引入并行真相源？**（第二套 ID/IR/时间线/推断规则/缓存真相源；或“静态里塞动态再反射解释”）
3. **默认档是否近零成本且不线性退化？**（`diagnostics=off` 近零成本；不会因 programs/watchers 增长而线性扫描/线性订阅；Action fan-out 与路由对齐 `specs/068-watcher-pure-wins/` 的约束）

裁决规则：

- 任一题回答为“否”，就不应以“文案拉齐/小修小补”推进；应拆分/重构/暂停，直到三问都能给出可证据化的“是”。

### 反模式清单（新定位下应降级到 v2/backlog 或直接停掉）

- 把 075 FlowProgram 当作“人类主写 DSL”去做 DX：大量语法糖/重载、闭包映射、v1 就引入 service 结果数据流、自动派生 stepKey、邻接推断分支等 —— 这些会与“IR 可导出/可回放/性能门槛”硬冲突。
- 继续投资 trait meta/feature 包里的反射式工作流（把触发/时间/分支塞回 meta 再解释）：会制造并行控制律与影子时间线；应由 076（受限 Π_source）+ 075（通用 Π_general）接管。
- 任何导致 watcher 数量随 programs 增长、或 dispatch/commit 需要线性扫描全量的设计：必须回到 068 的 fan-out/topic-index 约束重新设计，而不是事后补丁。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - “声明式编排 + 可解释链路”端到端闭环 (Priority: P1)

作为业务开发者，我希望在 React UI 中只写 UI（展示/交互入口），把下面的链路交给 Logix：

- 点击 submit（Action）
- 调用 API（IO，事务窗口外）
- 成功后 navigate + 刷新依赖的 source/query（Ops）

**Why this priority**：这是 “UI→React，Logic→Logix” 的最小闭环；若这里仍需手写 watcher/计时器，后续很难收口。

**Independent Test**：一个最小 demo（可在 `examples/logix` 或现有 query/form 场景里）证明：

- React 同时读取多个模块时无 tearing（同 tickSeq 快照）
- submit 工作流由 Program 声明式表达（而不是 watcher 胶水）
- source 自动触发不再依赖“监听 action → 反查 trait”
- Devtools 能导出 Static IR + Dynamic Trace 锚点，解释“为何发生这次 refresh/navigate/dispatch”

**Acceptance Scenarios**（集成验收由 member specs 分别落测试，本 group 只定义口径）：

1. **Given** 页面同时读 Router 模块与 Query 模块，**When** Router 外部输入变化并触发下游 source/query，**Then** UI 观测到同 tickSeq 的一致快照，无闪动中间态。
2. **Given** 声明式 submit Program，**When** dispatch submit，**Then** serviceCall→success branch→navigate/refresh 的因果链可归因到同一条 tick 证据链。

---

### User Story 2 - 时间算子成为一等公民但不破坏参考系 (Priority: P2)

作为 runtime 维护者，我希望 delay/debounce/retry/timeout 等时间语义：

- 不以业务层 watcher 的黑盒计时器实现（禁止影子时间线）
- 能被 tickSeq/trace 解释与回放

**Independent Test**：在 075/076 中各自覆盖（一个 delay，一个 debounce），并确保 Trace 能回答“为什么此刻触发”。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 必须存在一个 group-level 的成员关系 SSoT（`spec-registry.json`），并可生成索引式执行清单（checklists）。
- **FR-002**: 075/076 的 contracts/术语必须以 `docs/specs/.../97` 的最小系统方程为准（不得自创第二套分层）。
- **FR-003**: 任何“动态律”能力必须以 Program 形态进入 `Π`（可编译、可导出 IR），不得回退到 trait meta + 反射式解释作为主路径。

### Non-Functional Requirements

- **NFR-001**: 参考系唯一：React/宿主只订阅 `RuntimeStore`（tickSeq 锚定），禁止双真相源。
- **NFR-002**: 证据链可解释：IR/Trace 必须 Slim、可序列化、稳定标识（tickSeq/txnSeq/opSeq/instanceId）。
- **NFR-003**: 事务窗口禁 IO：任何 IO 必须通过 Ops 显式表达并在窗口外执行。

## Success Criteria _(mandatory)_

- **SC-001**: 完成 073 M1 后，React 多模块读取无 tearing（同 tickSeq 快照）。
- **SC-002**: 完成 075 后，至少 1 条 submit 工作流不再依赖 watcher 胶水，并能导出 FlowProgram Static IR。
- **SC-003**: 完成 076 后，Query/Form 的默认自动刷新不再需要 “监听 action → 反查 trait → refresh”。
