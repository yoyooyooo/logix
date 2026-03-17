# 2026-03-19 · P2-3 selector/process v3 最小下一刀

## 范围与约束

- worktree: `v4-perf.p2-3-selector-process-v3`
- branch: `agent/v4-perf-p2-3-selector-process-v3`
- 本 worktree 最终收敛为 selector 侧最小可合入改动：
  - selector invalidation index v2 扩面（`SelectorGraph`）
- 未触碰：
  - `P1-4 topicId minimal cut`
  - `normal notify shared microtask flush`
  - React controlplane

## 代码改动

### 1) SelectorGraph v2 扩面

文件：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`

- 在 `dirtyPathKeyCache` 里增加 append-only 快路：
  - 新增环境开关 `LOGIX_SELECTOR_INDEX_V2_DIRTY_PATH_KEY_FAST_APPEND`（默认 `1`）。
  - 当 dirty root upsert 属于“仅追加（未剪枝）”时，只做 `pathKeys.add`，跳过全量重建。
  - 当发生祖先覆盖导致剪枝时，继续走全量 `rebuild`，语义不变。

### 2) Process 候选改动（留档，不进入最终 diff）

process 侧的 `moduleStateChange` shared stream 合流改动在本 worktree 中已回退，不进入“最小可 cherry-pick diff”。

原因：

- 证据面呈混合收益：p95 与订阅峰值改善，但 p50/mean 上升，仍需后续继续压平。
- 需要后续补齐更细的成本归因与实现压平后再考虑合入。

### 3) 回归与证据测试补齐

- 新增 targeted evidence 用例：
  - `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.PathKeyFastAppend.Perf.off.test.ts`

## targeted 证据落盘

### Selector（正向）

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3-selector-process-v3.selector.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3-selector-process-v3.selector.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3-selector-process-v3.selector.diff.json`

结论摘要：

- 行为签名稳定（`totalRoots/digest` 一致）。
- `p50/p95/mean` 同向下降：
  - p95 `10.0158ms -> 5.9110ms`（ratio `0.5902`）。

## 最小验证

已执行：

1. 用户给定命令原样执行  
   `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/SelectorGraph.test.ts test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts`
   - 实际只命中 `Process.Trigger.ModuleAction.SharedStream.test.ts`（路径 `test/internal/.../SelectorGraph.test.ts` 在当前仓库不存在）。

2. 等价修正后执行  
   `pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts`
   - 通过：`2 files, 21 tests`.

3. `python3 fabfile.py probe_next_blocker --json`
   - 结果：`status=clear`，未新增 blocker。

## 本刀判定

- selector 侧：`accepted_with_evidence`。
- process 侧：`merged_but_provisional`（留档，不进入最终 diff）。
