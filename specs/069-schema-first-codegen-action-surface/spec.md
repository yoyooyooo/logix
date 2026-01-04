# Feature Specification: Schema-first + CodeGen：基于 Schema.annotations 的 Action Surface（actions/dispatchers/reducers）

**Feature Branch**: `[069-schema-first-codegen-action-surface]`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "在 067 token-first 的基础上，把日常业务里模板化很强的 actions/reducers/dispatchers 样板尽可能收敛到 Schema（单一事实源）+ annotations（生成蓝图），并通过可重复执行的 codegen 生成产物；跳转体验优先回到原始 Schema/模块定义（必要时退化到生成文件，但必须可回链）。"

## Motivation

067 已经把 Action 定义锚点升级为值级 `ActionToken`（携带 payload `Schema`），并打通了 “Runtime 事件 ↔ Manifest ↔ ActionRef” 的对齐规则；但在日常业务模块里，actions/reducers/effects 的模板化特征仍然会带来大量机械样板与一致性风险。

本 spec 将 CodeGen 的真相源进一步前移到 Schema：开发者用 `effect/Schema` 表达 payload / 数据约束，再用 `Schema.annotations(...)` 作为“生成蓝图”，由 codegen 生成/更新可编译的 action surface 派生物，同时保证不出现“生成器真相源 vs 运行时真相源”分裂。

## Scope

### In Scope

- Schema-first：以 payload `Schema` 作为 actions 的单一事实源（与 067 的 `ActionToken` 语义一致）。
- Annotations-driven：用 `Schema.annotations({ "logix/...": ... })` 描述可机读的生成蓝图（reducers 模板、可见性、分组、DX 约定等）。
- CodeGen：提供一个可重复执行、deterministic 的生成入口，产出普通 TypeScript 源码（必要时补 `.d.ts`），并具有明确的生成边界（不覆盖用户手写逻辑）。
- 对齐 067：生成产物必须与 `Reflection.extractManifest` / ActionRef 语义一致（actionTag 规则、payload 形态、可选 sourceKey/anchor 等）。

### Out of Scope（本 spec 不强行交付）

- 不改动 067 的运行时语义/协议：本 spec 只做工具链与派生物编排，不引入新的 on-wire 协议。
- 不要求引入重型 AST/类型系统服务：若需要解析 TS，优先使用“强约束 DSL + 轻量匹配 + 可缓存”的方式；重型方案（tsserver/ts-morph 全量类型）仅作为备选。
- 不承诺 100% 的 IDE 跳转都回到原始文件：如果语言服务限制导致必须跳到生成文件，必须提供清晰的回链机制与约定（见 FR-006/SC-003）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Schema-first：以 Schema + annotations 生成模板化 action surface (Priority: P1)

作为业务/运行时贡献者，我希望能通过一次性/可重复的 codegen，在不牺牲可诊断性与协议一致性的前提下，自动生成/更新模块的 action surface（actions/dispatchers/reducers 相关模板代码与派生清单），从而把精力集中在业务逻辑上，而不是重复写机械代码。

**Why this priority**: 067 引入 token-first 的 action 锚点后，手写 actions/reducers/effects 的样板会明显增多；在“模板化强”的业务模块里，Schema-first + codegen 应该成为黄金路径。

**Independent Test**: 在一个示例模块中只写 Schema + annotations（最少手写），运行一次 codegen 得到可编译的 action surface 派生物；再次运行输出 deterministic（可 diff），且不会破坏用户手写逻辑。

**Acceptance Scenarios**:

1. **Given** 一个以 Schema + annotations 定义 actions/蓝图的模块，**When** 运行 codegen，**Then** 生成/更新的产物可通过 typecheck 且输出 deterministic。
2. **Given** 用户在生成边界外写了自定义逻辑，**When** 反复运行 codegen，**Then** 用户代码不被覆盖且 diff 可解释。

---

### User Story 2 - IDE 跳转：优先回到原始 Schema/模块定义 (Priority: P2)

作为开发者，我更在意“从 dispatch 调用点跳到 action 定义点”。我希望 codegen 的设计优先保证 IDE F12/Find References 能跳回原模块文件的 action 定义；如果确实做不到，再退化为跳到生成文件，但必须提供清晰的“回链”指引（例如导出锚点/注释/约定）。

**Why this priority**: 这是本次 DX 改造的核心价值（可定位/可重命名/可审阅）。

**Independent Test**: 在 IDE 中从 `$.dispatchers.add(1)` 的 `add` 上执行跳转，验证落点优先为原模块定义；若落到 `.gen.ts`，仍可一跳定位到原模块锚点。

