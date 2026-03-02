# Quickstart: 103-cli-minimal-kernel-self-loop

## 目标

演示外部 Agent 如何基于 CLI 控制面完成一次最小闭环，并覆盖治理检查的失败演练。

## 0) 预备

```bash
pnpm -C packages/logix-cli build
mkdir -p .artifacts/bootstrap-loop
```

## 1) 能力探测

```bash
logix describe --json --runId qs-001 --out .logix/out
```

预期：返回 `CommandResult@v2`，包含协议版本、命令可用性与扩展能力快照。

## 2) 执行基础命令

```bash
logix ir export --entry examples/logix-cli-playground/src/entry.basic.ts#AppRoot --runId qs-002 --out .logix/out
```

预期：返回稳定结果与 artifacts，含可重放 refs。

## 3) 运行 verify-loop

```bash
logix verify-loop \
  --runId qs-003 \
  --target packages/logix-cli \
  --out .logix/out
```

预期：仅执行 runtime gates（`gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol`），输出 `PASS|VIOLATION|RETRYABLE|NO_PROGRESS`。

## 4) 无人闭环（bootstrap-loop）

```bash
node specs/103-cli-minimal-kernel-self-loop/scripts/bootstrap-loop.mjs \
  --runIdPrefix qs-bootstrap \
  --gateScope runtime \
  --target fixture:retryable \
  --maxRounds 3 \
  --maxAttempts 3 \
  --outDir .artifacts/bootstrap-loop \
  --auditFile .artifacts/bootstrap-loop/bootstrap-loop.audit.json
```

预期：

- 至少 2 轮 attempt（第一轮 `RETRYABLE`，后续收敛为 `PASS`）；
- 自动读取 `nextActions` 推进下一轮；
- unknown action / 缺少必填 `args` 直接 fail-fast（非零退出），不允许硬编码 fallback；
- 审计文件落盘，包含 `runId/reasonCode/attempt/verdict`。

## 5) 自治闭环 gate（examples）

```bash
node examples/logix/scripts/cli-autonomous-loop.mjs \
  --runIdPrefix qs-autonomous \
  --outDir .artifacts/autonomous-loop \
  --entry virtual/basic.ts#AppRoot \
  --verifyTarget fixture:pass \
  --gateScope runtime \
  --maxAttempts 3
```

说明：

- 脚本路径：`examples/logix/scripts/cli-autonomous-loop.mjs`；
- 默认输出目录：`.artifacts/autonomous-loop`；
- 核心产物：
  - `verdict.json`：自治闭环最终裁决（含 canonical DSL 决策链 `decision.chain`、`finalVerdict`、`finalReasonCode`）；
  - `checksums.sha256`：证据包的 SHA256 清单（用于 CI/本地一致性核验）。

与 CI `verify-autonomous-loop` 的关系：

- CI job `verify-autonomous-loop`（`.github/workflows/ci.yml`）执行的命令是 `node examples/logix/scripts/cli-autonomous-loop.mjs`；
- 本地执行与 CI 同命令，同样要求 `finalVerdict=PASS`（进程退出码 `0`），否则返回非零退出码并阻断门禁。

## 附录 A（内部）：场景级 primitives 编排（scenario-playbook）

```bash
node specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs \
  --input specs/103-cli-minimal-kernel-self-loop/contracts/examples/s01.playbook.json \
  --outDir .artifacts/scenario-s01 \
  --repoRoot .

node specs/103-cli-minimal-kernel-self-loop/scripts/scenario-playbook-runner.mjs \
  --input specs/103-cli-minimal-kernel-self-loop/contracts/examples/s08.playbook.json \
  --outDir .artifacts/scenario-s08 \
  --repoRoot .
```

说明（内部）：

- 该链路用于 CLI 维护者发现 primitives 缺口，不属于用户默认使用路径。
- 仍然只编排现有 primitives，不新增 CLI 子命令。

预期：

- 产出 `scenario-playbook.report.json`、`scenario.verdict.json`、`checksums.sha256`；
- 当 verdict 非 `PASS` 时，命中映射会产出 `scenario.remediation-actions.json`；
- `s08.playbook` 会额外产出 `scenario-fixtures.report.json`（fixture adapter 协议化）。

## 6) 治理检查（当前 gateScope=governance；3 个 gate + 1 个 guard）

`verify-loop` 的 `gateScope=governance` 只覆盖 3 个 governance gate（`migration/ssot/perf`）。  
`check:protocol-antipatterns` 是并行治理 guard，不属于 verify-loop gate 集合。

### 6.1 本地 worktree 口径（含未提交变更）

```bash
pnpm run check:forward-evolution
pnpm run check:ssot-alignment
pnpm run check:perf-evidence
pnpm run check:protocol-antipatterns
```

### 6.2 CI/PR 基线口径（提交区间）

```bash
pnpm run check:forward-evolution -- --base origin/main
pnpm run check:ssot-alignment -- --base origin/main
pnpm run check:perf-evidence -- --base origin/main
pnpm run check:protocol-antipatterns -- --base origin/main
```

预期：任一检查失败均阻断 CI，不走自动重试。

### 6.3 场景覆盖率阈值检查（CI 阻断，facts 产物驱动）

