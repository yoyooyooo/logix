# 2026-03-21 · cross-plane pulse/topic/react-bridge nextwide 识别包（docs/evidence-only，implementation-ready）

> 状态更新（2026-03-21）：`P1-4B-min` 与 `P1-4C-min` 已在母线实现并进入 `accepted_with_evidence` 盘面；后续 nextwide 续线识别见 `docs/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.md`。

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 输入基线

- `P1-4 bigger design v2`：`docs/perf/2026-03-21-p1-4-crossplane-bigger-design-v2.md`
- `P1-4B design package`：`docs/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.md`
- selector 贴边优化已吸收：
  - `docs/perf/archive/2026-03/2026-03-19-react-selector-multiplex.md`
  - `docs/perf/archive/2026-03/2026-03-19-selector-topic-eligible.md`
- 链路热路径地图：`docs/perf/02-externalstore-bottleneck-map.md`

## 问题重述（跨 RuntimeStore 到 React 的“脉冲税”）

链路锚点：

`RuntimeStore -> TickScheduler -> RuntimeExternalStore -> useSelector`

即使 `selectorTopicEligible` 覆盖率提升、组件实例级 multiplex 已吸收，当前仍存在两类跨 plane 的结构性成本：

1. 同一 `moduleInstance` 内，module topic 与多个 readQuery topic 在同一 tick 仍可能触发多次 bridge pulse 安排与通知准备。
2. React 侧订阅拓扑仍偏碎片化，topic 数与 selector 数上升时，订阅与回调扇出成本仍会放大。

旧小切口（`shared microtask flush`、`dirtyTopics single-pass classification`）只覆盖 TickScheduler 的局部常数，无法系统性减少 runtime 到 react bridge 的重复通知准备与订阅拓扑放大。

## Top2 大方向（按“跨 plane 收益面”排序）

### Top1：`P1-4B` module-scoped pulse coalescing

状态：`implementation-ready`，已冻结唯一最小实施切口 `P1-4B-min`。

核心收益面：

- 按 `moduleInstanceKey` 聚合同 tick 的 module/readQuery pulse，把 bridge 侧成本从“每个 dirty topic 一次 pulse”收敛到“每个 moduleInstance 每 tick 一次 pulse”。
- 覆盖 `RuntimeStore -> TickScheduler -> RuntimeExternalStore` 三段交界，收益面大于旧小切口。

唯一建议下一线：

- 继续保持 `P1-4B-min(RuntimeExternalStore module pulse hub)` 为唯一下一线，原因是它的改动面可控，语义风险边界清晰，且能直接削减跨 topic 的重复 pulse 税。

实现与验证约束见：

- `docs/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.md`

### Top2：`P1-4C` moduleInstance pulse envelope + selector delta payload（新识别线，nextwide）

定位：在 `P1-4B` 之后继续收敛 React bridge 的订阅拓扑与 selector 触发面，把“能否触发 selector 重新计算”的信息从分散的 topic 订阅提升到“单 envelope 输入”。

目标：

- 每个 `moduleInstanceKey` 在每个 tick 至多产出一份 `PulseEnvelope`，作为 React bridge 的唯一输入信号。
- `PulseEnvelope` 携带最小可序列化的 “delta payload”，让 `useSelector` 能在不增加额外订阅的前提下跳过无关 selector 的重算。

为什么值得排第二：

- 进一步减少 React 侧 `subscribe` 拓扑与回调扇出，收益随 selector 数增长而放大。
- 将 “topic 粒度的变化” 与 “selector 粒度的重算” 解耦，为后续更大的 selector 预计算或缓存线提供稳定输入协议。

#### implementation-ready 最小切口（不实施代码，仅落识别）

Cut 名称：

- `P1-4C-min`: `PulseEnvelope v0 + SelectorDeltaTopK`

写入范围（若触发进入实施线）：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useSelector.ts`

最小协议（建议）：

- `PulseEnvelope` 字段：
  - `moduleInstanceKey`
  - `tickSeq`
  - `priorityMax`（保持现有优先级语义）
  - `selectorDeltaTopK` 或 `selectorDeltaHash`（Slim，可序列化，支持采样）
  - `readQueryTopicDeltaCount`（仅计数与 hash，避免大 payload 常驻）
- 语义约束：
  - `getSnapshot` 与 `topicVersion` 语义保持现状，envelope 仅作为“是否需要检查”的 gating 信号。
  - 默认成本接近零，delta payload 仅在 diagnostics 或采样启用时可扩展为更可解释的结构。

成功门（进入实施线后必须全部满足）：

1. `P1-4B` 的语义与收益保持成立，不引入 tick/priority/topicVersion 漂移。
2. 同等 selector 数下，React 侧订阅数量下降可观测，且回调扇出不增加。
3. `probe_next_blocker --json` 给出可比结论，且 `failure_kind` 不为 `environment`。

失败门（任一成立立即回退并按 docs/evidence-only 收口）：

- delta payload 引入显著常驻内存或序列化成本，且无法通过采样控制。
- selector 重算触发面扩大，导致 wall-clock 恶化。
- 任何 tearing 或可见性语义回归。

## 本轮最小验证与证据落点

最小验证命令：

```bash
python3 fabfile.py probe_next_blocker --json
```

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-crossplane-pulse-topic-reactbridge-nextwide-identify.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-crossplane-pulse-topic-reactbridge-nextwide-identify.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-crossplane-pulse-topic-reactbridge-nextwide-identify.summary.md`