**Acceptance Scenarios**:

1. **Given** 一个模块使用 `$.dispatchers.<K>` 派发，**When** IDE 跳转到定义，**Then** 能定位到该 action 的定义锚点（原模块优先）。

---

### User Story 3 - 生成产物与 067 的 manifest/契约单一事实源对齐 (Priority: P3)

作为平台/CI/Studio 的使用者，我希望 codegen 生成的派生产物（如 manifest 辅助信息、对外契约片段、quickstart 片段）与 067 的 ActionToken/ActionRef 语义保持单一事实源，避免出现“生成器真相源”和“运行时真相源”分裂。

**Why this priority**: 避免并行真相源，保证 full duplex 链路可回放。

**Independent Test**: codegen 输出与 `Reflection.extractManifest` 的结果可做一致性检查（至少 action 列表与 tag 规则一致）。

**Acceptance Scenarios**:

1. **Given** codegen 输出了 action 列表/摘要，**When** 与运行时反射提取结果对比，**Then** 关键字段一致（actionTag、payload 形态等）。

---

### User Story 4 - 模板化 Reducer：annotation 驱动的 auto-reducer (Priority: P4)

作为业务开发者，我希望对常见的 reducer 写法（assign/push/toggle/merge 等）只写 annotations 蓝图，不再重复手写 reducer 样板；当需要自定义逻辑时，仍可在生成边界外覆盖/扩展。

**Independent Test**: 针对一个包含多种 reducer 模板的模块，运行 codegen 生成 reducers，运行最小交互脚本验证状态变更与 067 的事务边界不被破坏。

### Edge Cases

- Schema/annotations 不符合约定（缺字段/非法值/unknown key）时：必须 fail fast，并给出可定位的证据。
- 生成目标文件缺失或格式不符合约定时：必须 fail fast（除非明确允许首次创建），并给出修复建议。
- codegen 输出与用户手写/重构发生冲突时：不得静默覆盖；必须拒绝写入并输出可解释差异/介入点。
- 多模块/多入口时的选择规则：默认显式配置/显式入口，避免“到处生成”导致的漂移。
- actionTag 变更（重命名 key）视为协议变更：codegen 必须让 diff 可解释，并可选输出迁移提示（forward-only，无兼容层）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供一个可重复执行的 codegen 入口（脚本/CLI/插件其一即可），为采用 Schema-first action surface 的模块生成/更新派生物。
- **FR-002**: codegen 输出 MUST deterministic（稳定排序、稳定格式、无随机/时间字段），并且 diff 可解释。
- **FR-003**: codegen MUST 明确“生成边界”：不得覆盖用户手写逻辑；冲突必须 fail fast 并给出证据。
- **FR-004**: codegen MUST 支持从 Schema + annotations 读入“生成蓝图”，且对 `logix/*` 命名空间下的蓝图做静态校验（unknown key/非法值一律拒绝；非 `logix/*` 的 annotations 一律忽略，不得影响生成）。
- **FR-005**: codegen 产物与运行时反射/manifest 的语义 MUST 对齐（ActionToken/ActionRef 单一事实源；`actionTag = key`）。
- **FR-006**: codegen MUST 优先保证 IDE 跳转回原始 Schema/模块定义；若只能落到生成文件，MUST 提供可回链到原始锚点的机制与统一约定。
- **FR-007**: codegen MUST 支持“模板化 reducer”生成（至少覆盖 `assign/push/toggle` 这类低风险模式），并允许用户在边界外手写覆盖。

### Blueprint v1：Schema.annotations 约定（最小可实现）

#### 1) 命名空间与读取规则

- codegen 只读取 `Schema.annotations({ ... })` 中 `logix/*` 命名空间的键；其他键（例如 schema 的 `message`）不得影响生成。
- v1 固定入口键为：`"logix/action"`（附在 **action 的 payload Schema** 上）。
- `logix/*` 下出现未知键（包含拼写错误）必须 fail fast，并给出“文件/键/值”的证据（FR-004）。

#### 2) `"logix/action"` 的结构（ActionBlueprintV1）

`"logix/action"` 的值必须是纯数据（JSON-serializable：不得包含函数/类实例/循环引用）。

- `scope?: "public" | "internal"`：可见性提示（默认 `public`；v1 仅作为 DX/生成边界提示，不改变 067 的运行时语义）。
- `group?: string`：分组/导航提示（用于生成索引/注释/未来 Devtools 聚合）。
- `summary?: string`：简短描述（用于生成注释/契约摘要）。
- `autoReducer?: AutoReducerBlueprintV1`：模板化 reducer 蓝图（见下节）。

