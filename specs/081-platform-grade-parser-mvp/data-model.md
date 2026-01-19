# Data Model: 081 Platform-Grade Parser（AnchorIndex@v1）

> 本文件描述 `AnchorIndex@v1` 的“概念数据模型”（人读），权威 schema 见：
>
> - `specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`

## Entities

### AnchorIndex@v1

- `schemaVersion`: number（当前为 `1`）
- `kind`: `"AnchorIndex"`
- `repoRoot`: string（相对或绝对；建议输出相对 repo root 的路径）
- `entries`: `AnchorEntry[]`
- `rawMode`: `RawModeEntry[]`
- `summary`: `AnchorIndexSummary`

### AnchorEntry

> 说明：`entries[]` 只承诺收录 Platform-Grade 子集内的“高置信度锚点”；子集外/不确定形态一律进入 `rawMode[]`（显式 reason codes），宁可漏不乱补。

所有 entry 的公共字段：

- `entryKey`: string（确定性派生；禁止随机/时间）
- `kind`: `"ModuleDef" | "LogicDef" | "ServiceUse" | "WorkflowDef" | "WorkflowCallUse" | "AutofillTarget"`
- `file`: string（repo 相对路径）
- `span`: `Span`
- `reasonCodes?`: `string[]`（用于“部分可解析/部分缺失”的解释）

按 kind 的字段（与 schema 一致；按 `oneOf` 严格分支）：

- `ModuleDef`
  - `moduleIdLiteral`: string

- `LogicDef`
  - `moduleIdLiteral?`: string（仅当可确定时填；否则省略并在 `reasonCodes` 标注）

- `ServiceUse`
  - `tagSymbol`: `{ name: string; declFile?: string; declSpan?: Span }`
  - `moduleIdLiteral?`: string（仅当可确定时填）
  - `serviceIdLiteral?`: string（仅当可确定时填）

- `WorkflowDef`
  - `workflowLocalIdLiteral`: string（Workflow 在当前模块内的 local id；必须为字面量）
  - `moduleIdLiteral?`: string（仅当可确定时填）

- `WorkflowCallUse`
  - `workflowLocalIdLiteral`: string
  - `serviceIdLiteral`: string（仅收录 `callById('<serviceId>')` 的字面量形态；其它形态宁可降级）
  - `moduleIdLiteral?`: string（仅当可确定时填）

- `AutofillTarget`
  - `target`：
    - `{ kind: "module"; moduleIdLiteral: string }` 或
    - `{ kind: "workflow"; workflowLocalIdLiteral: string }`
  - `missing`：
    - `services?: MissingField`（ModuleDef object literal 缺少 `services` 字段时）
    - `devSource?: MissingField`（ModuleDef object literal 缺少 `dev.source` 时）
    - `workflowStepKey?: MissingField`（WorkflowDef 的 step object literal 缺少 `key` 时；插入点精确到该 step 对象）

> 备注：重复 `stepKey` 属于“不可安全自动改写”的冲突态；Parser 负责提供可定位信息并以 reason codes 显式报告（例如在相关 entry 上标注 `duplicate_step_key`，并/或将冲突位置纳入 `rawMode[]`），供后续门禁与人工修复。

### RawModeEntry

- `file`: string
- `span`: Span
- `reasonCodes`: `string[]`

### Span

- `start`: `{ line: number; column: number; offset: number }`
- `end`: `{ line: number; column: number; offset: number }`

### AnchorIndexSummary

用于快速查看规模与结果（不引入非确定性字段）：

- `filesScanned`: number
- `entriesTotal`: number
- `rawModeTotal`: number
- `modulesTotal`: number
- `serviceUsesTotal`: number
- `autofillTargetsTotal`: number
- `workflowsTotal`: number
- `workflowCallUsesTotal`: number
