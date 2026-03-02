# Bootstrap Self-Bootstrap（Out-of-CLI）执行记录

## 目标与边界

- `bootstrap-loop` 仅作为外部编排器（`specs/.../scripts/bootstrap-loop.mjs`），通过子进程调用 `logix verify-loop`。
- CLI 发布物未新增/改动 loop 命令语义；只消费既有 `verify-loop` 输出契约（`nextActions/reasonCode/verdict`）。

## 动态决策规则

每轮读取 `CommandResult@v2`：

1. 若 `verdict=PASS`：停止并判定收敛。
2. 若 `verdict=RETRYABLE` 或 `reasonCode=VERIFY_RETRYABLE` 或 `nextActions` 含 `retry-verify-loop`：继续下一轮，切换到 `retryTarget`（默认 `fixture:pass`）。
3. 若 `verdict=VIOLATION` 或 `nextActions` 含 `repair-and-rerun-verify-loop`：继续下一轮，切换到 `violationTarget`（默认 `fixture:pass`）。
4. 其他情况：停止并输出未收敛结论。

默认参数可形成至少 2 轮收敛链：`fixture:retryable -> fixture:pass`。

## 审计产物

- 默认路径：`<outDir>/bootstrap-loop.audit.json`（可通过 `--auditFile` 覆盖）。
- 字段（每轮）：
  - `runId`
  - `reasonCode`
  - `attempt`
  - `verdict`
  - `exitCode`
  - `mode`
  - `target`

审计文件示例：

```json
{
  "schemaVersion": 1,
  "kind": "BootstrapLoopAudit",
  "converged": true,
  "finalVerdict": "PASS",
  "records": [
    {
      "runId": "bootstrap-e2e-attempt-01",
      "reasonCode": "VERIFY_RETRYABLE",
      "attempt": 1,
      "verdict": "RETRYABLE",
      "exitCode": 3,
      "mode": "run",
      "target": "fixture:retryable"
    },
    {
      "runId": "bootstrap-e2e-attempt-02",
      "reasonCode": "VERIFY_PASS",
      "attempt": 2,
      "verdict": "PASS",
      "exitCode": 0,
      "mode": "resume",
      "target": "fixture:pass"
    }
  ]
}
```

## stdout 汇总

每轮输出一行摘要，并在结尾输出总览：

- 轮次：`attempt/mode/runId/target/verdict/reasonCode/exitCode/decision`
- 总结：`rounds/finalVerdict/finalReasonCode/converged/auditFile`
