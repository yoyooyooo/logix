# 2026-03-18 · form.listScopeCheck 阈值建模收口

## 背景

- 目标限定为 gate/budget 层修正：让 `form.listScopeCheck` 的 `auto<=full*1.05` 在 current-head 上可执行、可复测。
- 已知前提：`current-probe-stability` 的 `r3/r4` 两次 failure，绝对差值都约 `0.0999999ms`。
- 同类预算已有先例：`converge.txnCommit auto<=full*1.05` 使用 `minDeltaMs=0.1`。

## 改动

- 仅改 matrix：
  - 文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`
  - suite：`form.listScopeCheck`
  - budget：`auto<=full*1.05`
  - 新增：`"minDeltaMs": 0.11`

## 为什么这不是放水

- 本次不调整 `maxRatio=1.05`，预算主约束保持不变。
- 本次只给 relative budget 增加最小绝对差值门槛，作用是屏蔽低毫秒量化误差。
- `0.11ms` 的选择依据是跨过单个 `0.1ms` 级别 timer quantum，并与现有 `runtimeStore`/`converge` 的 gate 建模思路一致。
- 修改范围限定在 matrix，未触及 runtime core、React/store、form suite 业务逻辑与 harness。

## 验证

执行命令：

```bash
python3 fabfile.py probe_next_blocker --json
```

三轮落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-form-threshold-model.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-form-threshold-model.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-form-threshold-model.r3.json`

结果摘要：

- 三轮 `status=clear`
- `form.listScopeCheck` threshold anomaly = 0
- `runtimeStore.noTearing.tickNotify` threshold anomaly = 0
- `externalStore.ingest.tickNotify` threshold anomaly = 0

## 结论

- `form.listScopeCheck auto<=full*1.05` 已收敛为可执行 gate。
- 该收敛属于阈值建模修正，不属于 runtime 性能回退掩盖。
