# @logixjs/cli

`logix-cli` 是给 Agent 与开发者使用的 **Logix 控制面 CLI（Tool Plane）**。  
它不负责“代替 Agent 做决策”，而是提供可执行命令与机器可读结果。

English version: [README.md](./README.md)

## CLI 存在的意义

这个 CLI 的目标是给 Agent 交付闭环提供确定性、可机器消费的信号。

- 暴露可直接调用的基础命令（primitives）。
- 输出结构化协议结果（`CommandResult@v2` + artifacts）。
- 不接管 Agent 的记忆与高阶决策策略。

## 核心原则

武器优先，不做黑盒框架：

- 基础命令必须可直接调用
- 默认让 Agent 自己决策
- `verify-loop` 仅是可选编排层，不是唯一入口

## 推荐路径（Primitives-first）

1. 先用 `describe --json` 探测当前命令真值。
2. 运行基础命令（`ir export`、`ir validate`、`trialrun` 等）。
3. 运行基础质量命令（`typecheck/lint/test`）。
4. Agent 基于退出码与产物自行决策下一步。
5. 仅在需要统一编排时启用 `verify-loop`。

## Runner

优先用源码 runner（开发态）：

```bash
LOGIX_RUNNER="node --import tsx/esm packages/logix-cli/src/bin/logix.ts"
```

如果要用 dist runner（发布态）：

```bash
pnpm -C packages/logix-cli build
LOGIX_RUNNER="node packages/logix-cli/dist/bin/logix.js"
```

## 渐进式使用

### Level 1：基础命令能力发现

```bash
$LOGIX_RUNNER describe --runId readme-001 --json --out .artifacts/logix-cli/describe
```

建议把 `describe.report.json` 作为当前会话的命令真值快照。
其中还包含 `agentGuidance.verificationChains`，可直接给 Agent 提供常见验证链的 primitives 组合提示，以及由命令契约自动推导的期望输出键和 artifact 文件名。

核心命令：

- `describe`
- `ir export`
- `ir validate`
- `ir diff`
- `trialrun`
- `verify-loop`
- `next-actions exec`
- `transform module`
- `anchor autofill`
- `extension validate`
- `extension load`
- `extension reload`
- `extension status`

兼容入口（已合并，返回 `E_CLI_COMMAND_MERGED`）：

- `contract-suite run` -> 建议改用 `ir validate --profile contract`
- `spy evidence` -> 建议改用 `trialrun --emit evidence`
- `anchor index` -> 建议改用 `ir export --with-anchors`

### Level 2：仅用基础命令完成自治闭环

这一层不依赖 `verify-loop`。

Step A：用 Logix 命令产生机器信号。

```bash
$LOGIX_RUNNER ir export \
  --runId primitive-ir-export-001 \
  --entry examples/logix/src/scenarios/basic/entry.ts#AppRoot \
  --out .artifacts/logix-cli/primitive/ir-export

$LOGIX_RUNNER ir validate \
  --runId primitive-ir-validate-001 \
  --in .artifacts/logix-cli/primitive/ir-export \
  --profile contract \
  --out .artifacts/logix-cli/primitive/ir-validate

$LOGIX_RUNNER trialrun \
  --runId primitive-trialrun-001 \
  --entry examples/logix/src/scenarios/basic/entry.ts#AppRoot \
  --emit evidence \
  --out .artifacts/logix-cli/primitive/trialrun
```

Step B：直接调用基础质量命令。

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

Step C：Agent 根据以下信息自行推进下一轮：

- 进程退出码
- `CommandResult@v2` 字段（`reasonCode`、`reasons[]`、`artifacts[]`）
- `.artifacts/*` 产物
- 如启用内部场景脚手架：`scenario-playbook.report.json` + `scenario.verdict.json`（失败时额外 `scenario.remediation-actions.json`）

### Level 3：可选 `verify-loop` 编排

当你需要统一 verdict、重试策略、run/resume identity 链时再启用。

```bash
$LOGIX_RUNNER verify-loop \
  --runId verify-run-001 \
  --mode run \
  --target packages/logix-cli \
  --gateScope runtime \
  --executor real \
  --emitNextActions .artifacts/logix-cli/verify/next-actions.json \
  --out .artifacts/logix-cli/verify

$LOGIX_RUNNER next-actions exec \
  --runId verify-run-002 \
  --dsl .artifacts/logix-cli/verify/next-actions.json \
  --engine bootstrap \
  --strict \
  --out .artifacts/logix-cli/verify-next
```

`--executor real` 下的 runtime gate 与命令映射：

- `gate:type` -> `pnpm typecheck`
- `gate:lint` -> `pnpm lint`
- `gate:test` -> `pnpm test:turbo`
- `gate:control-surface-artifact` -> `pnpm -C packages/logix-cli test`
- `gate:diagnostics-protocol` -> `pnpm -C packages/logix-cli test -- test/Contracts`

governance gate 与命令映射：

- `gate:perf-hard` -> `pnpm run check:perf-evidence`
- `gate:ssot-drift` -> `pnpm run check:ssot-alignment`
- `gate:migration-forward-only` -> `pnpm run check:forward-evolution`

## 协议

### `CommandResult@v2` 标准字段

- `schemaVersion=2`
- `kind=CommandResult`
- `runId/instanceId/txnSeq/opSeq/attemptSeq`
- `command/ok/exitCode/reasonCode/reasonLevel/reasons[]`
- `artifacts[]`
- `nextActions[]`
- `trajectory[]`

### 退出码语义（`CommandResult@v2`）

- `0`: `PASS`
- `1`: `ERROR`
- `2`: `VIOLATION`
- `3`: `RETRYABLE`
- `4`: `NOT_IMPLEMENTED`
- `5`: `NO_PROGRESS`

## 常见故障定位

- `CLI_MISSING_RUNID`：所有命令必须显式传 `--runId`
- `CLI_INVALID_ARGUMENT`：参数名/参数值不合法（常见于 `--entry`、`--mode`、`--target`）
- `E_CLI_COMMAND_MERGED`：调用了兼容入口，改用建议替代命令
- `CLI_PROTOCOL_VIOLATION`：协议字段非法、identity 漂移或 gate 结果不合法
- `VERIFY_RETRYABLE` / `VERIFY_NO_PROGRESS`：自动重试阶段的可重试/无进展分流

## 内部附录：Scenario Harness（用于 CLI 缺口发现）

`scenario-playbook` / `scenario-suite` 仅用于 CLI 维护者内部发现基础命令能力缺口，不会新增用户可见子命令。

示例：

```bash
pnpm run verify:scenario-suite-p0p1
pnpm run check:scenario-coverage-facts
```
