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

最小字段：

- `entryKey`: string（确定性派生；禁止随机/时间）
- `kind`: `"ModuleDef" | "LogicDef" | "ServiceUse" | "AutofillTarget"`
- `file`: string（repo 相对路径）
- `span`: `Span`
- `reasonCodes?`: `string[]`（用于“部分可解析/部分缺失”的解释）

可选字段（按 kind 区分）：

- `moduleIdLiteral?`: string（仅当可确定时填）
- `serviceIdLiteral?`: string（仅当可确定时填；用于 `port=serviceId` 默认策略）
- `tagSymbol?`: `{ name: string; declFile?: string; declSpan?: Span }`（用于解释“从哪来的 Tag”）
- `missing?`: `{ services?: MissingField; devSource?: MissingField }`（缺口点/插入点）

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
