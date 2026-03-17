# 2026-03-22 · D-5-min Diagnostics Cost-Class Protocol + Gate Plane Split（accepted_with_evidence）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.d5-diagnostics-gate-split`
- branch：`agent/v4-perf-d5-diagnostics-gate-split`
- 唯一目标：把 `D-5` 收成最小可验证闭环，先落地 `costClass/gateClass/samplingPolicy` 协议与 `probe_next_blocker` 的 hard/soft split
- 写入范围：
  - `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
  - `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
  - `packages/logix-core/src/Debug.ts`
  - `packages/logix-devtools-react/src/internal/state/projection-budget.ts`
  - `packages/logix-react/test/browser/perf-boundaries/harness.ts`
  - `.codex/skills/logix-perf-evidence/assets/matrix.json`
  - `fabfile.py`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`
- 禁区：
  - 不改 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 不改 `RuntimeStore` / `TickScheduler` / `RuntimeExternalStore` 热路径
  - 不改 public API

## 实施摘要

1. Debug/Devtools 事件新增成本分类字段
- `RuntimeDebugEventRef` 新增 `costClass`、`gateClass`、`samplingPolicy`
- 分类规则收敛为三类：
  - `runtime_core / hard / always`
  - `controlplane_phase / soft / budgeted`
  - `devtools_projection / soft / sampled`
- `DevtoolsHub.exportBudget.byEvent` 保留这些字段，并把分类写进 attribution key，避免不同平面的热点被同 key 混算

2. projection budget synthetic 事件对齐新协议
- `devtools-react` 的 `devtools:projectionBudget` synthetic 事件携带 `devtools_projection / soft / sampled`
- `byEvent` 热点列表继续保持 Top10 归一化，额外透传分类字段

3. probe gate plane split 落地
- `fabfile.py` 读取 `threshold.budget.gateClass/costClass`
- `gateClass=soft` 的阈值异常仍写入 `threshold_anomalies`
- 只有 `hard` 阈值异常才会把 `probe_next_blocker` 判成 `blocked`
- 默认未标注的 budget 仍按 `hard` 处理，避免静默放松既有门禁

4. 最小矩阵回写
- 仅把 `externalStore.ingest.tickNotify / full/off<=1.25` 标成：
  - `gateClass: soft`
  - `costClass: devtools_projection`
- 这条预算继续保留在 report 中，当前只从 blocker plane 移到 watch plane

## TDD 记录

先写失败测试，再补实现：

1. `packages/logix-core/test/Debug/Debug.RuntimeDebugEventRef.Serialization.test.ts`
- 先失败于分类字段缺失

2. `packages/logix-core/test/Debug/DevtoolsHub.test.ts`
- 先失败于 `exportBudget.byEvent` 未保留分类字段

3. `packages/logix-devtools-react/test/internal/DevtoolsStateProjectionBudget.test.ts`
- 先失败于 synthetic hotspot 未透传分类字段

4. `test_fabfile_probe_next_blocker.py`
- 先失败于 soft gate 仍被当成 blocker

## 最小验证命令与结果

```bash
pnpm -C packages/logix-core exec vitest run test/Debug/Debug.RuntimeDebugEventRef.Serialization.test.ts test/Debug/DevtoolsHub.test.ts
pnpm -C packages/logix-devtools-react exec vitest run test/internal/DevtoolsStateProjectionBudget.test.ts
python3 -m unittest test_fabfile_probe_next_blocker.py
pnpm -C packages/logix-react exec vitest run --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx -t "perf: externalStore ingest"
python3 fabfile.py probe_next_blocker --json
```

结果：

1. core debug/devtools tests：通过
2. devtools-react projection budget test：通过
3. python unittest：通过
4. `externalStore.ingest.tickNotify`：通过，report 中已带 `gateClass=soft`
5. `probe_next_blocker --json`：`status=clear`，`blocker=null`，`threshold_anomalies=[]`

## 仓库级质量门

1. `pnpm typecheck`：通过
2. `pnpm test:turbo`：失败，但当前失败样本落在母线同样可复现的 `@logixjs/core` 存量测试
   - `test/internal/Runtime/WorkflowRuntime.075.test.ts`
   - `test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`
   - 以及同批 `DeclarativeLinkIR.boundary`、`ConcurrencyPolicy.ResolveCache`、`Process.ErrorPolicy.Supervise`、operation runner perf tests

本轮判断：
- 这些失败与 D-5 写入面不重叠
- 至少两组代表性失败已在母线 `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf` 复现
- 因此仓库级 `test:turbo` 仍未全绿，但不把它归因到 D-5

## 裁决

- 结果分类：`accepted_with_evidence`
- accepted_with_evidence：`true`
- 结论依据：
  - `costClass/gateClass/samplingPolicy` 已进入 Debug/Devtools 可解释链路
  - `probe_next_blocker` 已完成 hard/soft split，soft gate 不再误触发 blocker
  - `externalStore.ingest.tickNotify / full/off<=1.25` 从 blocker plane 移入 watch plane，最小验证链路全绿

## 风险与后续

- 本轮只完成 `D-5` 的最小切口，当前未把所有 diagnostics 预算都系统性重分层
- 若后续还有其它 `full/off` 相对门出现同类摆动，继续沿同协议扩面，不要回退到单一混算 gate
- `R-2`、`P1-6''`、`SW-N3`、`N-3` 仍保持各自独立路线，不与本切口混刀

## 主会话回退说明

- 本轮先尝试 `spawn_agent + worktree`
- 触发回退原因：平台子线长时间无可用产出，worktree 无任何落盘改动，无法支撑实现线推进
- 回退方式：主会话在同一独立 worktree 内执行最小本地动作，不回到母线直接改实现

## 证据工件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.validation.core-vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.validation.devtools-vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.validation.python.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.validation.external-store.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.evidence.json`