```bash
pnpm run check:scenario-coverage
```

预期：

- 执行顺序：`verify:scenario-suite-p0p1` -> `check:scenario-coverage-facts`；
- `scenario-suite` 产出 `.artifacts/scenario-suite-p0p1/verification.bundle.json`；
- facts checker 以 `verification.bundle.json` 为唯一输入源，默认阈值 `maxMissing=0`、`maxPartial=0`、`minCovered=4`；
- 任一阈值不达标时返回非零退出码并阻断 CI。

## 7) 处理 nextActions

Phase 10 起，`nextActions` 采用 canonical DSL（`id/action/args`），bootstrap/autonomous 必须直接消费 DSL，不再维护硬编码参数映射。

```bash
logix verify-loop \
  --mode run \
  --runId qs-nextactions-001 \
  --target fixture:retryable \
  --emitNextActions .artifacts/bootstrap-loop/next-actions.run.json \
  --out .logix/out

logix next-actions exec \
  --dsl .artifacts/bootstrap-loop/next-actions.run.json \
  --engine bootstrap \
  --strict
```

预期：`next-actions` 执行器逐条消费 `action+args` 并生成可回放执行报告；缺少 `args` 或未知 `action` 直接 fail-fast。

## 8) 失败演练

### 8.1 runtime 失败演练

```bash
# 违规（VIOLATION）
logix verify-loop --runId qs-vio --mode run --target fixture:violation --out .logix/out

# 可重试（RETRYABLE）
logix verify-loop --runId qs-retry --mode run --target fixture:retryable --out .logix/out

# 无进展（NO_PROGRESS）
logix verify-loop --runId qs-np --mode run --target fixture:no-progress --maxAttempts 2 --out .logix/out
```

### 8.2 治理分层失败演练（gateScope=governance；3 gate + 1 guard）

- `gate:migration-forward-only`：改动 `contracts/schemas/*.json` 或 `packages/logix-cli/src/internal/verify-loop/*.ts`，但不新增/更新 `notes/migrations/*.md`。
- `gate:ssot-drift`：改动 `packages/logix-cli/src/**` 或 `specs/103.../contracts/**`，但不更新 `spec.md/plan.md/quickstart.md` 或 `docs/ssot/**`。
- `gate:perf-hard`：提交一个 `diff.latest.json` 中 `comparable=false` 或 `summary.regressions>0` 的 perf 证据。
- `check:protocol-antipatterns`：新增随机稳定 ID（`instanceId=Math.random()`）或把多种 verdict 粗暴映射为 `exitCode=1`。

## 9) Phase 10 实操（真实执行器 + identity + extension + examples-real）

### 9.1 verify-loop 真实 gate 执行器（runtime/governance）

```bash
logix verify-loop \
  --mode run \
  --runId qs-real-runtime-001 \
  --target packages/logix-cli \
  --gateScope runtime \
  --executor real \
  --out .logix/out

logix verify-loop \
  --mode run \
  --runId qs-real-governance-001 \
  --target packages/logix-cli \
  --gateScope governance \
  --executor real \
  --out .logix/out
```

预期：两次都执行真实命令；`runtime` 仅含 `type/lint/test/control-surface-artifact/diagnostics-protocol`，`governance` 仅含 `migration-forward-only/ssot-drift/perf-hard`。

### 9.2 run/resume identity 单一真相源校验

```bash
logix verify-loop --mode run --runId qs-id-run-001 --target fixture:retryable --out .logix/out
logix verify-loop --mode resume --runId qs-id-resume-002 --previousRunId qs-id-run-001 --instanceId <from-previous-report> --target fixture:pass --out .logix/out
```

预期：`instanceId` 保持一致，`attemptSeq` 递增，`txnSeq/opSeq` 只允许前进不允许重置；若传入漂移 identity，必须返回 `VIOLATION`。

### 9.3 extension 控制面最小接线（validate/load/reload/status + stateFile）

```bash
logix extension validate --manifest .logix/extensions/extension.manifest.json
logix extension load --manifest .logix/extensions/extension.manifest.json --stateFile .logix/state/extensions.state.json
logix extension reload --stateFile .logix/state/extensions.state.json
logix extension status --stateFile .logix/state/extensions.state.json --json
```

预期：四个命令均输出 `CommandResult@v2`；`reload/status` 只使用 `stateFile` 作为状态真相源。

### 9.4 examples/CI 里程碑：self-bootstrap-readiness@examples-real

```bash
node examples/logix/scripts/cli-autonomous-loop.mjs \
  --runIdPrefix qs-examples-real \
  --outDir .artifacts/examples-real \
  --entry examples/logix/src/runtime/root.impl.ts#RootImpl \
  --verifyTarget examples:real \
  --gateScope runtime \
  --maxAttempts 4

pnpm run verify:self-bootstrap-readiness-examples-real
```

预期：`decision.chain` 至少包含 `run`，若 canonical DSL 决策继续执行则追加 `resume/rerun`；最终 `finalVerdict=PASS`，并产出 `.artifacts/examples-real/verdict.json` 与 `.artifacts/examples-real/checksums.sha256`；CI 同名 job 失败即阻断。
