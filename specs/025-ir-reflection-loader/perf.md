# Perf: IR Reflection Loader（Trial Run 开销基线）

本文件记录 025 的最小性能证据：`Observability.trialRunModule` 在“启动 + 受控窗口 + scope close”链路上的 wall time 基线。

## 目标

- 给出可复现的基线跑道，防止 Trial Run 能力意外拖进热路径或引入过量开销。
- 输出证据以 JSON 形式落在 `specs/025-ir-reflection-loader/perf/`，便于 CI/人工复跑与对比。

## 如何运行

```bash
ITERS=200 \
DIAGNOSTICS_LEVEL=light \
MAX_EVENTS=200 \
TRIAL_RUN_TIMEOUT_MS=3000 \
CLOSE_SCOPE_TIMEOUT=1000 \
REPORT_MAX_BYTES=500000 \
pnpm perf bench:025:trialRunModule -- \
  --out specs/025-ir-reflection-loader/perf/after.worktree.json
```

## 输出格式（摘要）

- `results.trialRunModule.totalMs`：总耗时
- `results.trialRunModule.nsPerOp`：单次试跑平均耗时（ns/op）
- `results.trialRunModule.avgEventCount`：平均导出的事件数量（受 `MAX_EVENTS`/诊断级别影响）
- `results.trialRunModule.avgReportBytes`：平均报告体积（UTF-8 bytes）

## 证据落点

- `specs/025-ir-reflection-loader/perf/after.worktree.json`

## Latest（参考）

- Raw JSON：`specs/025-ir-reflection-loader/perf/after.worktree.json`
- Node：`v22.21.1`（darwin/arm64）
- trialRunModule：
  - `nsPerOp=2234769.3750`
  - `avgEventCount=7`
  - `avgReportBytes=3980.73`
