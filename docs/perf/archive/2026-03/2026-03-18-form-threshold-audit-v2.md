# 2026-03-18 · form.listScopeCheck threshold 复核 v2

## 目标与范围

- 目标：在 `S-1 threshold-model` 已补齐后，围绕 `form.listScopeCheck` 做三轮 clean comparable 复核，并给出三选一分类。
- 限制：只做 evidence/docs 复核，不修改 runtime/react/perf suite 实现。
- 工作区：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.form-threshold-audit-v2`。

## 执行命令

连续三轮执行：

```bash
python3 fabfile.py probe_next_blocker --json
```

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-form-threshold-audit-v2.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-form-threshold-audit-v2.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-form-threshold-audit-v2.r3.json`

补充验证（仅解释用）：

```bash
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx
```

## 三轮结果摘要

| 轮次 | status | 执行到 form | form 状态 | blocker | failure_kind | returncode |
| --- | --- | --- | --- | --- | --- | --- |
| r1 | clear | 是 | passed (`threshold_anomaly_count=0`) | 无 | 无 | 0 |
| r2 | clear | 是 | passed (`threshold_anomaly_count=0`) | 无 | 无 | 0 |
| r3 | blocked | 否（被前序门截断） | 未执行 | `externalStore.ingest.tickNotify` | threshold | 42 |

r3 关键字段：

- `threshold_anomalies[0].suite_id=externalStore.ingest.tickNotify`
- `threshold_anomalies[0].budget_id=full/off<=1.25`
- `threshold_anomalies[0].first_fail_level=128`

补充验证结果：

- 直接运行 `form-list-scope-check` browser suite 通过，返回码 `0`。

## 三选一裁决

结论：`gate noise`。

理由：

1. 三轮内未出现任何 `form.listScopeCheck` threshold anomaly，已执行到 form 的两轮都 `passed`。
2. 第三轮未执行到 form，阻断点固定在上游 `externalStore` 阈值门，属于 probe 队列前序门抖动。
3. 当前证据不支持把 form 归类为 `stable blocker`，也不支持把 form 本身归类为 `gate modeling issue`。

## 路由动作

1. `form.listScopeCheck` 维持健康检查项，当前不进入实现线。
2. 若后续继续做 form 复核，优先保留三轮 probe，再补一轮 form 定向运行用于解释截断轮次。
3. 当前轮次只做 docs/evidence 收口，不改 runtime/react/perf core。

## 文档回写

本次已同步回写：

- `docs/perf/README.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
