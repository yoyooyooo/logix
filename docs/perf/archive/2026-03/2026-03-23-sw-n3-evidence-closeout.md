# 2026-03-23 · SW-N3 evidence closeout

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.sw-n3-evidence-20260323`
- branch：`agent/v4-perf-sw-n3-evidence-20260323`
- 唯一目标：为 `SW-N3 Degradation-Ledger + ReducerPatchSink contract` 补齐首轮 `stateWrite.degradeRatio / degradeUnknownShare` 可比工件与读取口径。
- 写入范围：
  - `packages/logix-devtools-react/src/internal/state/**`
  - `packages/logix-devtools-react/test/internal/**`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`
- 禁区：
  - 不改 public API
  - 不新增 `packages/logix-core/**` 写入

## 本轮实现

1. `OperationSummary` 新增 `stateWrite` 汇总结构。
- `observedCount`
- `missingCount`
- `readCoverage`
- `degradedCount`
- `unknownReasonCount`
- `degradeRatio`
- `degradeUnknownShare`
- `bySource` 五分桶

2. `computeDevtoolsState` 接入 `state:update.meta.stateWrite` 的聚合窗口。
- 仅消费 slim `meta.stateWrite`
- `customMutation` 统一计入 degraded
- `degradeReason='unknownWrite'` 计入 unknownReason
- 缺少或非法 `stateWrite` 记入 `missingCount`

3. 补齐 imported evidence 读取测试。
- 从 evidence import 直接验证 `readCoverage / degradeRatio / degradeUnknownShare`
- 固定 `reducer / boundApi.update / trait.externalStore` 三类来源分桶

## 验证

以下工件已落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-sw-n3-evidence.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-sw-n3-evidence.validation.devtools.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-sw-n3-evidence.probe-next-blocker.json`

验证结果：

1. `pnpm -C packages/logix-devtools-react typecheck:test`：通过
2. `pnpm -C packages/logix-devtools-react exec vitest run test/internal/devtools-react.integration.test.tsx test/internal/ConvergeTimelinePane.test.tsx`：通过（8 tests）
3. `python3 fabfile.py probe_next_blocker --json`：`status=clear`

## 首轮可比工件口径

本轮用 imported evidence 的固定样本验证读取口径：

- `observedCount=3`
- `missingCount=1`
- `readCoverage=0.75`
- `degradedCount=2`
- `unknownReasonCount=1`
- `degradeRatio=2/3`
- `degradeUnknownShare=1/2`

这组值的意义是：`SW-N3` 不再只停在 `meta.stateWrite` 落盘，devtools 已能稳定读出首轮预算指标。

## 结果分类

- `accepted_with_evidence`

理由：

- `SW-N3` 的收口条件本来就是“首轮可比工件 + 稳定读取口径”
- 当前聚合逻辑、测试与 probe 已全部通过
- 这条线的正式收益是证据能力完成，不是再次声称热路径毫秒级提速

## 当前还剩什么

1. 回收到母线时，把 `docs/perf/README.md` 与 `docs/perf/07-optimization-backlog-and-routing.md` 中 `SW-N3` 从 `merged_but_provisional` 更新为 `accepted_with_evidence`。
2. 后续是否继续做 UI 展示面增强，可以独立成下一条低冲突线，不再阻塞 `SW-N2` 的重开裁决。
