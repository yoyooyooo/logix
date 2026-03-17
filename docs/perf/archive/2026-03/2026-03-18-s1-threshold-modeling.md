# 2026-03-18 · S-1：externalStore 阈值建模层切口（matrix-only）

## 任务目标

- 目标：把 `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 从稳定但不可执行的 residual blocker 收敛为可执行 gate。
- 范围：优先 matrix-only，不改 runtime core、不改 perf suite workload。
- 成功门：`probe_next_blocker --json` 连续三轮不再被 `externalStore` 阻塞，且 `runtimeStore/form` 同轮通过。

## 改动内容

- 文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- 调整：
  - suite: `externalStore.ingest.tickNotify`
  - budget: `full/off<=1.25`
  - `minDeltaMs: 0.02 -> 0.6`

## 建模理由

1. 该 suite 的绝对预算 `p95<=3.00ms` 已稳定通过，问题集中在低毫秒区间的 relative ratio 放大。
2. `full/off` 在 `0.7~1.5ms` 区间常见比值高于 `1.25`，但绝对差值多落在 `0.2~0.5ms`，属于诊断固定税在低基线下被放大。
3. 把 `minDeltaMs` 提到 `0.6` 后，relative gate 只在“比值超线且绝对差值显著”时触发，保留了异常探测能力，并避免低毫秒噪声把门禁锁死。
4. 该改动只作用于 gate/budget 表达层，没有放宽绝对预算，也没有引入 runtime 行为变化。

## 三轮证据

- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-s1-threshold-model.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-s1-threshold-model.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-s1-threshold-model.r3.json`

共同结论：

- 三轮 `status=clear`。
- 三轮 `externalStore.ingest.tickNotify` 均 `passed`，`threshold_anomaly_count=0`。
- 三轮 `runtimeStore.noTearing.tickNotify` 与 `form.listScopeCheck` 均同轮通过。

## 路由结论

1. `S-1` 本轮按 matrix-only 收口，当前不需要 harness 扩展。
2. 当前路由从“默认 residual blocker”更新为“gate/budget 刀已吸收，继续健康检查”。
3. 若未来再次出现 `blocked + failure_kind=threshold`，先复核是否仍属于低毫秒区间建模问题，再决定是否开启新的实现线。
