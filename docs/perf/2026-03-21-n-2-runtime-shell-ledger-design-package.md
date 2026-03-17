# 2026-03-21 · N-2 runtime-shell.ledger（Node 端到端 shell ledger 设计包）

## 目标与边界

目标：

- 建立一套 Node 端端到端 micro 基线的工件格式，用于解释 `dispatch/transaction/operation/snapshot` 的 sub-ms 区间归因盲区。
- 产物以 `ledger` 形式落盘，允许离线重算聚合指标，并与既有 perf suite 的聚合结果互相校验。

边界：

- 本包只落 docs/evidence-only，不引入新指标体系，不改变任何 runtime 行为与 perf harness 行为。
- ledger 只承载“可复现的原始样本 + 可验证的派生规则”，最终对外结论仍以既有 suite 的 `PerfReport/PerfDiff` 与既有 Node microbench 聚合工件为准。

## 设计约束（防并行真相源）

1. ledger 的每个 segment 必须明确绑定到已存在的 suite 口径或可追溯的命令口径。
2. ledger 的派生 summary 只能产出既有口径已经在用的聚合指标：
- `dispatchShellPhases.metrics.*` 对齐 `specs/103-effect-v4-forward-cutover/perf/*dispatch-shell*.{before,after}.json`
- `resolveShell.metrics.*` 对齐 `[perf] runtime-snapshot-resolve-shell ...` 输出口径
- `operationRunner.metrics.*` 对齐 `[perf] operation-runner txn-hot-context ...` 输出口径
3. ledger 不新增“更好看但不可对齐”的指标名，不在 summary 中引入新的默认 KPI。
4. ledger 的 phase 命名与字段名优先复用现有 trace 数据结构的字段名，避免出现同义异名。

## 对齐点（现有 suite 与工件）

### Node dispatchShell phases（transaction 侧）

现有口径：

- 命令：`pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- 聚合工件示例：`specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-2plus-hot-context.after.json`
- trace 来源：`Debug` ring buffer 的 `trace:txn-phase`（模块 id `ModuleRuntime.DispatchShell.Phases.Perf`）

ledger 对齐规则：

- `dispatchSamplesMs[]` 长度必须等于 `iterations`。
- `txnPhaseTraces[]` 长度必须等于 `iterations`，且一一对应同次 dispatch。
- summary 里的 `dispatch.p50.ms / dispatch.p95.ms / residual.avg.ms` 等字段由 ledger 的 raw 样本按既有算法重算，要求与同命令聚合工件在同数量级，且 drift 可通过参数差异解释。

### Node resolve-shell（snapshot 侧）

现有口径：

- `[perf] runtime-snapshot-resolve-shell diagnostics=off iters=... warmup=... batch=... noSnapshot.* snapshot.* speedup=...`
- 相关验证工件与日志在 `specs/103-effect-v4-forward-cutover/perf/*resolve-shell*`

ledger 对齐规则：

- `noSnapshotSamplesMs[]` 与 `snapshotSamplesMs[]` 的长度必须等于 `iterations`。
- `speedupX` 与 `savedPercent` 由 raw samples 重算。

### Node operation-runner txn-hot-context（operation 侧）

现有口径：

- `[perf] operation-runner txn-hot-context diagnostics=off middleware=empty iters=... warmup=... batch=... shared.* fallback.* speedup=...`
- 相关验证工件与日志在 `specs/103-effect-v4-forward-cutover/perf/*operationRunner*` 与对应 `validation.vitest.txt`

ledger 对齐规则：

- `sharedSamplesMs[]` 与 `fallbackSamplesMs[]` 的长度必须等于 `iterations`。
- `speedupX` 与 `savedPercent` 由 raw samples 重算。

## 工件格式（v1）

权威 schema：

- `specs/103-effect-v4-forward-cutover/perf/runtime-shell.ledger.schema.v1.json`

主工件：

- `*.ledger.v1.ndjson`
- 第一行必须是 `recordType=header`
- 后续为 `recordType=segment` 与 `recordType=sample`
- NDJSON 的目标是让单次运行可以在不占用大内存的前提下流式落盘

派生工件：

- `*.ledger.summary.v1.json`
- summary 是从 ledger 重算得到的聚合视图，用于和既有聚合工件做对齐校验

命名约定建议：

- `YYYY-MM-DD-n-2-runtime-shell-ledger.<envId>.<profile>.ledger.v1.ndjson`
- `YYYY-MM-DD-n-2-runtime-shell-ledger.<envId>.<profile>.ledger.summary.v1.json`

其中：

- `<envId>` 至少包含 `host` 与 `arch` 的稳定标识
- `<profile>` 复用既有 perf profile 词表（例如 `quick/default/soak`），仅用于“参数族”标记

## 段落结构（segment）

segment 的目标是把“同一份 ledger 文件内的不同 microbench”组织起来，保证对齐关系清晰。

segment 最小字段：

- `segmentId`：稳定 id，例如 `dispatchShell.phases.light`、`resolveShell.snapshot.off`、`operationRunner.txnHotContext.off`
- `suiteRef`：对齐引用，包含 `command` 或 `suiteId` 以及可选的 `artifactRef`
- `config`：本段的关键参数子集，用于可比性检查

## allocations 口径（可选）

ledger v1 允许记录 allocation 的“低风险代理量”，默认不要求 object 计数：

- `heapUsedDeltaBytes`：段落开始与结束的 `process.memoryUsage().heapUsed` 差值

当未来具备稳定、低噪的 object 分配计数手段时，再扩展：

- `allocatedObjectsApprox`：仅作为 `experimental` 字段出现，不纳入默认验收门

## 验收门（implementation-ready）

验收分两层：工件自洽门，与 suite 对齐门。

### A. 工件自洽门（必须）

- header 必填字段齐全，包含 `schemaVersion=1`、`git.head`、`env`、`generator`、`capturedAt`
- 每个 segment 都有完整的 `segmentId`、`suiteRef`、`config`
- 每个 sample 都能关联到一个 segment，且 sample 的关键数值字段是有限数
- 若 segment 声明了 `iterations`，sample 数量必须匹配
- 若包含 `txnPhaseTrace`，要求 `traceCount == iterations`，并且 `residualMs` 计算结果非负

### B. suite 对齐门（必须）

- `dispatchShell.phases.light` 的 summary 与 `specs/103-effect-v4-forward-cutover/perf/*dispatch-shell*.json` 的同命令聚合指标在同数量级
- `resolveShell.snapshot.off` 的 summary 与 `[perf] runtime-snapshot-resolve-shell ...` 的输出字段一致
- `operationRunner.txnHotContext.off` 的 summary 与 `[perf] operation-runner txn-hot-context ...` 的输出字段一致

### C. 可比性门（必须）

- before/after 对比必须同 `iterations/warmup/batch` 以及同 `diagnosticsLevel` 约束
- 若跨 profile 对比，必须在结论里标注只作线索，不下硬结论

## 最小落盘清单（本次提交）

- 设计包：本文件
- schema：`specs/103-effect-v4-forward-cutover/perf/runtime-shell.ledger.schema.v1.json`
- 示例：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-2-runtime-shell-ledger.example.ledger.v1.ndjson`
- 示例 summary：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-n-2-runtime-shell-ledger.example.ledger.summary.v1.json`

