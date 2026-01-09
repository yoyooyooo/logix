# Feature Specification: Query 收口到 `@logixjs/query`（与 Form 同形）

**Feature Branch**: `026-unify-query-domain`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: User description: "间隔新需求去做，编号 026. 需要收口，希望收口之后，query 相关只在 @logixjs/query 里，他依赖底层的 trait/statetrait 的能力实现，并且和 form 领域保持相同形状"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 查询能力只有一个入口 (Priority: P1)

作为业务开发者/仓库贡献者，我希望“查询/缓存/失效/自动触发”相关能力只需要理解并使用一个统一入口，而不是在多个包与多条 import 路径之间做选择。

**Why this priority**: 统一入口是收口的核心价值，能直接降低学习成本与维护成本，并减少“同名但不同协议”的隐性踩坑。

**Independent Test**: 只实现“对外入口收口 + 文档/示例/脚手架统一引用”即可验收，不依赖新增运行时能力。

**Acceptance Scenarios**:

1. **Given** 我需要在示例/业务模块中集成查询能力，**When** 我查找仓库中的使用方式与入口，**Then** 只能找到并使用 `@logixjs/query` 作为查询领域入口（文档/示例/脚手架一致）。
2. **Given** 仓库中存在历史 Query 入口或同名概念，**When** 我按迁移说明升级，**Then** 能完成替换且不会出现“静默退化到另一条实现路径”的行为差异。

---

### User Story 2 - Query 与 Form 的领域形状一致 (Priority: P2)

作为已经熟悉 `@logixjs/form` 的开发者，我希望 `@logixjs/query` 采用与 Form 一致的“领域包形状”，让我能用相同的心智完成模块建模、trait 挂载与控制器调用。

**Why this priority**: Query 与 Form 是同一套 Trait 系统的对照领域；形状一致能显著降低跨领域迁移成本，并利于脚手架与团队规范统一。

> 说明：这里的“同形”只约束 **对外入口与组织方式**（namespace import、module factory、handle.controller 扩展与 building blocks 的组织），不强求 Query 的 authoring DSL 细节去类比 Form 的 `from/$.rules/derived`（两者的问题域不同，强行同形会引入无谓概念）。

**Independent Test**: 只实现“Query 领域 API 形状对齐 + 对照文档/示例”即可验收，不要求改动任何底层 Trait 语义。

**Acceptance Scenarios**:

1. **Given** 我已掌握 Form 的核心入口（domain-module 工厂 + controller 句柄扩展；推荐入口 +（高级）traits/building blocks），**When** 我转到 Query 场景，**Then** 我能在 `@logixjs/query` 中找到同构入口，并用相同的方式组织代码与心智模型。

---

### User Story 3 - 收口不牺牲性能与可诊断性 (Priority: P3)

作为运行时维护者，我希望收口后 Query 仍严格依赖底层 trait/stateTrait 能力，且关键查询链路的性能与诊断口径不回退，方便长期演进与定位问题。

**Why this priority**: Query 常处于高频交互路径（搜索/筛选/联想），收口必须避免引入额外开销或让“为什么触发/为什么写回”更难解释。

**Independent Test**: 只实现“基线测量 + 诊断证据链路定义与可验证输出”即可验收，不要求新增业务功能。

**Acceptance Scenarios**:

1. **Given** 一个包含参数变化与自动触发的典型 Query 场景，**When** 我对比收口前后的基线结果，**Then** 关键指标在既定预算内（见 NFR/SC）。
2. **Given** 任意一次 Query 刷新（自动/手动/失效驱动），**When** 我查看诊断面板或可序列化事件流，**Then** 能解释“触发原因 → 关键参数/keyHash → 并发策略 → 最终写回结果”的因果链。

### Edge Cases

- 未注入外部查询引擎实例但启用了“需要外部引擎的集成能力”时，必须给出可操作的配置错误（而不是静默退化）。
- Query key 不可用（例如参数不完整）时，不应触发无意义刷新；并且对外可解释“为何未触发”。
- `autoRefresh: false`（manual-only）时，自动触发逻辑不应生效，但显式刷新仍可用。
- `controller.refresh()`（省略 target）时必须有明确语义：默认应刷新模块内所有 query（但需要可解释的成本边界与跳过原因，例如 key 不可用则 no-op）。
- `queries` 的 key 不得与 state 根字段冲突（至少包含 `params` / `ui`）；冲突必须在定义期显式失败，避免静默覆盖 state。
- 并发策略（如 switch / exhaust）在快速连续输入场景下不应造成错误写回或不可解释的状态跳变。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 将“Query 领域能力”的对外入口收口为 `@logixjs/query`；仓库内文档/示例/脚手架中不得再出现第二条 Query 领域入口。
- **FR-002**: 系统 MUST 保证 `@logixjs/query` 仅依赖底层 trait/stateTrait/resource 等基础能力完成领域建模与运行，不对业务暴露并行的第二套状态事实源。
- **FR-003**: 系统 MUST 让 `@logixjs/query` 与 `@logixjs/form` 保持一致的领域形状：对外暴露同构的 domain-module 工厂 + controller 句柄扩展；对内仍统一降解到 StateTrait/EffectOp 主线（不引入第二套事实源）。
- **FR-004**: 系统 MUST 明确并固化“外部查询引擎（可替换）”的注入边界：当启用需要外部引擎的能力时，缺失注入 MUST 以显式配置错误失败，并提供可操作修复提示。
- **FR-005**: 系统 MUST 提供迁移说明，指导从历史 Query 入口迁移到 `@logixjs/query`（包括 import 路径、运行时注入点与行为差异说明），且不引入兼容层作为长期负担。
- **FR-006**: 系统 MUST 把“类型尽可能完美”作为一等 DX 约束：`Query.make` 返回 `Logix.Module.Module`（非 Blueprint），并让 `queries` 的 key union 与 `deps` 的路径约束在编译期尽量可校验（例如 `controller.refresh(target?)` 的 target 收窄为 `keyof queries`；`deps` 收窄为 `StateTrait.StateFieldPath<{ params; ui }>`）。
  - 约束补充：`queries` 的 key MUST 排除保留关键字（至少 `params` / `ui`），并在运行时对冲突配置显式报错。

