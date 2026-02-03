# Implementation Plan: 083 Named Logic Slots（具名逻辑插槽：从结构可见到语义可见）

**Branch**: `083-named-logic-slots` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/083-named-logic-slots/spec.md`

## Summary

交付“具名逻辑插槽（slots）”的最小闭环，使平台从“能看见 logics 数组”升级到“能看见坑位语义与填充关系”：

- 在 `ModuleDef` 上声明 `slots`（required/unique/kind…），并保证可序列化/可 diff；
- 在模块装配结果上反射 “slot→logic 填充关系”，并提供最小校验（缺失 required / 违反 unique）；
- 以 slots 作为全双工编辑的安全边界：子集内可回写，子集外显式降级（Raw Mode）。

## Questions Digest（plan-from-questions）

来源：外部问题清单（Q022–Q025）。

- **Q022（Slot 填充 API）**：以 `LogicUnitOptions.slotName?: string` 作为唯一权威表达（配置对象→meta）。不引入 `.slot()` 链式或 wrapper 作为并行真相源（若后续做 DX 语法糖，必须降解为 tuple/配置对象的纯语法糖）。
- **Q023（校验阶段）**：required/unique 等校验在 mount/implement 阶段执行（`ModuleDef.implement` / `Module.withLogic/withLogics`），不在 `Module.make` 定义时抛错；Manifest 导出只反射装配结果。
- **Q024（slotName 约束）**：slotName 与 `slots` 的 key 统一限制为 `/^[A-Za-z][A-Za-z0-9_]*$/`（非空）；违规必须结构化失败。
- **Q025（未赋槽逻辑）**：不引入 default slot；未设置 `slotName` 的 logicUnits 仍保留在 `logicUnits`，仅不出现在 slot→logic 映射中。

## Deepening Notes（关键裁决）

- Decision: Slot 填充关系的唯一权威表达为 `LogicUnitOptions.slotName?: string`（配置对象→meta）；不引入 `.slot()`/wrapper 作为并行真相源（source: spec Clarifications AUTO + Q022）。
- Decision: slotName key/值统一限制为 `/^[A-Za-z][A-Za-z0-9_]*$/`；违规必须结构化失败（source: spec Clarifications AUTO + Q024）。
- Decision: 校验在 mount/implement 阶段执行；Manifest 只反射装配结果（source: spec Clarifications AUTO + Q023）。
- Decision: 不引入 default slot；未赋槽逻辑仍保留在 `logicUnits`（source: spec Clarifications AUTO + Q025）。

## Technical Context

**Language/Version**: TypeScript（ESM；以仓库配置为准）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（`Module.make/ModuleDef`、Logic unit meta、Manifest/Reflection）  
**Storage**: N/A（slots 作为源码锚点字段；反射通过 Manifest/IR 导出）  
**Testing**: Vitest（聚焦：约束校验、确定性/稳定排序、manifest 反射、降级 reason codes）  
**Target Platform**: runtime（定义/校验/反射） + Node-only（可回写编辑，依赖 `081/082`）  
**Constraints**: 单一真相源（slots 声明在源码中）、Slim/可序列化/可 diff、forward-only（无兼容层）

## Constitution Check

- **单一真相源**：slots 的定义/填充必须以源码为权威；平台/CLI 只消费反射结果，不产生 sidecar 真相源。
- **统一最小 IR**：slots 语义应进入 Static IR（Manifest/StaticIR）可导出与可 diff；避免只能从代码推断。
- **Deterministic identity**：slotName/logicUnitId 必须稳定；输出稳定排序；禁止随机/时间字段进入默认导出。
- **Diagnosability**：缺失/冲突必须结构化可解释（slotName + logic refs + reason codes），便于 CI gate 与 Devtools 展示。
- **运行时常驻成本**：slots 校验与反射应属于“装配/导出路径”，避免在热路径引入常驻开销。

## Perf Evidence Plan

N/A（不触及运行时热路径）。  
但需要确保：slots 相关逻辑不会把 “每次 dispatch / 每次 state 变化” 的成本放大；校验应在装配/导出阶段完成。

## Project Structure

### Documentation (this feature)

```text
specs/083-named-logic-slots/
├── spec.md
├── plan.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/logix-core/src/Module.ts                         # Module.make：新增 slots 字段（源码锚点）
packages/logix-core/src/internal/runtime/core/LogicUnitMeta.ts  # 逻辑单元元数据：携带 slot 信息（填充关系）
packages/logix-core/src/internal/reflection/manifest.ts   # Manifest 反射：导出 slots 定义与 slot→logic 映射
packages/logix-anchor-engine/                             # Node-only：可回写边界（依赖 081/082，后续阶段）
```

## Design

### 1) Slots 数据模型（最小但可治理）

- `slots: Record<slotName, SlotDef>` 挂在 `ModuleDef`（源码锚点）。
- `SlotDef` 最小字段：`required?: boolean`、`unique?: boolean`、`kind?: "single" | "aspect"`（可扩展）。
- 约束：slotName 必须可序列化且可 stable diff；**MUST** 符合 `/^[A-Za-z][A-Za-z0-9_]*$/`，禁止空字符串/重复。

### 2) Slot 填充关系（slot→logic）

**裁决（Q022）**：使用 `LogicUnitOptions.slotName?: string` 作为唯一权威表达；一个逻辑单元最多属于一个 slot。

- 填充来源：
  - `module.logic(build, { slotName })`（通过 meta 透传给 mount 阶段）
  - `module.withLogic(logic, { slotName })` / `module.withLogics([logic, { slotName }], ...)`（mount-time 指定/覆盖）
- 未设置 `slotName` 表示“未赋槽”（支持渐进采用；见 Q025）。

### 3) 校验（required / unique）

**裁决（Q023）**：校验在模块装配/mount 阶段执行（`ModuleDef.implement` / `Module.withLogic/withLogics`），不在 `Module.make` 定义时抛错；Manifest/IR 导出只反射装配结果。

- missing required → FAIL（结构化错误：slotName + 建议修复）
- unique 冲突 → FAIL（结构化错误：slotName + 冲突 logic refs）
- aspect（可多选）→ 允许多个填充

### 4) 反射与导出（Manifest/Static IR）

在 `Reflection.extractManifest` 输出中增加 slots 相关字段（或等价的可导出结构）：

- slots 定义（稳定排序）
- slot→logic 映射（稳定排序；仅包含显式赋槽逻辑；不引入 default slot）
- 与现有 `logicUnits` 字段保持一致的稳定 id 策略

### 5) 全双工回写边界（后续阶段）

把 slots 定义与填充关系作为“可回写子集”的一部分：

- Platform-Grade 子集内：可生成最小补丁并写回（依赖 `081/082`）
- 子集外：必须降级为 Raw Mode（只报告不回写）

#### Platform-Grade 子集（可回写）· 最小约束口径

> 目标：让 Parser/Rewriter 能以 **稳定、可推导、可 diff** 的方式识别 slots 声明与填充关系；在子集外宁可拒绝写回，也不做“猜测式改写”。

**允许（可回写）**

- `Module.make(id, { ..., slots: { <SlotName>: { required?: true, unique?: true, kind?: "single"|"aspect" } } })`
  - `slots` 必须是对象字面量（Object literal）
  - key 必须是静态字符串 key（不得 computed key）
  - `SlotDef` 的字段必须是字面量（boolean literal / string literal）
- `slotName` 必须由 `LogicUnitOptions.slotName` 表达，并且是可解析的字面量字符串：
  - `module.logic(build, { ..., slotName: "Primary" })`
  - `module.withLogic(logic, { ..., slotName: "Primary" })`
  - `module.withLogics([logic, { slotName: "Primary" }], ...)`
  - `module.implement({ logics: [module.logic(..., { slotName: "Primary" }), ...] })`

**禁止（子集外 → Raw Mode）**

- `slots` 使用动态 key、计算属性、外部变量、`...spread`/合并逻辑，导致 key/def 无法静态还原。
- `slotName` 不是字符串字面量（例如变量、模板字符串、条件表达式、函数返回值）。
- 单个 logic unit 通过任何方式表达“多个 slotName”（MVP 明确禁止）。

**降级语义（Raw Mode）**

- 平台/CLI 只报告 slots/slotName 的“解析失败点”与 reason codes，不生成 PatchPlan，不写回。
- 允许继续导出 Manifest（Static IR），但写回链路必须拒绝（forward-only，无兼容层）。

## Deliverables by Phase

- **Phase 0（design）**：固化 slots 的最小数据模型、校验语义与反射口径（本 plan）。
- **Phase 1（runtime）**：落地 `Module.make` 的 `slots` 字段 + 填充 meta + 校验 + manifest 导出。
- **Phase 2（full-duplex）**：定义可回写子集并在 Node-only engine 中实现回写（可单独拆任务/子 spec）。

## Complexity Tracking

| Risk / Hard Part                 | Why It’s Hard                                      | Mitigation |
| -------------------------------- | -------------------------------------------------- | ---------- |
| 填充 API 的 DX vs 可回写约束     | 既要自然好写，又要能稳定解析与改写                 | 先收敛 Platform-Grade 子集；子集外强制降级 |
| 与既有 Manifest/IR 的契约演进    | 需要保证导出 Slim、可 diff，且不引入并行真相源      | 明确 slots 进入 Static IR；版本化字段/迁移说明（forward-only） |
