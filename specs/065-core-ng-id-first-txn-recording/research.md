# Research: 065 core-ng 整型化 Phase 2（事务/录制 id-first）

> 本文用于把“txn dirty-set / patch recording / 诊断锚点”的 id-first 方案固化为可落地裁决，作为后续 `$speckit tasks` 拆解与实现的依据。

## 背景（现状与缺口）

- txn 侧已有“避免 split/join 往返”的约束：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 在事务窗口内收集 `dirtyPaths: Set<string | FieldPath>`，并在 `commit` 时生成 `dirtySet`（当前为 path-first：`DirtySet.paths: FieldPath[]`）。
- converge 侧已具备整型化基础设施：build 期构建 `fieldPaths` + `fieldPathIdRegistry`，并形成 `ConvergeStaticIrExport`（包含 `staticIrDigest`、`fieldPaths[]`、`stepOutFieldPathIdByStepId[]` 等）。
- devtools/export 已有“id → 可读反解”的模式：`DebugSink` 在 `trace:trait:converge` 投影阶段可以用 `staticIrDigest` 反解 `rootIds → rootPaths`（仅用于显示/序列化边界）。
- **缺口**：txn 侧的 `dirtySet/patch recording/state:update` 仍主要是 path-first 或 reason 可自由扩展，导致：
  - 热路径分配与字符串处理仍可能占主要成本；
  - 证据/门禁难以用稳定锚点对齐（对比/回放容易漂移）；
  - 降级原因难以长期统计与 gate 化（容易静默回退）。

## Decision 1：txn recording 必须 id-first（热路径只传递整型锚点）

**Decision**：

- 事务窗口内对外暴露的 “dirty-set / patch recording / state:update” 统一以 **FieldPathId/StepId** 等整型锚点表达。
- dirty-set 的 roots 对外以 `rootIds: FieldPathId[]` 表达；可读 `rootPaths` 仅允许在显示/序列化边界基于 Static IR 反解（热路径禁止 materialize）。
- 字符串仅允许在以下边界 materialize：
  - **序列化边界**（Debug/Devtools 事件导出）；
  - **显示边界**（UI/console 展示）。

**Rationale**：

- id-first 才能把整型化收益从 converge 扩展到 txn 全链路（否则 converge 变快但 txn 变慢）。
- 稳定整型锚点是 perf diff / replay / explainability 的必要前提（避免“并行真相源”）。

**Alternatives considered**：

- 在 DebugSink/Devtools export 才做 path→id：拒绝（热路径仍然分配 FieldPath/字符串，收益无法落到 txn）。
- 同时保留 path-first 与 id-first 两套字段：拒绝（会形成并行真相源，且成本更高）。

## Decision 2：FieldPathId 的唯一事实源是 ConvergeStaticIrExport.fieldPaths

**Decision**：

- `FieldPathId` 的定义固定为：`ConvergeStaticIrExport.fieldPaths[index]` 的 index。
- txn 侧需要做 path→id 映射时，只允许使用 build/install 期固化的 `FieldPathIdRegistry`（纯内存查表、只读）。
- `StepId` 在本特性中固定语义为 `ConvergeStepId`（converge steps table 的整数下标）；非 converge 来源的 patch 不填 StepId（避免混用不同 id 空间）。

**Rationale**：

- 只有绑定到 Static IR 的 table，才能保证“同一 digest 下 id 语义可重复对齐”。
- build/install 期预编译能把成本从热路径搬走（OCP：通过新增 registry/表结构扩展，不把分支散落到每次写入）。

**Alternatives considered**：

- 每次 commit 临时 build registry：拒绝（会把 build 成本带入 txn 热路径）。
- 以字符串 hash 作为 FieldPathId：拒绝（需要额外 hash + 冲突处理，且难以反解）。

## Decision 3：降级必须显式（dirtyAll=true + 稳定原因码）

**Decision**：

- 任一写入无法被映射到 FieldPathId（invalid/missing/不可追踪）时，必须显式降级：
  - `dirtyAll=true`
  - `DirtyAllReason` 为稳定枚举（例如 `nonTrackablePatch` / `fallbackPolicy`）
- 禁止静默吞掉失败或“偷偷退化为 full”而无证据。

**Rationale**：

- 降级本身是可优化对象：必须可统计、可 diff、可 gate。
- 对平台/Devtools 来说，“不知道为什么变慢”比“明确知道退化原因”更不可接受。

**Alternatives considered**：

