# 2026-03-22 · SW-N3 degradation ledger + reducer patch sink（implementation line）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.sw-n3-degradation-ledger-impl`
- branch：`agent/v4-perf-sw-n3-degradation-ledger-impl`
- 唯一目标：按 `docs/perf/2026-03-22-sw-n3-contract-freeze.md` 的冻结合同，为 `state:update` 接入最小 `stateWrite` 数据面与统一词表，并验证不引入回归。

## 触发本地动作

- 触发条件：前两轮 subagent 线程都未进入补丁编辑，任务已收敛到单一最小切口，且继续等待只会空转。
- 回退原因：主会话在独立 worktree 内直接执行最小实现与验证，以保持该线推进。

## 本轮实现

1. `StateTransaction` 新增 `StateWriteIntent` 合同与 `toStateWriteIntent(...)` 归纳函数。
- 基于 `origin.kind/name` 与 patch reason 归纳 `source`。
- 在 `dirtyAll=false` 时区分 `precisePatch / topLevelKnown`。
- 在 `dirtyAll=true` 时统一落到 `customMutation + degradeReason`。

2. `ModuleRuntime.transaction` 在 `state:update` 事件写入 `meta.stateWrite`。
- 与现有 `dirtySet` 并存，不替换既有 diff/compat 锚点。
- `pathIdsTopK` 沿用 light/full 的 TopK 截断口径。

3. `DebugSink.record` 把 `stateWrite` 纳入 slim meta 投影。

4. 最小测试补齐：
- `Debug.RuntimeDebugEventRef.Serialization` 断言 `stateWrite` 可序列化并保留。
- `devtools-react.integration` 断言导入 evidence 时 `meta.stateWrite` 被保留。

## 验证

以下工件已落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n3-degradation-ledger-impl.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n3-degradation-ledger-impl.validation.core.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n3-degradation-ledger-impl.validation.devtools.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n3-degradation-ledger-impl.probe-next-blocker.json`

验证结果：

1. `pnpm -C packages/logix-core typecheck:test`：通过
2. core 最小测试集：通过（`4 files / 17 tests passed`）
3. devtools 最小测试集：通过（`2 files / 7 tests passed`）
4. `python3 fabfile.py probe_next_blocker --json`：`status=clear`

probe 备注：
- 仅保留既有 `externalStore.ingest.tickNotify / full/off<=1.25` soft watch。
- 本轮无新的 hard blocker。

## 结果分类

- `merged_but_provisional`

理由：
- 合同与最小实现已落地，验证链路通过。
- 但本轮没有给出直接的 before/after perf 增益，只证明“统一词表接线完成且无回归”。
- 在采到首轮 `stateWrite.degradeRatio / degradeUnknownShare` 的可比工件前，不计入正式 perf win。

## 当前还剩什么

1. 为 `stateWrite.degradeRatio / degradeUnknownShare` 增加首轮可比工件与读取口径。
2. 再决定是否需要继续补 `packages/logix-devtools-react` 的聚合展示面。
3. `SW-N2` 仍保持 watchlist，继续等待 `packages/logix-core` 全量 correctness gate 可复现全绿。
