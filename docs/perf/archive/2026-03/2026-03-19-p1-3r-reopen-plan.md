# 2026-03-19 · P1-3R 重开实验包（externalStore batched writeback 单路径降税）

## 结论

- `默认不重开实施线，仅保留触发式实验包`
- `若触发重开，仅允许一个极小切口：batched writeback 复用 producer 侧 accessor，删除热路重复 path parse`

本文件目标是给 `P1-3R` 提供可执行的重开条件、可证伪假设、最小实验设计、成功门与失败门。

## 背景与基线

### 已确认的历史失败切口（禁止重做）

- `P1-3 draft primitive`
- `large-batch-only`
- `raw direct fallback`

### 当前母线已吸收的前置变化（改变了可观测前提）

以下事实用于解释“为何现在仍可保留触发式重开”，不构成默认重开理由：

- `P1-2.1 v2` 已吸收：`57cfe0be`
- `P1-2.2c` 已吸收：`1a346e3b`
- `P1-1.1` 已吸收：`06d4a7a7`

对应识别结论见：

- `docs/perf/archive/2026-03/2026-03-19-identify-p1-3-reopen.md`
- `docs/perf/archive/2026-03/2026-03-19-identify-state-write.md`

## 重开触发条件（必须同时满足）

1. 在当前母线 profile 下，`externalStore` 的 `batched writeback` 再次被复测为主要固定税，且优先级高于 `P1-2.1` 扩面与其它候选刀。
2. 目标切口可严格保持在现有 `state write` 与 `module-as-source tick` 的语义轨道内，不引入任何 draft primitive 与事务窗口语义变更。
3. 改动能够用现有语义守门测试稳定拦截，并能通过 `probe_next_blocker --json` 形成可复现的全链路绿灯门禁。

如果只满足 1) 而无法满足 2) 或 3)，直接裁决为 `不应重开`。

## Reopen Hypothesis（与旧失败切口不同）

### 唯一允许的假设

`externalStore` 的 batched writeback 在当前实现中存在可删除的固定税：

- 对每个 fieldPath 的 `split('.')` 与段遍历发生在 writeback 热路
- 单字段热路已经通过 producer 侧构造的 `accessor` 避免了运行时 re-parse
- batched 热路仍使用 `RowId.getAtPath` / `RowId.setAtPathMutating`，每次都会重新 parse segments

因此，若将 batched writeback 改为复用每个 request 自带的 `accessor.get` 与 `accessor.set`，可以在不改变事务语义与 tick 语义的前提下，显著降低 large-batch 的固定税。

### 明确排除

- 不引入按 batch 阈值分叉的执行路径。任何 `batch.length >= N` 才走新路径的方案直接拒绝。
- 不引入 draft primitive，不调整 `StateTransaction` 的事务窗口写入模型。
- 不引入绕过 transaction 的直写或 direct fallback。writeback 仍必须走 `txn.runWithStateTransaction`，并记录 `recordStatePatch`。

## 最小实验设计（触发重开后执行）

### Step 0：复测与立证（无代码）

目标：确认 bottleneck 的确存在，避免在噪声环境里误开线。

- 固化当前母线的证据产物：PerfReport 或等价采样结论，能明确指出 `externalStore:batched` 固定税是 top 级瓶颈。
- 跑一遍 `python3 fabfile.py probe_next_blocker --json`，把输出作为本次重开实验的基线附件。

### Step 1：实现最小改动（允许的唯一代码触点）

写入范围限制：

- 只允许触碰 `packages/logix-core/src/internal/state-trait/external-store.ts`。
- 如需补充守门测试，只允许相邻测试文件内新增用例，禁止重排或重写既有用例。

唯一改动形态：

- 在 `applyWritebackBatch(batch)` 的 `batch.length > 1` 分支里：
  - 将 `prevValue = RowId.getAtPath(prevState, req.fieldPath)` 改为 `prevValue = req.accessor.get(prevState)`
  - 将 `RowId.setAtPathMutating(draft, request.fieldPath, request.nextValue)` 改为 `request.accessor.set(draft, request.nextValue)`
  - 保持 `recordStatePatch(request.normalizedPatchPath, ...)` 不变
  - 保持 `txn.runWithStateTransaction(...)` 的调用边界不变

这个改动避免了 batched 热路的重复 parse，同时不引入新语义分叉。

### Step 2：最小门禁（必须全绿）

若涉及代码改动，必须跑完以下命令并记录输出：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
python3 fabfile.py probe_next_blocker --json
```

门禁解释：

- `StateTrait.ExternalStoreTrait.Runtime` 负责拦截 externalStore ingest 代理与写回语义回归，包含历史失败的 `waitUntil timed out` 类型。
- `ModuleAsSource.tick` 负责拦截同 tick 收敛与 scheduled microtask tick 语义回归。
- `probe_next_blocker --json` 负责拦截阈值建模噪声与其它链路阻塞项，避免出现“局部 micro-bench 转正但全链路红灯”的证据污染。

### Step 3：性能证据（必须可对比）

只接受可对比证据，至少包含：

- 复测同一套 profile 下的 before/after 对比
- 明确覆盖 `large-batch` 与 `small-batch` 两侧，证明没有用小回归换大提升

推荐附加一个“热路 parse 计数”型证据，用于把收益归因到假设本身：

- 复用 `StateTrait.ExternalStoreTrait.Runtime.test.ts` 里的 `installPathSplitCounter(path)` 思路
- 新增一个 batched 场景用例，在 `commit` 发生的 writeback 热路期间统计 `split('.')` 次数

## 成功门与失败门

### 成功门

满足以下全部条件时，允许把 `P1-3R` 从“触发式实验包”升级为实施线：

1. 语义门禁全绿：两条 vitest + `probe_next_blocker --json` 全绿。
2. 证据可复现：同环境下 before/after 对比一致，且能够把收益归因到“batched 热路去 parse”。
3. 性能收益显著：large-batch 样本上存在可见改善，同时 small-batch 不出现不可接受的回退。

### 失败门

出现任一情况立即裁决为失败，禁止留半成品代码：

- 任一守门测试变红，或 `probe_next_blocker --json` 出现新 blocker。
- 需要引入 draft primitive、batch 阈值分叉、或 transaction 绕行才能获得收益。
- 性能收益不足以覆盖维护成本，或收益只在 targeted micro-bench 里出现。

## 收口与迁移策略

- 本实验包不承诺对外 API 兼容层，也不引入弃用期。
- 若触发实施线并合入，收口以“单一切口的单路径降税”为准，不扩展成一揽子 externalStore 重写。

