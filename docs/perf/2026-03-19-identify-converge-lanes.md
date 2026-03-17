# 2026-03-19 · identify：P2-1 deferred converge continuation（future-only）

## 范围与前提

- 本文只做识别，不做实现。
- 结论只围绕 `converge / lanes / deferred continuation`。
- 参考锚点：
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`（`P2-1` 候选定义）
  - `docs/perf/archive/2026-03/2026-03-06-q1-converge-nearfull-slim-decision.md`（converge 证据保留约束）
  - `docs/perf/archive/2026-03/2026-03-06-s3-converge-gate-applicability.md`（auto-only gate 口径）
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`

## Top2 题目

### 1) P2-1A：deferred converge continuation handle（单次壳进入，多 slice 连续推进）

现状识别：
- deferred time-slicing 每个 slice 都会走一轮：
  - `runDeferredConvergeFlush -> enqueueTransaction -> runOperation -> runWithStateTransaction`
- 对应代码路径在 `ModuleRuntime.impl.ts` 的 worker while 循环内，每个 `sliceStart/sliceEnd` 都重新入壳。
- `P0-2` 已经把热上下文读取税压低，剩余税点集中在“重复入壳”本身。

future-only 切口：
- 为 `trait:deferred_flush` 增加 continuation 形态，允许在同一 deferred flush 轮次里复用 transaction/operation 外壳。
- 每个 slice 只推进 converge exec 的 step cursor，不重复完整 transaction 入队与 operation 包装。

### 2) P2-1B：lane evidence 与序列语义重映射（txnSeq/opSeq/replay 在 continuation 下稳定）

现状识别：
- 当前 lane 证据以“每次 flush 产生一个 txn anchor”为基础，`txnSeq/opSeq` 与每 slice 的 transaction 强绑定。
- 如果引入 continuation，`txnSeq/opSeq` 的粒度会从“每 slice 一笔 txn”变成“一轮 continuation 多 slice”。
- `Q-1` 与 `S-3` 已经确定性能优化不能以丢失 decision/gate 证据为代价，这条约束会直接作用在 continuation 方案上。

future-only 切口：
- 为 `trace:txn-lane` 与 replay 事件定义 continuation 语义：
  - anchor 保持可追溯
  - slice 粒度证据改为 continuation 内部片段计数/游标
  - 维持 slim 且可序列化
- contract 收口落点：`docs/perf/archive/2026-03/2026-03-20-p2-1b-lane-evidence-contract.md`

## 唯一建议下一线

建议只开一条实施线：`P2-1A deferred converge continuation handle`。

原因：
- 收益面最大，直接命中当前重复壳税主因。
- 与 `P0-2` 已接受路径同向，技术连续性强。
- 可先做内部协议最小闭环，再决定是否推进 `P2-1B` 的证据语义扩展。

## 评估

### 正面收益

- 在 deferred steps 高的场景下降低 `converge.txnCommit` 的固定开销，重点改善 `auto/full` 在大 steps 下的尾部。
- 减少 `enqueueTransaction / runOperation / runWithStateTransaction` 的重复调用次数，降低调度抖动。
- 为后续 lane 公平性和 coalesce 策略优化提供更稳定的执行底座。

### 反面风险

- `txnSeq/opSeq` 粒度变化可能影响调试、replay、schema 校验与现有断言。
- continuation 若处理不当，可能破坏 lane 公平性或 starvation 防护。
- 若把 transaction 窗口拉得过长，容易碰到事务窗口禁 IO 与诊断事件膨胀风险。

### 是否需要 API 变动

- 对外 API：当前识别结论为“不需要”。
- 内部协议：高概率需要（transaction/origin details、lane evidence anchor、可能的 continuation token）。

## 最小验证命令

```bash
pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.p2-1-converge-continuation.targeted.json
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts
```

## 裁决

- top2 已识别：`P2-1A`、`P2-1B`
- 唯一建议下一线：`P2-1A deferred converge continuation handle`
- 建议后续开实施线：是（建议单线、先小闭环）

## 2026-03-20 后续更新（next-stage 接手）

- `P2-1 next-stage` 在接手 worktree 后未满足收成门槛，已按 docs/evidence-only 收口。
- 裁决：`discarded_or_pending`，`accepted_with_evidence=false`。
- 收口锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p2-1-next-stage-evidence-only.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-next-stage.evidence.json`

## 2026-03-20 后续更新（fresh reopen check）

- 已按 `09` 模板执行 fresh reopen check，结论为 `本轮不开新的 P2-1 扩面 worktree`。
- 触发器状态：`不成立`（最小验证命令均命中 environment 阻塞）。
- 当前分类：`discarded_or_pending`（`docs_evidence_only_watchlist_hold`）。
- reopen check 锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p2-1-reopen-check.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.evidence.json`

## 2026-03-21 后续更新（env-ready fresh reopen check）

- 已在独立 worktree 完成 env-ready fresh reopen check，focused tests 全绿，确认环境阻塞解除。
- `probe_next_blocker --json` 本轮命中 `externalStore.ingest.tickNotify` threshold 失败（`first_fail_level=256`），该失败继续归类 `edge_gate_noise`。
- 触发器状态：`不成立`（未形成可映射 `P2-1` 的唯一最小切口）。
- 当前分类：`discarded_or_pending`（`docs_evidence_only_watchlist_hold`）。
- env-ready recheck 锚点：
  - `docs/perf/archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.evidence.json`
