# Feature Specification: StateSchema-first：基于 State Schema 的 Field Ops 派生 Action Surface（actions/dispatchers/reducers）

**Feature Branch**: `[069-schema-first-codegen-action-surface]`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "在 067 token-first 的基础上，日常业务里最模板化的源头是 state 字段：希望只定义 state schema，并在字段上声明可用 op（assign/merge/push/toggle…），由运行时冷路径编译出 actions + reducers，并提供 `$` 上可用的 fields/dispatchers；DX 优先保证从 `$.fields.draft.title.assign(payload)` 能定位回 state schema 里的字段/op 定义点，必要时再退化到生成文件但必须可回链。"

## Motivation

067 已经把 Action 定义锚点升级为值级 `ActionToken`（携带 payload `Schema`），并打通了 “Runtime 事件 ↔ Manifest ↔ ActionRef” 的对齐规则；但在日常业务模块里，最模板化的工作来自 **state 字段的常见写入模式**：

- 同一个字段通常要配多种 op（assign / merge / push / toggle...）
- actionTag 需要稳定且可预测（理想情况下由 field path + op 自动生成）
- reducers 的样板虽然不长，但数量大时会变成一致性与可诊断性风险（漏校验 / 漏 patchPaths / 事务语义跑偏）

因此本 spec 将“单一事实源”进一步前移到 **State Schema**：开发者只写 state schema，并在字段上声明可机读的 Field Ops 蓝图。运行时在 `Module.make` 冷路径编译出 actions + reducers，并可选由 codegen materialize 派生物（`.gen.ts` 等）提升 DX，但 **语义裁决以运行时为单一事实源**，避免“生成器真相源 vs 运行时真相源”分裂。

## Scope

### In Scope

- **StateSchema-first**：以 state schema 作为单一事实源；字段 ops 声明与 state 字段同处一处（同一文件、同一段定义）。
- **Annotations-driven IR**：字段 ops 蓝图以 `Schema.annotations({ "logix/stateOps": ... })` 的形式存在（但业务作者不手写字符串 key；由 `StateSchema.*` API 自动写入），保持 Slim & 可序列化。
- **Runtime-first（pre-codegen）**：运行时在 `Module.make` 冷路径编译出 actions + reducers；dispatch/txn 热路径不做解释。
- **Action Surface 派生**：
  - 为每个 `<statePath, opName>` 派生 `ActionToken`（payload schema 由字段 schema + opMode 决定）；
  - 为每个 `<statePath, opName>` 派生 reducer（复用现有 mutate/patchPaths 语义）；
  - 在 `$` 上提供 `$.fields.<path>.<op>(payload?)` 的 dispatch 入口（仅当前模块可写；跨模块仍只读 + dispatch）。
- **CodeGen（后半段，可选）**：提供 deterministic 的 materialize 能力（`.gen.ts`/索引/契约片段），但不复制运行时语义。
- **对齐 067**：派生 actions 必须与 `Reflection.extractManifest` / ActionRef 语义一致（actionTag 规则、payload 形态、source/anchor 证据等）。

### Out of Scope（本 spec 不强行交付）

- 不改动 067 的 on-wire 协议：本 spec 只增加定义期/冷路径的派生能力，不引入新的事件协议。
- 不引入重型 TS AST/语言服务插件作为前置依赖：优先通过 “StateSchema DSL + 可序列化 IR + 可缓存的轻量解析” 达到目标；tsserver 插件仅作为备选。
- 不承诺所有 IDE 都能 100% 直达源码字段行：若语言服务限制导致跳转落到生成文件，必须提供清晰统一的回链机制（见 FR-006/SC-003）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - StateSchema-first：从 state 字段派生模板化 action surface (Priority: P1)

作为业务/运行时贡献者，我希望只定义 state schema，并在字段上声明可用 op（assign/merge/push/toggle…），系统即可自动派生 actions/dispatchers/reducers，避免我重复写 actionTag / payload schema / reducers 样板。

**Why this priority**: action-first 把 reducer 样板挪到 annotations 的收益有限；真正的规模收益来自 “一个字段多 op + actionTag 自动生成 + reducers 自动装配”。

**Independent Test**: 在一个示例模块中只写 `StateSchema.Struct/Field`（最少手写），不写任何 actions/reducers；模块仍可编译并在逻辑中通过 `$.fields` 驱动状态变化。

**Acceptance Scenarios**:

1. **Given** 一个在 state 字段上声明了 ops 的模块，**When** 运行（无需 codegen），**Then** 运行时在 `Module.make` 冷路径派生出 actions + reducers，模块可通过 typecheck 且行为正确。
2. **Given** 用户显式提供了手写 reducers 或 actions，**When** 同时启用字段 ops，**Then** 合并/覆盖规则清晰且 deterministic（不出现静默覆盖）。

