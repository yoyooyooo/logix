# 2026-03-22 · diagnostics/controlplane/devtools 预算链路统一侦察（docs-only）

> worktree: `v4-perf.scout-diagnostics-budget-unify`  
> branch: `agent/v4-perf-scout-diagnostics-budget-unify`  
> 范围：只做提案，不做实现；仅落盘 `docs/perf/**` 与 `specs/103-effect-v4-forward-cutover/perf/**`。

## 0. 唯一结论

唯一建议下一刀：`D-5 Diagnostics Cost-Class Protocol + Gate Plane Split`。

定义：把 diagnostics 事件从 runtime/controlplane/devtools 三个来源统一到同一套成本分层协议，用分层预算门替换单一 `full/off<=1.25` 对所有事件混算的门禁模型。

目标：
- 长期压低 `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 税点。
- 把 current-head 的 `edge_gate_noise` 从主 gate 中剥离，保留为可观测但不误触发的副信号。

## 1. 证据锚点（本轮侦察输入）

必读锚点：
- `docs/perf/README.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/archive/2026-03/2026-03-21-externalstore-threshold-localize-v4.md`

关键补充锚点：
- `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`
- `docs/perf/archive/2026-03/2026-03-20-p2-4-live-budget-visibility.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json` ~ `r7.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.focused-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.evidence.json`

## 2. 现象归纳（跨模块链路）

1. `externalStore.ingest.tickNotify` 的阻塞档位仍漂移。  
`v4` localize 与 Gate-C 复核都显示 `first_fail_level` 在 `128/256/512` 摆动，结论持续是 `edge_gate_noise`。

2. Gate-C 的 blocked 样本单一且重复。  
7 轮 `probe_next_blocker --json` 为 `4 clear + 3 blocked`，blocked 全部指向同一 budget：`full/off<=1.25`。

3. 相对门在低毫秒区间对微小波动过敏。  
focused wave 的 `off_p95_128` 多在 `0.8~1.0ms`，`full_p95_128` 在 `1.1~1.7ms`；同一套逻辑中 gate 结果可在相邻轮次翻转。

4. controlplane 线已能出现“首轮阻塞、复跑清空”的门禁抖动。  
`Stage G6` 证据里 `probe` 首轮被 `form.listScopeCheck` 阈值阻塞，复跑恢复 `clear`，说明跨模块事件负载会穿透到统一 gate 结论。

5. 现有 `P2-4` 已解决“可见性”，未建立“成本分层与准入控制”。  
`projection budget` 目前能归因热点，仍缺“哪些事件可以进入 hard gate，哪些只进 soft watch”的统一协议。

## 3. 为什么选 D-5

`D-5` 直接切中当前三段断裂：
- diagnostics 事件有归因，无统一成本分层。
- controlplane 事件有 phase 合同，无预算准入合同。
- devtools 有 budget 统计，无 gate 平面隔离。

相较继续做局部阈值解释，`D-5` 的收益是结构性的：
- 同一事件在 runtime/controlplane/devtools 只保留一套成本语义。
- gate 从“单阈值判决”升级为“分层硬门 + 软门”。
- 可在不放松质量标准的前提下压低误报率。

## 4. D-5 提案（implementation-ready 方向，未实施）

### 4.1 协议层

为 `RuntimeDebugEventRef` 与证据包新增成本分层字段（建议名）：
- `costClass`: `runtime_core | controlplane_phase | devtools_projection`
- `gateClass`: `hard | soft`
- `samplingPolicy`: `always | budgeted | sampled`

约束：
- 默认 `runtime_core` 进入 `hard`。
- `controlplane_phase` 与 `devtools_projection` 默认进入 `soft`，可被 budgeted/sampled。
- 字段保持 Slim 且可序列化，不回填大 payload。

### 4.2 controlplane 层

对 `phase-trace` 事件做“默认聚合、按需明细”准入：
- 常态输出聚合计数与关键 reason code。
- 仅在 `hard` 诊断窗口里放大明细。

这一步和 `G5/G6` 的 owner-ticket 规则兼容，目标是减少 full 模式下高频明细事件对相对门的扰动。

### 4.3 devtools 层

把 `projection budget` 从“统计后展示”提升到“准入前治理”：
- 对 `soft` 类事件执行确定性预算配额（按 class 或按事件族）。
- 保留 drop/oversize 归因计数，支持离线复盘。

### 4.4 gate 协议层

将当前单一 `full/off<=1.25` 拆成两层：
- `hard gate`: `full/off<=1.25@runtime_core`
- `soft watch`: `full/off<=1.25@all_classes`

裁决规则：
- 只有 hard gate 才能阻塞 `probe_next_blocker`。
- soft watch 触发进入观察与归因，不阻塞主线。

## 5. API/协议变动评估

- 协议变动：`需要`。涉及 debug event schema 与 perf gate schema。  
- public API 变动：`可选`。建议先走 internal protocol cut，若后续需要外部策略配置，再并入 `R-2` Gate-A/B/E 流程。

## 6. 禁做项对齐

本提案明确排除以下重复路径：
- 不重做 `externalstore-threshold-localize v4`。
- 不重做 `form-threshold-audit`。
- 不重包 `P2-4 live-budget-visibility`。
- 不回到 `DevtoolsHub projection hints`。
- 不再做仅限局部阈值解释的旧线。

## 7. 开线成功门建议（供后续实施线使用）

1. 成本类字段落盘后，`probe_next_blocker` 同机 7 轮中，`full/off<=1.25` 的 blocked 样本只由 `runtime_core` 决定。  
2. 同机 7 轮里 `externalStore.ingest.tickNotify` 的 `first_fail_level` 不再跨 `128/256/512` 漂移。  
3. `soft watch` 触发时可回溯到 `costClass` 与事件族热点，且不阻塞主 gate。  

## 8. 本轮结论分类

- 分类：`docs/evidence-only`
- 实施：`未实施`
- 下一步：若开实施线，建议以 `D-5` 单独建线，避免与 `R-2` public API 或 React controlplane 扩面任务混刀。
