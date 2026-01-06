# Implementation Plan: StateSchema + Field Ops（069 · pre-codegen）

**Branch**: `069-schema-first-codegen-action-surface` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/069-schema-first-codegen-action-surface/spec.md`

## Summary

本特性将 “模板化 action/reducer 的真相源” 前移到 **StateSchema（字段 ops）**，并在 **Module.make 冷路径**把字段 ops 蓝图编译为可执行的 actions + reducers：

- 开发者只需要用 `StateSchema.Struct/Field` 定义 state schema，并在字段上声明 ops（assign/merge/push/toggle），即可获得零样板的派生 action surface。
- DX 的可跳转落点保持在 state schema 的字段/op 定义处（从 `$.fields.<path>.<op>(...)` 跳回这里即可看到 ops 声明）。
- codegen 作为后半段：未来只负责“把同一份蓝图 materialize 成源码/生成物”，但 **语义以运行时为单一事实源**，避免“生成器真相源 vs 运行时真相源”分裂。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3.19.13、`@logix/core`（`packages/logix-core`）  
**Storage**: N/A  
**Testing**: Vitest + `@effect/vitest`（Effect-heavy 用例优先）  
**Target Platform**: Node.js 20+ / modern browsers（Logix Runtime）  
**Project Type**: pnpm workspace（packages + examples + apps）  
**Performance Goals**:
- dispatch/txn 热路径：不引入额外解释开销（蓝图仅在 Module.make 冷路径编译）
- Module.make 冷路径：O(fields + ops) 线性扫描 + 轻量校验；失败 fast 且证据清晰  
**Constraints**:
- 事务窗口禁止 IO/async；autoReducer 生成的 reducer 必须纯同步
- 蓝图必须 Slim 且可序列化（禁止函数/类实例/不可 diff 对象）
- 严格校验：`logix/*` 命名空间 unknown key 一律拒绝（防止漂移与静默失败）
**Scale/Scope**: 单模块字段数量可能从几十到数百；每字段 ops 数量从 1 到多；蓝图解析/编译必须可控且 deterministic

## Plan Overview（前半段/后半段）

- **Phase A（本次 plan 聚焦）**：运行时能力做到极致
  - 提供 `StateSchema` 作者入口（`Struct/Field/Ops`），自动写入 `"logix/stateOps"` 蓝图（纯数据）
  - 读取 state schema 的 `"logix/stateOps"` 注解并编译为 actions + reducers（`assign/merge/push/toggle`）
  - 与 067 的 ActionToken/ActionRef/Manifest 语义保持单一事实源（派生 actions 也应可反射/可诊断）
  - Quickstart 给出“可跳转落点”的真实示例（`$.fields.<path>.<op>(...)`）
- **Phase B（后续）**：codegen（可选）
  - 只做 materialize（.gen.ts/.d.ts/patch），不携带运行时语义
  - 与 Phase A 共享同一份 contracts（蓝图 JSON Schema）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

结论：PASS（plan 阶段）。

- Intent → Flow/Logix → Code → Runtime：将 “StateSchema（作者入口）→ Static Blueprint（Schema.annotations）→ 派生 actions/reducers（Runtime Capability）” 链路固化为可解释的编译步骤；调用点以 `$.fields` 直接回链到 state schema 的字段/op 定义。
- docs/specs：本特性以 `specs/069-*` 交付；若后续把 `"logix/stateOps"` 作为跨平台协议/资产，将同步回写到 `docs/specs/sdd-platform/ssot/*`（不在本阶段强制）。
- Effect/Logix contracts：新增/扩展点在 `Logix.Module.make` 的定义期装配（冷路径）与 reducers 生成策略；公共 API 的最小化新增应遵守 `packages/logix-core/src/*.ts` 子模块规则。
- IR & anchors：蓝图是 Static（可序列化、可 diff）；锚点在 state schema 字段/op 定义行（IDE 可跳转）。不引入第二套“生成器真相源”。
- Deterministic identity：蓝图不含随机/时间字段；派生 actionTag 默认由 `statePath + opName` 计算，允许显式 override。
- Transaction boundary：蓝图解析/校验/编译发生在 Module.make 冷路径；生成的 reducer 必须纯同步且不产生 IO/async。
- Internal contracts & trial runs：不引入隐式全局注册表；若需要导出“哪些字段 op 派生成功/为何失败”，以可序列化的 evidence/diagnostics 形式输出（不携带闭包）。
- Dual kernels：N/A（不引入 `@logix/core-ng` 依赖）。
- Performance budget：不触及 dispatch/txn 主路径算法；若实现过程中不得不修改 txn/patchPaths 机制，必须补 perf evidence（见下节）。
- Diagnosability & explainability：失败 fast（明确指向 `statePath/opName` 与蓝图值）；可选补充轻量诊断事件用于 Devtools/CI 审计（Slim & 可序列化）。
- User-facing performance mental model：本特性不改变默认性能边界（预期 N/A）。
- Breaking changes（forward-only）：新增能力默认 opt-in（必须使用 `StateSchema.Field/Struct` 才会写入 `"logix/stateOps"`）；不破坏既有手写 actions/reducers 路径。若未来引入默认策略变更，需迁移说明（无兼容层）。
- Public submodules：如新增对外 API（例如 `StateSchema`），必须落在 `packages/logix-core/src/*.ts`；共享实现下沉 `src/internal/**`。
- Quality gates：提交前通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；至少补齐 logix-core 单测覆盖蓝图校验与 reducer 行为。

## Perf Evidence Plan（MUST）

N/A（预期仅改动 Module.make 冷路径装配，不修改 dispatch/txn/订阅传播核心算法）。

> 若实现中需要触及 reducer/patchPaths/txn commit 热路径：必须补齐 perf evidence（collect→diff）并回写到本节。

## Project Structure

### Documentation (this feature)

```text
specs/069-schema-first-codegen-action-surface/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
   └── schemas/
      ├── state-ops-blueprint.v1.schema.json
      └── state-op.v1.schema.json
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│  ├── StateSchema.ts                             # StateSchema：Struct/Field/Ops（对外入口，含实现）
│  ├── Module.ts                                  # Module.make：编译 stateOps 并派生 actions/reducers（冷路径）
│  └── internal/
│     ├── state-ops-blueprint.ts                  # 解析/校验 "logix/stateOps"（v1）并编译 actions/reducers
│     └── runtime/core/…                          #（如需）复用 schema selector / field-path 校验工具
└── test/
   ├── internal/StateOpsBlueprint/…               # 蓝图校验/错误证据
   └── internal/Reducer/StateOpsAutoReducerBehavior.test.ts
```

**Structure Decision**:

- 蓝图解析/校验/编译逻辑放在 `packages/logix-core/src/internal/*`，避免污染公共 API；
- 对外只暴露 `StateSchema.*` 作为作者入口；底层仍以 `Schema.annotations` 为可序列化 IR（runtime/codegen 共用）。

## Phase 0: Research（产物：research.md）

目标：把所有 “可行性/口径/边界” 关掉，避免实现阶段才发现 Schema annotations 无法读取或校验成本失控。

- effect/Schema annotations 读取口径：基于 `schema.ast.annotations["logix/stateOps"]`（string key）读取；业务作者通过 `StateSchema.*` 写入（不暴露字符串 key）。
- state path 校验口径：扫描 state schema AST 时记录 path，保证每个字段 op 的隐式 target（该字段 path）可被静态验证。
- payload schema 派生：从字段 schema + opMode 派生 payload schema（assign/merge/push/toggle），并在不满足约束时 fail fast。
- reducers 编译策略：复用 `ModuleTag.Reducer.mutate` 以保持 patchPaths 与事务语义一致。
- 错误与诊断策略：fail fast 的错误信息格式（稳定、可 diff），以及是否需要额外 Devtools 事件。

## Phase 1: Design & Contracts（产物：data-model.md / contracts/* / quickstart.md）

- 固化 Blueprint v1 数据模型（StateOpsBlueprintV1/StateOpBlueprintV1）与校验规则（字段类型约束/ payload 派生）。
- 补齐 contracts（JSON Schema，供 codegen 与 runtime 共用，避免并行真相源）。
- Quickstart：
  - 给出一个真实模块示例（state schema + 字段 ops），展示 “从 `$.fields.<path>.<op>` 跳回字段/op 定义行即可看到蓝图”；
  - 给出最小的 fail-fast 示例（push 非数组 / merge 非对象 / toggle 非 boolean 等）。

## Phase 2: Implementation Planning（进入 `$speckit tasks`）

本阶段不产出 `tasks.md`；下一步用 `$speckit tasks 069-schema-first-codegen-action-surface` 拆分可执行任务并标记验收点。

## Complexity Tracking

N/A（当前 plan 不引入额外工程层级或不必要抽象）。