---

### User Story 2 - IDE 跳转：优先回到原始 state schema 的字段/op 定义 (Priority: P2)

作为开发者，我更在意“从 dispatch 调用点跳到 action 定义点”。我希望 codegen 的设计优先保证 IDE F12/Find References 能跳回原模块文件的 action 定义；如果确实做不到，再退化为跳到生成文件，但必须提供清晰的“回链”指引（例如导出锚点/注释/约定）。

**Why this priority**: 这是本次 DX 改造的核心价值（可定位/可重命名/可审阅）。

**Independent Test**: 在 IDE 中从 `$.fields.draft.title.assign('x')` 的 `title/assign` 上执行跳转，验证落点优先为 state schema 的字段/op 定义；若落到 `.gen.ts`，仍可一跳定位到源 schema 锚点。

**Acceptance Scenarios**:

1. **Given** 一个模块使用 `$.fields.<path>.<op>(...)` 派发，**When** IDE 跳转到定义，**Then** 能定位到该字段/op 的定义锚点（原模块优先）。

---

### User Story 3 - 派生 actions 与 067 的 manifest/契约单一事实源对齐 (Priority: P3)

作为平台/CI/Studio 的使用者，我希望 state-first 派生出来的 actions/reducers 与 067 的 ActionToken/ActionRef 语义保持单一事实源，避免出现“生成器真相源”和“运行时真相源”分裂。

**Why this priority**: 避免并行真相源，保证 full duplex 链路可回放。

**Independent Test**: `Reflection.extractManifest` 能反射出“派生 actions 列表 + payload 形态 + tag 规则”，且与运行时实际派发一致。

**Acceptance Scenarios**:

1. **Given** 一个模块只定义 state 字段 ops，**When** 运行时抽取 manifest，**Then** 派生 actions 在 manifest 中可见且关键字段一致（actionTag、payload 形态等）。

---

### User Story 4 - 模板化 Reducer：Field Ops 驱动的 autoReducer (Priority: P4)

作为业务开发者，我希望对常见的字段写入模式（assign/merge/push/toggle 等）只声明 ops 蓝图，不再重复手写 reducer 样板；当需要自定义逻辑时，仍可在边界外手写覆盖。

**Independent Test**: 针对一个包含多种 op 的模块，不写 reducers，运行最小交互脚本验证状态变更与 067 的事务边界/patchPaths 语义一致。

### Edge Cases

- Schema/annotations 不符合约定（缺字段/非法值/unknown key）时：必须 fail fast，并给出可定位的证据。
- 字段类型与 op 不匹配（push 非数组 / merge 非对象 / toggle 非 boolean）时：必须 fail fast。
- actionTag 冲突（例如不同 op override 到同一 tag）时：必须 fail fast。
- 多模块/多入口时的选择规则：默认显式配置/显式入口，避免“到处派生/到处生成”导致的漂移。
- actionTag 变更（重构 field path / 重命名 opName）视为协议变更：必须让 diff 可解释，并可选输出迁移提示（forward-only，无兼容层）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供 `StateSchema` 作者入口（`Struct/Field/Ops`），以最接近 `effect/Schema` 的写法定义 state schema，并在字段上声明 ops 蓝图（业务作者不手写字符串注解）。
- **FR-002**: 运行时 MUST 在 `Module.make` 冷路径扫描 state schema 的 `"logix/stateOps"` 蓝图并编译出 **派生 actions + 派生 reducers**；dispatch/txn 热路径不得引入解释开销。
- **FR-003**: 对每个 `<statePath, opName>`，系统 MUST 生成稳定且 deterministic 的 `actionTag`，默认由 `statePath + opName` 计算；并允许显式 override 以在重构时保持协议稳定。
- **FR-004**: 系统 MUST 提供 `$` 上的 `$.fields.<path>.<op>(payload?)` 调用面来派发这些派生 actions；该能力只允许写入当前模块 state（跨模块句柄仍只读 + dispatch）。
- **FR-005**: 派生 actions MUST 与 067 的 ActionToken/ActionRef/manifest 单一事实源对齐（payload schema 形态、actionTag、source/anchor 证据一致）。
- **FR-006**: DX MUST 优先保证 IDE 跳转回原始 state schema 的字段/op 定义；若只能落到生成文件，MUST 提供可回链到源 schema 锚点的统一约定。
- **FR-007**: 系统 MUST 支持“模板化 reducer”生成（至少覆盖 `assign/merge/push/toggle` 的低风险模式），并允许用户手写 reducers 覆盖/扩展。
- **FR-008**: （后半段，可选）系统 SHOULD 提供一个可重复执行的 codegen 入口，materialize `.gen.ts`/索引/契约片段；输出 MUST deterministic（稳定排序、稳定格式、无随机/时间字段）。

