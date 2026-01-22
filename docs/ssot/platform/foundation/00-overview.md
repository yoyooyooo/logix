---
title: foundation/00 · SSoT 总览与裁决优先级
status: living
---

# SSoT 总览与裁决优先级

本目录的目标不是“描述一切”，而是提供 **可长期引用的裁决口径**：当平台、运行时、出码、Devtools 出现分歧时，先知道“谁说了算”，并且能把分歧收敛到同一套符号与契约上。

## 1) 核心目标（不讨论实现，先定口径）

- UI 交给 React：UI 只负责展示与交互采集，**不编排业务副作用**。
- 逻辑交给 Logix：业务行为以 **显式控制律**（Program）表达，运行时负责执行与产出证据链。
- 平台交付的是闭环：Spec/Contracts/Code/RunResult 必须可对齐（可选可回放）。

## 2) The One：最小系统方程（工作模型，可迭代）

符号与公式的单一事实源：

- `docs/ssot/platform/foundation/01-the-one.md`

一句话裁决（必须长期保持）：

- **Traits 只负责 $C_T$（静态约束闭包）**
- **Program 只负责 $\Pi$（动态控制律）**
- **Runtime 只负责执行与产证据（RunResult）**，不再“从静态里推断动态”

## 3) 目录边界（SSoT 不写 UX）

- `foundation/`：符号/术语/边界/优先级（The One）
- `assets/`：资产与 Schema（Intent/Module/Pattern/IntentRule 的结构定义）
- `contracts/`：执行与证据链契约（执行口径、RunResult、Time Travel）
- `ir/`：Code ↔ IR ↔ Anchors（可解析子集与锚点系统）
- `governance/`：演进策略/路线图/决策（提炼后的结论）
- `appendix/`：演练与补篇（不作为首要裁决入口）

平台交互与页面/视图体系属于 Workbench：`docs/specs/sdd-platform/workbench/*`。

## 4) 裁决优先级（冲突时按此执行）

1. `docs/ssot/platform/*`（本目录）
2. `docs/ssot/runtime/**` 与 `packages/logix-*`（真实类型与运行语义）
3. `docs/specs/sdd-platform/workbench/*`（平台闭环与 UX 骨架）
4. `docs/specs/sdd-platform/impl/*`、`docs/specs/sdd-platform/agents/*`（实现备忘/协议草图）
5. `examples/*`（样例与 dogfooding）

## 5) 最短阅读路径（按你要解决的问题）

- 我只想把话说清楚（概念/术语/边界）：`foundation/01-the-one.md` → `foundation/02-glossary.md`
- 我在争论“运行时应该怎么执行/怎么记账”：`contracts/00-execution-model.md` → `contracts/01-runresult-trace-tape.md`
- 我在做出码/解析/锚点：`ir/00-codegen-and-parser.md` → `assets/00-assets-and-schemas.md`
- 我在做时间旅行/回放边界：`contracts/02-time-travel.md`（同时参考 `contracts/01-runresult-trace-tape.md`）

## 6) 现实主义条款（必须显式写进契约）

平台与运行时的“闭环”会被物理与不确定性打折扣，SSoT 必须把折扣变成契约：

- **收敛不是无限的**：允许预算/分帧/partial fixpoint，但必须可解释与可诊断（见 `contracts/00-execution-model.md`）。
- **诊断不可能零成本**：Diagnostics=Off 只能追求“可控/可忽略”，不能承诺绝对 0（见 `contracts/00-execution-model.md`）。
- **IO 不能真正时间旅行**：Live 只能只读回放；Replay/Fork 需要 Tape 把不确定性注入为事件（见 `contracts/01-runresult-trace-tape.md`）。
