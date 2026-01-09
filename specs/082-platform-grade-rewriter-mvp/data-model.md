# Data Model: 082 Platform-Grade Rewriter（PatchPlan@v1 / WriteBackResult@v1）

> 本文件描述回写协议的“概念数据模型”（人读），权威 schema 见：
>
> - `specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
> - `specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json`

## Entities

### PatchPlan@v1

- `schemaVersion`: number（当前为 `1`）
- `kind`: `"PatchPlan"`
- `mode`: `"report" | "write"`
- `operations`: `PatchOperation[]`
- `summary`: `{ operationsTotal; writableTotal; skippedTotal; failedTotal }`

### PatchOperation

最小字段：

- `opKey`: string（确定性派生；禁止随机/时间）
- `file`: string（repo 相对路径）
- `kind`: `"AddObjectProperty"`
- `targetSpan`: Span（目标 object literal 的 span 或等价稳定定位）
- `property`: `{ name: string; valueCode: string }`（写入字段名 + 生成的最小代码片段）
- `expectedFileDigest?`: string（write-back 竞态防线：plan 生成时记录目标文件内容 digest；write-back 前必须校验一致，否则 fail）
- `decision`: `"write" | "skip" | "fail"`
- `reasonCodes`: `string[]`

### WriteBackResult@v1

- `schemaVersion`: number（当前为 `1`）
- `kind`: `"WriteBackResult"`
- `mode`: `"report" | "write"`
- `modifiedFiles`: `{ file: string; changeKind: "updated" | "created" }[]`
- `skipped`: `{ opKey: string; reasonCodes: string[] }[]`
- `failed`: `{ opKey: string; reasonCodes: string[] }[]`

### Span

- `start`: `{ line: number; column: number; offset: number }`
- `end`: `{ line: number; column: number; offset: number }`

## Notes

- `valueCode` 是“最小写入片段”，必须满足：
  - 不依赖随机/时间；
  - 不引入格式噪音；
  - 与 `081` 产出的缺口点定位对齐。
