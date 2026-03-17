# 2026-03-21 · P1-4C moduleInstance pulse envelope + selector delta payload（implementation-ready，docs/evidence-only）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4c-pulse-envelope-design`
- branch：`agent/v4-perf-p1-4c-pulse-envelope-design`
- 唯一目标：基于 `P1-4B` 已实施的前提，把 `P1-4C moduleInstance pulse envelope + selector delta payload` 收成 implementation-ready 设计包（docs/evidence-only）。
- 本轮约束：
  - 不改 public API
  - 不落代码改动
  - 不回到 `shared microtask flush`
  - 不回到 `TickScheduler dirtyTopics single-pass classification`

## 前提：`P1-4B` 已成立，但只解决“pulse 次数”

已实施并 `accepted_with_evidence`：

- `P1-4B-min RuntimeExternalStore module pulse hub`：见 `docs/perf/2026-03-21-p1-4b-module-pulse-hub-impl.md`

`P1-4B` 把跨 topic 的重复 pulse 减到“每 moduleInstance 每 tick 至多一次”。它没有解决两类后续税：

1. React 侧订阅拓扑仍偏碎片化，topic 数与 selector 数上升时，订阅与回调扇出会放大。
2. 即使 pulse 次数收敛，selector 仍可能在同一 envelope 下被迫重算，形成“重算税”。

`P1-4C` 的目标是把优化锚点从 “pulse 计数” 推进到 “selector 重算触发面”。

## 本轮触发器事实

- `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=blocked`
- 阻塞类型：`failure_kind=environment`
- 关键信息：`vitest: command not found`，`node_modules missing`

当前证据不具备可比性，本轮只落设计包，不进入代码实施。

## implementation-ready 最小实施切口判定

### Cut 名称

- `P1-4C-min`: `PulseEnvelope v0 + SelectorDeltaTopK`

### 设计口径（比 `P1-4B` 更进一步）

1. 把 React bridge 的“输入信号”统一为每个 `moduleInstanceKey` 每 tick 一份 `PulseEnvelope`。
2. `PulseEnvelope` 携带 Slim 且可序列化的 `selector delta payload`，用于 `useSelector` 的保守跳过：
   - 允许 false positive（多算），禁止 false negative（漏算）。
3. 不新增额外订阅。selector 的跳过逻辑不依赖额外 topic 订阅信号。

### 协议：`PulseEnvelope v0`

`PulseEnvelope` 是 React bridge 的唯一输入信号，最小字段：

- `moduleInstanceKey: string`
- `tickSeq: number`
- `priorityMax: "normal" | "low"`（与现有调度语义对齐，不引入新优先级）
- `topicDeltaCount: number`（计数，不携带 topic 列表）
- `topicDeltaHash: string`（稳定 hash，用于诊断与采样对照）
- `selectorDelta: SelectorDeltaTopK`（见下一节）

约束：

- envelope 只负责 gating，不改 `getSnapshot` 与 `topicVersion` 语义。
- envelope 默认成本接近零，`selectorDelta` 必须支持“诊断/采样启用才扩展”的形态。

### 协议：`SelectorDeltaTopK v0`

目标：提供“可序列化的保守 membership 检查”，支撑 `useSelector` 的跳过。

- `bloomWords: [number, number, number, number]`
  - 作为 membership 的保守近似：`maybeChanged(selectorId) -> boolean`
  - 允许误报，禁止漏报
- `topK: string[]`
  - 默认不常驻，仅在 diagnostics 或采样时填充（解释性锚点）
- `hash: string`
  - 用于对照与回放，不参与 correctness 决策

### 最小改动范围（若触发进入实施线）

第一刀仅改：

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - 基于 `modulePulseHub` 产出 `PulseEnvelope` 并作为唯一 subscribe 输入
- `packages/logix-react/src/internal/hooks/useSelector.ts`
  - 用 `selectorDelta` 做保守跳过，禁止引入 tearing

第二刀才允许触达（必要时）：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - 仅用于生成 `selectorDelta` 的最小数据面，不引入新的 topic 分类切口

## 收益面（可验证）

1. 订阅拓扑收敛：同 moduleInstance 下的订阅从 “module topic + 多 readQuery topic + selector topic” 收敛到 “每 moduleInstance 1 条 envelope 订阅”。
2. 回调扇出收敛：React 侧 `subscribe` 回调触发次数随 selector/topic 数增长不再线性放大。
3. selector 重算收敛：在 envelope 触发下，绝大多数 selector 通过 `selectorDelta` 保守跳过，避免无关重算。

## 风险门与失败门

风险门：

- correctness：任何 `selectorDelta` 近似都只能产生误报，不能产生漏报。
- tearing：`useSyncExternalStore` 可见性与一致性语义不漂移。
- 成本：envelope 常驻内存与序列化成本受控，可通过采样降到接近零。
- 语义：`tickSeq`、优先级、`getSnapshot`、`topicVersion` 不漂移。

失败门（任一成立立即回退并按 docs/evidence-only 收口）：

- `selectorDelta` 引入无法被采样控制的常驻成本或序列化开销。
- selector 重算触发面扩大，导致 wall-clock 恶化。
- 任一 tearing 或可见性语义回归。

## 验证门（触发实施后）

```bash
python3 fabfile.py probe_next_blocker --json
```

进入实施线后追加两类证据：

- 订阅数与回调扇出：按 `moduleInstanceKey` 计数对照（before/after）。
- selector 重算：以 `useSelector` 维度统计 “重算次数/跳过次数/误报率”。

## 本轮落盘

- `docs/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.evidence.json`

## 后续实施引用

- 实施结果：`docs/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.md`
- 实施 summary：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.summary.md`
- 实施 evidence：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.evidence.json`
