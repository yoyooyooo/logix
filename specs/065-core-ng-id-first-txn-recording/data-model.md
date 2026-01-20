# Data Model: 065 core-ng 整型化 Phase 2（txn/recording id-first）

> 本文定义本特性新增/收敛的数据结构与字段语义，用于 runtime / devtools / perf evidence 的共同对齐。

## 1) FieldPath / FieldPathId（id-first 的基础）

- **FieldPath**：canonical 表示为“段数组”（例如 `["profile","name"]`）。文档中的 `profile.name` 仅用于展示。
- **FieldPathId**：稳定的整数 id，定义为：
  - `FieldPathId = index of ConvergeStaticIrExport.fieldPaths[index]`
- **唯一事实源**：`ConvergeStaticIrExport.fieldPaths`；任何 id 的反解都必须基于同一个 `staticIrDigest`。

## 2) DirtySet（txn 侧对外证据）— 采用 id-first 形态

### 2.1 DirtyAllReason（稳定原因码）

对齐运行时代码（`packages/logix-core/src/internal/field-path.ts`）：

- `unknownWrite`
- `customMutation`
- `nonTrackablePatch`
- `fallbackPolicy`

### 2.2 TxnDirtyRootIds（对外 Slim 载荷）

用于 state:update / converge explainability / perf evidence 的统一 payload：

- `dirtyAll: boolean`
- `reason?: DirtyAllReason`（仅当 dirtyAll=true）
- `rootIds: ReadonlyArray<FieldPathId>`（prefix-free、去重、稳定排序；dirtyAll=true 时为空）
- `rootCount: number`（等于 `rootIds.length`）
- `keySize: number`（固定口径：`rootIds.length`；count 语义，不是字节数）
- `keyHash: number`（固定口径：对 `rootIds` 做 FNV-1a 32-bit；用于 diff/去重/快速对齐）
- `rootIdsTruncated?: boolean`（可选：输出为 TopK 时标记裁剪；默认 light=3、full=32）

> 反解（仅显示/序列化边界）：`rootPaths = rootIds.map((id) => fieldPaths[id])`，不得在 txn 热路径进行。
> 约束：只有当 `staticIrDigest` 与对应的 `fieldPaths` 表一致（同一份 Static IR）时才允许反解；digest 缺失或不匹配时必须不反解（避免展示错误信息）。

## 3) Patch Recording（id-first）

### 3.1 PatchReason（收敛为稳定枚举）

目标：避免自由字符串导致统计/gate 失效。建议枚举：

- `reducer`
- `trait-computed`
- `trait-link`
- `source-refresh`
- `devtools`
- `perf`
- `unknown`（兜底：任何不在白名单内的输入都归一化为 unknown）

### 3.2 TxnPatchRecord（sampled/full 诊断下的可序列化形态）

- `opSeq: number`（事务内单调递增；用于排序/回放）
- `pathId?: FieldPathId`（能映射时必须填写；缺失时通常伴随 `dirtyAll=true`）
- `reason: PatchReason`
- `stepId?: number`（ConvergeStepId；对齐 Static IR 的 step table）
- `traitNodeId?: string`（可选：作为调试锚点；不得替代 stepId/staticIrDigest）
- `from?: unknown` / `to?: unknown`
  - 仅在 diagnostics=sampled/full 下保留；
  - 必须可 JSON 序列化；不可序列化时必须省略或裁剪（以保证 DebugSink 的 JsonValue 硬门）。

> 显示边界可派生：`path = fieldPaths[pathId]`；不得在 txn 热路径携带 `FieldPath`/string path 作为证据载荷。

**Bounded 规则（默认）**：

- full 模式下 patch records 允许导出，但必须有界：默认最多 256 条。
- 超限时必须裁剪（例如保留前 256 条）并在同一事务摘要中标记：
  - `patchesTruncated: true`
  - `patchesTruncatedReason: "max_patches"`

## 4) Debug 事件：state:update（Slim & 可解释）

### 4.1 最小锚点

- `moduleId: string`
- `instanceId: string`
- `txnSeq?: number`
- `txnId?: string`
- `staticIrDigest?: string`（用于把 id 锚点反解到可读路径；缺失时 Devtools 不应尝试反解）

### 4.2 事务摘要字段（建议）

- `dirtySet?: TxnDirtyRootIds`
- `patchCount?: number`
- `patchesTruncated?: boolean`
- `patchesTruncatedReason?: "max_patches"`
- `commitMode?: string`
- `priority?: string`
- `originKind?: string`
- `originName?: string`

## 5) Exec VM evidence（对齐既有 v1）

对齐 `packages/logix-core-ng/src/ExecVmEvidence.ts` 的 `ExecVmEvidence`：

- `version: "v1"`
- `stage: "assembly"`
- `hit: boolean`
- `reasonCode?: "not_implemented" | "missing_capability" | "disabled"`
- `reasonDetail?: string`（仅 full；light 必须裁剪为 undefined）
- `execIrVersion?: string`
- `execIrHash?: string`

## 6) 迁移说明（只前进）

- `StateTransaction.StatePatch.path` 现状允许 `string | FieldPath`：本特性目标是对外证据改为 `pathId`（FieldPathId），并把 string 仅保留在输入边界或显示边界。
- `StateTransaction.PatchReason` 现状允许自由字符串：本特性收敛为稳定枚举，并提供 `unknown` 兜底（必要时 full 档位可保留裁剪后的 detail 供排障）。
- string path 的 dot 语义仅作为边界输入：当 key 含 `.` 导致歧义或无法映射到 registry 时，必须显式降级为 `dirtyAll=true` + `reason=fallbackPolicy`（建议改用 segments 输入）。
