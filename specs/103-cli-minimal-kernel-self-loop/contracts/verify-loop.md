# Verify Loop Contract

## 裁决与演进约束

- Phase 10 起，verify-loop 默认使用真实 gate 执行器（`executor=real`）。
- forward-only：不提供兼容层；不满足新契约的调用方必须通过迁移动作修复。

## Gate Scope 与真实执行器

`gateScope` 只决定 gate 集合，不决定是否执行真实命令。`executor=real` 必须执行命令并记录轨迹。

### runtime 门禁顺序（每轮收敛）

1. `gate:type` -> `pnpm typecheck`
2. `gate:lint` -> `pnpm lint`
3. `gate:test` -> `pnpm test:turbo`
4. `gate:control-surface-artifact` -> `pnpm -C packages/logix-cli test`
5. `gate:diagnostics-protocol` -> `pnpm -C packages/logix-cli test -- test/Contracts`

### governance 门禁顺序（CI 治理阻断）

6. `gate:perf-hard` -> `pnpm run check:perf-evidence`
7. `gate:ssot-drift` -> `pnpm run check:ssot-alignment`
8. `gate:migration-forward-only` -> `pnpm run check:forward-evolution`

## Verdict

- `PASS` -> `exitCode=0`
- `VIOLATION` -> `exitCode=2`
- `RETRYABLE` -> `exitCode=3`
- `NOT_IMPLEMENTED` -> `exitCode=4`
- `NO_PROGRESS` -> `exitCode=5`
- `ERROR` -> `exitCode=1`

## Run/Resume Input Contract（Identity 单一真相源）

- `verify-loop.input.json` MUST 通过 `contracts/schemas/verify-loop.input.v1.schema.json`。
- `run`：创建新轮次，必须生成新 `runId`，并以 `attemptSeq=1` 启动。
- `resume`：必须提供 `instanceId`、`runId`、`previousRunId`，并只允许推进 `attemptSeq`。
- `instanceId/txnSeq/opSeq/attemptSeq` 必须在 `CommandResult`、`verify-loop.report.json`、`verdict.json` 三工件保持同链一致。
- identity 不一致（漂移/回退/重置）必须 fail-fast，判定为 `VIOLATION`。

## nextActions Canonical DSL（bootstrap/autonomous 统一消费）

`nextActions[]` 最小对象：

```json
{
  "id": "na-001",
  "action": "rerun",
  "args": {
    "mode": "resume",
    "runId": "run-002",
    "previousRunId": "run-001",
    "target": "packages/logix-cli"
  },
  "preconditions": [],
  "ext": {}
}
```

约束：

- `id/action/args` 必填；
- `action` 仅描述动作语义，实参全部放在 `args`；
- bootstrap/autonomous 执行器 MUST 直接消费 `action+args`，MUST NOT 维护硬编码参数映射。
- 必填参数缺失必须 fail-fast：`rerun` 需要 `args.target`，`run-command` 需要 `args.command`。
- unknown `action` 必须 fail-fast 并非零退出；禁止 unknown-action + `args.command` fallback。

## Extension CLI 控制面最小接线

必须提供：

- `logix extension validate --manifest <path>`
- `logix extension load --manifest <path> --stateFile <path>`
- `logix extension reload --stateFile <path>`
- `logix extension status --stateFile <path> [--json]`

约束：

- `stateFile` 是 extension 运行态唯一真相源；
- 所有命令输出 `CommandResult@v2`；
- 命令失败必须落 `reasonCode`，必要时给出 `nextActions`。

## 产物

- `verify-loop.report.json`（MUST 通过 `contracts/schemas/verify-loop.report.v1.schema.json`）
- `control.events.json`
- `next-actions.execution.json`（记录 canonical DSL 执行轨迹）
- `perf.diff.json`（如适用）
- `ssot-drift.report.json`（如适用）

### 自治闭环 gate 产物（examples）

当 `examples/logix/scripts/cli-autonomous-loop.mjs` 作为 `self-bootstrap-readiness@examples-real` 门禁执行时，必须额外产出：

- `verdict.json`（统一裁决对象，含 `finalVerdict`、`decision.finalReasonCode`、`decision.chain`）
- `checksums.sha256`（证据包 SHA256 清单，至少覆盖 `verify-loop.report.json` 与 `verdict.json`）

默认输出根目录：`.artifacts/autonomous-loop/` 或 `.artifacts/examples-real/`。

## Report Schema（字段级）

`verify-loop.report.json` 必须字段级可校验，并默认 unknown-field fail-fast：  
根对象与 `gateResults[]/reasons[]/nextActions[]/artifacts[]` 均 `additionalProperties: false`（扩展数据仅允许放入 `ext`）。

必填字段：

- `schemaVersion=1`, `kind=VerifyLoopReport`
- 稳定标识链：`runId`, `instanceId`, `txnSeq`, `opSeq`, `attemptSeq`
- 模式链路：`mode`（`run|resume`）以及 `previousRunId`（resume 必填）
- 门禁分层：`gateScope`（`runtime|governance`）且 `gateResults[].gate` 必须匹配对应分层允许集合
- `verdict`, `exitCode`
- `gateResults[]`（按门禁顺序输出，且每项必须含 `gate/status/command/exitCode/durationMs`）
- `reasonCode`, `reasons[]`
- `nextActions[]`（canonical DSL：`id/action/args`）
- `artifacts[]`
