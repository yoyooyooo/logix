# Data Model: 084 Loader Spy（SpyEvidenceReport@v1）

> 本文件描述 `SpyEvidenceReport@v1` 的“概念数据模型”（人读），权威 schema 见：
>
> - `specs/084-loader-spy-dep-capture/contracts/schemas/spy-evidence-report.schema.json`

## Entities

### SpyEvidenceReport@v1

- `schemaVersion`: number（当前为 `1`）
- `kind`: `"SpyEvidenceReport"`
- `mode`: `"loader"`（表示“加载态/构造态 best-effort 证据”）
- `runId`: string（显式传入；禁止默认时间/随机）
- `usedServices`: `ServiceUseEvidence[]`（稳定可解析 `serviceId`）
- `rawMode`: `RawModeEntry[]`（不可解析/歧义/子集外形态的显式降级）
- `diff?`: `{ usedButNotDeclared: string[]; declaredButNotUsed: string[] }`（可选：与声明快照对照）
- `coverage`: `CoverageMarker`（覆盖局限标记）
- `violations`: `ViolationEntry[]`（超时/超预算/缺服务等结构化违规记录）
- `summary`: `SpyEvidenceSummary`

### ServiceUseEvidence

- `serviceId`: string
- `moduleId?`: string
- `logicKey?`: string
- `occurrences?`: number（同一 key 的计数；建议稳定聚合）

### RawModeEntry

- `reasonCodes`: `string[]`
- `moduleId?`: string
- `tagName?`: string

### CoverageMarker

- `stage`: `"loader"`
- `completeness`: `"best-effort"`
- `limitations`: `string[]`（必须显式声明“不穷尽分支/仅代表当前路径”等）

### ViolationEntry

- `code`: string
- `message`: string
- `details?`: `JsonValue`

### SpyEvidenceSummary

- `usedServicesTotal`: number
- `rawModeTotal`: number
- `violationsTotal`: number

## Invariants（确定性与可 diff）

- `usedServices`/`rawMode`/`diff.*` 必须稳定排序（禁止随机/插入顺序漂移）。
- 报告默认不得包含时间戳字段；若需时间线，应走 `EvidencePackage`（非本报告定位）。
- `mode=loader` 明确表示“证据 ≠ 权威”，不得被上游当作写回依据。