### Blueprint v1：Schema.annotations 约定（最小可实现）

#### 1) 命名空间与读取规则

- runtime/codegen 只读取 `Schema.annotations({ ... })` 中 `logix/*` 命名空间的键；其他键（例如 schema 的 `message`）不得影响编译/生成。
- v1 固定入口键为：`"logix/stateOps"`（附在 **state schema 的字段 Schema** 上；由 `StateSchema.Field/Struct` 自动写入）。
- `logix/*` 下出现未知键（包含拼写错误）必须 fail fast，并给出“文件/键/值”的证据（FR-001/FR-002）。

#### 2) `"logix/stateOps"` 的结构（StateOpsBlueprintV1）

`"logix/stateOps"` 的值必须是纯数据（JSON-serializable：不得包含函数/类实例/循环引用）。

- `scope?: "public" | "internal"`：可见性提示（默认 `public`；v1 仅作为 DX/生成边界提示，不改变 067 的运行时语义）。
- `group?: string`：分组/导航提示（用于生成索引/注释/未来 Devtools 聚合）。
- `summary?: string`：简短描述（用于生成注释/契约摘要）。
- `ops: Record<string, StateOpBlueprintV1>`：字段上允许的 op 集合；key 作为 `opName`（默认也参与 actionTag 生成）。

#### 3) `ops`（StateOpBlueprintV1）

每个 op 只描述 **“对当前字段（隐式 target=该字段 path）执行哪种低风险写入模式”**；payload schema 由字段 schema + opMode 决定（不在蓝图中重复声明）。

支持的 `mode`（v1 最小集合）：

- `{ mode: "assign", tag?, summary? }`：`state[field] = payload`（payload schema = 字段 schema）
- `{ mode: "merge", tag?, summary? }`：`state[field] = { ...state[field], ...payload }`（payload schema = 字段 schema 的 Partial；仅对象字段允许）
- `{ mode: "push", tag?, summary? }`：`state[field].push(payload)`（payload schema = 数组元素 schema；仅数组字段允许）
- `{ mode: "toggle", tag?, summary? }`：`state[field] = !state[field]`（payload schema = `Schema.Void`；仅 boolean 字段允许）

默认 `actionTag` 生成规则（v1）：

- `actionTag = <statePath.join('.')> + ':' + <opName>`
- 允许 `tag` override（用于重构/重命名时保持协议稳定）

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
- **NFR-009**: 运行时编译（stateOps → actions/reducers）必须在定义期/冷路径完成；dispatch/txn 热路径不得引入解释型扫描或额外分配。

### Key Entities _(include if feature involves data)_

- **StateSchema（作者入口）**: 以接近 `effect/Schema` 的写法定义 state schema，并声明字段 ops 蓝图的 DSL（最终仍产出标准 Schema）。
- **生成蓝图（Blueprint / Static IR）**: 由 `Schema.annotations` 承载的结构化元信息（`"logix/stateOps"`），runtime 与 codegen 共用。
- **StateOpsBlueprintV1**: v1 的字段 ops 注解结构：由 `"logix/stateOps"` 提供（scope/group/summary/ops）。
- **StateOpBlueprintV1**: v1 的单个 op 蓝图：由 `StateOpsBlueprintV1.ops[opName]` 提供（mode/tag/summary）。
- **派生 Action Surface（DerivedActionSurface）**: 由 stateOps 编译得到的 ActionToken map + reducers + `$` 上的 `fields` 调用面。
- **锚点（Anchor）**: 用于跳转/引用/对齐的稳定位置（优先为 state schema 中字段/op 的定义点；退化为生成文件时必须可回链）。
- **生成报告（GenerationReport）**: （后半段）codegen 的 slim 输出证据（deterministic，便于 CI 审计与问题定位）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对同一 state schema（含 ops 蓝图），派生的 `actionTag` 列表与排序 deterministic（可 diff、可审计）。
- **SC-002**: 只写 state schema + 字段 ops（不写 actions/reducers）即可通过 `pnpm typecheck`（或等价质量门），并能在最小示例中运行。
- **SC-003**: 从 `$.fields.<path>.<op>(...)` 的 `<path>/<op>` 跳转到定义点：原模块优先；若落到生成文件，也能一跳回链到源 schema 锚点。
- **SC-004**: 失败策略清晰：unknown key / 不匹配的字段类型 / actionTag 冲突等必须 fail fast，错误可定位且可 diff。
- **SC-005**: `Reflection.extractManifest` 能稳定反射出派生 actions（含 payload 形态），与运行时实际派发一致。
- **SC-006**: （可选）对同一输入反复运行 codegen，输出字节级一致（deterministic），且生成边界清晰（不覆盖用户手写逻辑）。
