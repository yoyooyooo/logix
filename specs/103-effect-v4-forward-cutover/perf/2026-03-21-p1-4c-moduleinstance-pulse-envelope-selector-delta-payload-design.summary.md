# 2026-03-21 · P1-4C moduleInstance pulse envelope + selector delta payload summary

## 结论

- 结论类型：`docs/evidence-only`
- 交付形态：`implementation-ready design package`
- 代码改动：`none`
- accepted_with_evidence：`false`

## 最小切口与边界

- `P1-4C-min`：`PulseEnvelope v0 + SelectorDeltaTopK`
- 前提：`P1-4B-min RuntimeExternalStore module pulse hub` 已实施并 `accepted_with_evidence`。
- 不改 public API。

## 为何比 `P1-4B` 更进一步

- `P1-4B` 收敛的是 “每 tick 的 pulse 次数”；`P1-4C` 继续收敛 “每个 pulse 下的 selector 重算触发面”。
- `P1-4C` 把 React bridge 的输入统一为 `PulseEnvelope`，把订阅拓扑从 topic 扇出推进到 moduleInstance 单输入。
- `selector delta payload` 只允许误报，禁止漏报，保证 correctness 不因跳过而漂移。

## 本轮裁决

- `probe_next_blocker` 命中 `failure_kind=environment`，当前证据不可比，本轮只落设计包，不进入代码实施。

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.evidence.json`
- `docs/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.md`

## 后续实施

- `docs/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.evidence.json`