- missing id 时退回 path-first：拒绝（会让 id-first 变成“有时快有时慢”的黑盒）。

## Decision 4：PatchReason 从自由字符串收敛为稳定枚举

**Decision**：

- `StateTransaction.PatchReason` 收敛为稳定枚举（见 `data-model.md`），并对未知输入做稳定归一化（映射到 `unknown`，必要时 full 档位才保留裁剪后的 detail）。

**Rationale**：

- 自由字符串会让长期统计、预算与 gate 失效（“相同原因”会被分裂为多个 key）。

**Alternatives considered**：

- 继续允许自由字符串但只在 debug 侧裁剪：拒绝（原因码本身就是 gate 的锚点，必须稳定）。

## Decision 5：诊断分档 off/light/full 的成本边界必须被硬门守住

**Decision**：

- `off`：不输出 id→path 反解、patch 序列等重载荷；高频事件尽可能短路丢弃。
- `light`：只输出最小摘要（`dirty.rootIds` TopK=3 + `rootIdsTruncated`、`patchCount`、必要锚点），不得携带 `from/to` 等重字段。
- `full`：
  - `dirty.rootIds` TopK=32 + `rootIdsTruncated`；
  - patch records 默认最多 256 条；超限必须裁剪并标记 `patchesTruncated=true`、`patchesTruncatedReason="max_patches"`；
  - 仍必须保证 payload Slim & 可序列化（不可序列化字段必须省略/裁剪）。

**Rationale**：

- diagnostics 是产品能力，但必须可预算化；否则“开诊断 = 性能未知”会使 gate 形同虚设。

## Decision 6：Hard Gates 采用 Browser matrix + Node bench 的双门禁

**Decision**：

- Browser：使用 `pnpm perf collect/diff` + matrix（硬门：`comparable=true && regressions==0 && budgetViolations==0`）。
  - 关键 suites：`converge.txnCommit`（P1）、`form.listScopeCheck`（P2）
- Node：
  - `pnpm perf bench:027:devtools-txn`（自带 `gate.ok`）
  - `pnpm perf bench:009:txn-dirtyset`（before/after 相对回归 ≤15%，`medianMs/p95Ms` 两者同时满足）

**Rationale**：

- Browser matrix 覆盖真实交互与渲染边界；Node bench 覆盖 devtools/txn 基础开销与最小可重复 microbench。

## Decision 7：rootIds canonicalization 与 keyHash/keySize 口径固定化（可对齐、可 diff）

**Decision**：

- `rootIds` 必须去重、prefix-free（按 FieldPath 前缀去冗余），最终按 `FieldPathId` 升序稳定排序。
- `keyHash` 固定为对 `rootIds` 做 FNV-1a 32-bit（与现有 `hashFieldPathIds` 对齐）。
- `keySize` 固定语义为 `rootIds.length`（count 口径，不是字节数）。

**Rationale**：

- 这三个字段是 perf diff、缓存键（plan cache）、以及 Devtools explainability 的公共锚点；口径漂移会直接破坏可比性。

## Decision 8：string path 的 dot 语义仅为边界输入（避免 key 含 `.` 的歧义）

**Decision**：

- string path 仅作为“无歧义 dot-separated”边界输入；当 key 含 `.` 导致歧义或无法映射时必须显式降级为 `dirtyAll=true` 且 `reason=fallbackPolicy`（并建议改用 segments 输入）。

**Rationale**：

- dot-path 无法区分“嵌套路径”与“key 自身包含 `.`”两种语义；在 id-first 体系中必须避免错误映射与错误优化。

## Implementation Note（来自 review）：先 DirtySet 再 Patch Recording（分阶段落地）

**Note**：

- 建议先完成 Txn DirtySet 的 id-first（立刻拿到 micro-txn 热路径收益），再推进 full 模式下 patch records 的 id-first + bounded，以及 Devtools 消费侧对 `staticIrDigest` 的严格对齐（不匹配不反解）。

## Appendix：关键入口（实现落点速查）

- txn/commit/patch recording：
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
  - `packages/logix-core/src/internal/InternalContracts.ts`
- path/id：
  - `packages/logix-core/src/internal/field-path.ts`
  - `packages/logix-core/src/internal/state-trait/build.ts`（build 期 registry/table）
  - `packages/logix-core/src/internal/state-trait/converge-ir.ts`（`staticIrDigest` + export）
- diagnostics/export：
  - `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
  - `packages/logix-core-ng/src/ExecVmEvidence.ts`