#### 3) `autoReducer`（AutoReducerBlueprintV1）

`autoReducer` 只描述 **“把 action payload 写入模块 state 的哪条路径”**，生成器必须以模块 state 的根为参照解释 `target`。

- `target: readonly [string, ...string[]]`：state 路径（非空数组；每段为字段名；v1 不支持数组下标/通配符）。

支持的 `mode`（v1 最小集合）：

- `{ mode: "assign", target }`：`state[target] = payload`
- `{ mode: "push", target }`：`state[target].push(payload)`（要求 target 指向数组字段；不满足则 fail fast）
- `{ mode: "toggle", target }`：`state[target] = !state[target]`（要求 payload 为 `Schema.Void` 且 target 指向 boolean 字段；不满足则 fail fast）

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: System MUST define performance budgets for the affected hot paths
  and record a measurable baseline (benchmark/profile) before implementation.
- **NFR-002**: System MUST provide structured diagnostic signals for key state /
  flow transitions, and diagnostics MUST have near-zero overhead when disabled.
- **NFR-003**: System MUST use deterministic identifiers for instances/transactions
  in diagnostic and replay surfaces (no random/time defaults).
- **NFR-004**: System MUST enforce a synchronous transaction boundary: no IO/async
  work inside a transaction window, and no out-of-transaction write escape hatches.
- **NFR-005**: If this feature changes runtime performance boundaries or introduces
  an automatic policy, the project MUST update user-facing documentation to provide
  a stable mental model: (≤5 keywords), a coarse cost model, and an “optimization ladder”
  (default → observe → narrow writes → stable rowId → module/provider override & tuning → split/refactor).
  Vocabulary MUST stay aligned across docs, benchmarks, and diagnostic evidence fields.
- **NFR-006**: If this feature relies on internal hooks or cross-module collaboration
  protocols, the system MUST encapsulate them as explicit injectable contracts
  (Runtime Services) that are mockable per instance/session, and MUST support exporting
  slim, serializable evidence/IR for a controlled trial run in Node.js or browsers
  without relying on process-global singletons.
- **NFR-007**: If this feature introduces breaking changes, the project MUST provide a
  migration note (plan.md / PR) and MUST NOT keep compatibility layers or a deprecation
  period (forward-only evolution).
- **NFR-008**: codegen 必须可诊断：对每次生成输出 slim 的生成报告（输入摘要/命中规则/写入目标/冲突原因），且报告可序列化、可 diff。

### Key Entities _(include if feature involves data)_

- **Schema-first actions（ActionSchemaMap）**: 以 `effect/Schema` 表达 payload 的 action map（key 即 `actionTag`），可附带 codegen annotations。
- **生成蓝图（Blueprint）**: 由 `Schema.annotations` 提供的、仅供 codegen 消费的结构化元信息（例如 auto-reducer 模板、scope、分组）。
- **ActionBlueprintV1**: v1 的 action 注解结构：由 `"logix/action"` 提供（scope/group/summary/autoReducer）。
- **AutoReducerBlueprintV1**: v1 的模板化 reducer 蓝图：由 `ActionBlueprintV1.autoReducer` 提供（mode + target）。
- **生成目标（GenerationTarget）**: 被写入/更新的源码文件与生成文件集合（原模块优先，其次 `.gen.ts`）。
- **锚点（Anchor）**: 用于跳转/引用/对齐的稳定位置（优先为原始 Schema/模块中的 action 定义点；退化为生成文件时必须可回链）。
- **派生物（DerivedArtifacts）**: reducers 骨架、（可选）manifest 辅助信息、contracts/quickstart 片段等可序列化产物（按 ROI 分期）。
- **生成报告（GenerationReport）**: codegen 的 slim 输出证据（deterministic，便于 CI 审计与问题定位）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对同一输入反复运行 codegen，输出字节级一致（deterministic）。
- **SC-002**: 生成的 action surface 可通过 `pnpm typecheck`（或等价质量门），并能在最小示例中运行。
- **SC-003**: 从 `$.dispatchers.<K>(...)` 的 `<K>` 跳转到定义点：原模块优先；若落到生成文件，也能一跳回链到原模块锚点。
- **SC-004**: 生成边界清晰：用户手写逻辑不被覆盖；冲突有可解释失败策略与证据。
- **SC-005**: codegen 输出与 `Reflection.extractManifest` 的关键字段一致性可被自动校验（至少 actionTag 列表与 payload 形态）。
