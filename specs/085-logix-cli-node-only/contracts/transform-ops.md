# Transform Ops（delta.json）：Logix CLI（085）

> 目标：用一个显式、可版本化的 delta 文件表达“多项机械变更”，由 `logix transform module --ops` 一次性执行（默认 report-only）。

## 1) 基本结构（v1）

```json
{
  "schemaVersion": 1,
  "kind": "ModuleTransformDelta",
  "target": {
    "moduleFile": "examples/logix/src/...",
    "exportName": "UserPageModule"
  },
  "ops": [
    { "op": "addState", "key": "isSaving", "type": "boolean", "initialCode": "false" },
    { "op": "addAction", "actionTag": "ui/user/submit", "payloadType": "unknown" }
  ]
}
```

说明：

- `moduleFile/exportName` 是“保守可定位”的入口；解析规则必须对齐 Platform-Grade 子集（081）。
- `initialCode` 在 v1 可先作为代码片段字符串（保持最小约束）；任何不确定写法必须跳过并给出 reason codes。
- `type/payloadType` 在 v1 仅支持：
  - primitives（`boolean|string|number|bigint|void|unknown|never` → 写入 `Schema.*`）；
  - 或“标识符/点路径表达式”（例如 `UserPayloadSchema` / `Schema.String`），不支持函数调用/pipe/多行代码。

## 2) ops（v1 最小集合建议）

### `addState`

语义：在 Module 的 Platform-Grade def 内新增一个 state 键（若已存在则跳过）。

字段：

- `key: string`（必须是字符串字面量键）
- `type: string`（v1 允许用字符串占位；后续可升级为 TypeIR 引用）
- `initialCode: string`（TS 代码片段，必须可原样写入）

### `addAction`

语义：在 Module 的 action surface 内新增一个 action（若已存在则跳过）。

字段：

- `actionTag: string`（必须为字符串字面量；对齐 Platform-Grade identity 门槛）
- `payloadType: string`（v1 允许 `unknown`/`never` 等；后续可升级为 Schema/TypeIR 引用）

### `ensureWorkflowStepKeys`（可选）

语义：确保指定 workflow 的 steps[*].key 存在且稳定；仅在 Platform-Grade 子集内可写回（否则 report-only）。

字段（建议）：

- `workflowLocalId: string`
- `strategy: "prefix+index"`（v1 仅允许确定性策略）

## 3) 稳定性与安全门槛

- delta 输入必须是纯数据（JSON），禁止携带函数/闭包语义。
- 任何写回必须生成 PatchPlan（可审阅），并遵守 082 的幂等与竞态防护。
- 无法确定插入点/格式无法保持/子集外形态：必须跳过并输出 reason codes（宁可漏不乱补）。

v1 形态门槛（实现约束，便于预期一致）：

- `target.exportName` 必须解析为 `export const X = Logix.Module.make('literal', { ... })`（`moduleId` 必须是字符串字面量）。
- `addState` 仅支持：
  - `state: Schema.Struct({ ... })`（可同文件 const 引用）；
  - 同文件存在且仅存在一处 `X.implement({ initial: { ... } })`（`initial` 可同文件 const 引用）。
- `addAction` 仅支持：`actions: { ... }`（可同文件 const 引用）。
