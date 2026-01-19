# Contract: Workflow StepKey Autofill（Platform-Grade WorkflowDef）

## 目标

把 Workflow（`Π`）的核心稳定锚点 `stepKey` 从“可缺省/靠人工约定”提升为 **可门禁化/可回写** 的工程事实：

- 缺失 `stepKey` 视为契约违规（对齐 075 与 Root IR 的 `workflowSurface`）。
- 在 Platform-Grade 子集内，允许以 **确定性、最小 diff、幂等** 的方式补齐缺失的 `stepKey`，并回写源码保持单一真相源。
- 任何不确定性必须显式跳过并解释（reason codes），禁止“猜测式补全”。

## 适用范围（Platform-Grade 子集）

本 contract 只覆盖“可高置信度定位与改写”的形态：

- `FlowProgram.make({ ... })` / `FlowProgram.fromJSON({ ... })` 的 `WorkflowDef` 就地对象字面量；
- `steps` 为数组字面量；
- step 为对象字面量；
- `kind`/关键字段为可解析形态（字面量优先）。

子集外统一降级：`unsupported_shape` / `unsafe_to_patch`。

## 补全规则（v1）

### 1) 不覆盖原则（权威声明优先）

- 若 step 已显式声明 `key`：视为权威，必须跳过（reason: `already_declared`）。
- 若 workflow 内已存在重复 `key`：必须拒绝写回（reason: `duplicate_step_key`），只报告冲突定位与修复建议。

### 2) 默认候选 key 生成（确定性）

对缺少 `key` 的 step，先尝试生成候选 `baseKey`：

- `dispatch`：`dispatch.<actionTag>`
- `call`：`call.<serviceId>`
- `delay`：`delay.<ms>ms`

若缺少生成所需的关键字段（例如 `serviceId` 不可解析），必须跳过（reason: `unresolvable_step_key`）。

### 3) 冲突消解（确定性、幂等）

若 `baseKey` 与 workflow 内已存在的 key 冲突，则允许添加稳定后缀：

- 后缀规则：`<baseKey>.<n>`，其中 `n` 为同一 `baseKey` 的出现序号（从 2 开始）。
- 序号遍历顺序：按 Parser 输出的稳定遍历顺序（以源码 AST 的出现顺序为基准），保证同一输入重复运行产生一致结果。

> 说明：此处使用“出现顺序”仅作为缺失锚点的迁移工具；一旦写回，`key` 就成为稳定锚点，后续重排不得依赖“重新补全”。

## 输出与报告要求

- 补全工具必须在报告中包含：
  - Workflow 定义点定位（file/range/entryKey）；
  - 缺失 key 的 step 定位（可回写插入点）；
  - 生成的 key（以及冲突消解信息）。
- 所有输出必须 JSON-safe、确定性、可 diff。

## 关联裁决

- 075：`stepKey` 必填、冲突 fail-fast、不可随机化：`specs/075-flow-program-codegen-ir/contracts/ir.md`
- Root IR：`programId/nodeId/stepKey` 去随机化：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