### Assumptions

- 本特性以“统一入口与一致心智”为目标，允许为达标进行破坏性重构；不要求对历史内部 API 向后兼容，但必须提供迁移说明。
- “Query 相关”范围包含：Query 领域入口、Engine 注入（含可选缓存快读）、Query 中间件/触发/失效等领域行为与其文档/示例/脚手架；不包含底层 trait/stateTrait 的通用能力。

### Out of Scope

- 不新增新的查询能力类型（例如新增一种全新的触发模型）；仅对现有 Query 领域能力做收口与对齐。
- 不承诺对接任意具体第三方引擎的 1:1 行为兼容；外部引擎仅作为可替换实现载体，不改变对外语义约束。
- 不为了追求与 Form 的“看起来一致”而引入额外 DSL（例如为 Query 人为新增 `Query.from/$` 等入口）；Query 的同形只约束对外模块工厂与 controller 句柄扩展。
- 不在本特性内引入“跨模块 deps 语法糖”（例如让 `Query.make(...).queries[*].deps` 引用其他 Module 的 state 路径）。该方向会触及 deps-trace / reverse-closure / 多实例语义，应作为独立特性在 026 收口完成后再评估（更倾向做 owner-wiring 的声明式 BindingSpec，而不是扩展 deps 语义）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 为“Query 自动触发/刷新”相关热路径建立可复现基线，并定义预算：收口后 p95 延迟与分配不得超过基线 +5%。
- **NFR-002**: 系统 MUST 提供结构化、可序列化的诊断信号以解释 Query 刷新因果链；当诊断关闭时，其额外开销不得超过基线 +1%（同一基准口径）。
- **NFR-003**: 系统 MUST 使用确定性标识（实例/事务/操作序列等）来支撑诊断与回放，不得依赖随机数或时间默认值生成关键标识。
- **NFR-004**: 系统 MUST 严格遵守同步事务边界：事务窗口内禁止 IO/异步工作；Query 的写回必须通过受控的 trait/stateTrait 通道完成。
- **NFR-005**: 若本特性改变了“默认行为/自动策略/成本边界”，系统 MUST 更新面向使用者的文档，提供稳定心智模型（≤5 个关键词）、粗粒度成本模型与可操作的优化阶梯。
- **NFR-006**: 若本特性引入/依赖跨模块协作钩子或内部协议，系统 MUST 将其封装为显式可注入契约，并支持在单实例/单会话范围内可替换与可 mock。

### Key Entities _(include if feature involves data)_

- **Query 领域包**: 面向业务的查询能力入口与最佳实践集合，提供与 Form 同形的组织方式。
- **Query Module**: 由 `Query.make` 产出的模块资产（可直接被 Runtime/React 消费），包含 params/ui/queries 快照 state、默认领域 wiring（触发/失效）与 controller 句柄扩展。
- **Query Controller**: 面向调用方的控制器句柄（挂在 ModuleHandle 上的扩展），用于读取状态与派发“刷新/失效/参数变更”等意图。
- **Query Rule**: 一条查询规则的声明（依赖字段、触发策略、并发策略、key 计算等），可降解为底层 trait/stateTrait 能力执行。
- **External Query Engine**: 可替换的外部查询引擎实例（缓存/去重/失效等），通过明确注入边界接入。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 仓库对外展示材料（文档/示例/脚手架）中 Query 的入口引用收敛为 1 处：统一指向 `@logixjs/query`，且不再出现第二条 Query 入口的推荐用法。
- **SC-002**: 迁移说明覆盖至少 3 类典型改动点（入口/注入/行为差异），并能支撑把一个现有 Query 示例迁移到新入口且保持等价行为。
- **SC-003**: `@logixjs/query` 的领域形状与 `@logixjs/form` 对齐：在对照文档中，开发者能以同构心智完成“定义（make）→ 组合/运行（Runtime/React）→ 调用 controller（必要时使用（高级）traits/building blocks）”的全流程。
- **SC-004**: 在既定基线口径下，Query 相关热路径的 p95 延迟与分配不超过基线 +5%（见 NFR-001）。
- **SC-005**: 对任意一次 Query 刷新，诊断证据链至少包含：触发来源、目标字段、resource 标识、keyHash（或等价稳定键）、并发策略、结果状态；并且该证据链可被序列化存档用于复盘。
- **SC-006**: 在 TypeScript 下，常见误用能尽量在编译期暴露：
  - `controller.refresh("typo")` 应产生类型错误（target 必须是 `keyof queries`）；
  - `Query.make(..., { queries: { params: ... } })` / `Query.make(..., { queries: { ui: ... } })` 应产生类型错误（保留关键字冲突）；
  - `deps: ["params.qq"]` / `deps: ["ui.notExists"]` 应产生类型错误（受 `StateFieldPath` 约束）。
