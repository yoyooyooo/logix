# @logixjs/cli

`logix-cli` is the **Logix control-plane CLI (Tool Plane)** for developers and agents.  
It is not an agent runtime. It provides executable commands plus machine-readable protocol outputs.

Chinese version: [README.zh.md](./README.zh.md)

## Why This CLI Exists

The CLI exists to support agentic delivery loops with deterministic, machine-consumable signals.

- It exposes primitive commands directly.
- It emits structured protocol outputs (`CommandResult@v2` + artifacts).
- It does not own agent memory or high-level decision policy.

## Core Principle

Weapon-first, not framework-first:

- Keep primitive commands directly callable.
- Let agents decide by default.
- Use `verify-loop` only when you want a standardized orchestration layer.

## Recommended Path (Primitives-first)

1. Discover command truth via `describe --json`.
2. Run primitive commands (`ir export`, `ir validate`, `trialrun`, etc.).
3. Run base quality gates (`typecheck/lint/test`).
4. Let agent decide from exit codes + artifacts.
5. Use `verify-loop` only when standardized orchestration is useful.

## Runner

Source runner (dev mode):

```bash
LOGIX_RUNNER="node --import tsx/esm packages/logix-cli/src/bin/logix.ts"
```

Dist runner (build first):

```bash
pnpm -C packages/logix-cli build
LOGIX_RUNNER="node packages/logix-cli/dist/bin/logix.js"
```

## Progressive Usage

### Level 1: Primitive command capability

```bash
$LOGIX_RUNNER describe --runId readme-001 --json --out .artifacts/logix-cli/describe
```

Use `describe.report.json` as the session truth snapshot for command availability.
It also contains `agentGuidance.verificationChains`, which gives primitive-chain hints plus expected output keys and artifact filenames (derived from command contracts).

Primary commands:

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

Compatibility entries (merged, return `E_CLI_COMMAND_MERGED`):

- `contract-suite run` -> use `ir validate --profile contract`
- `spy evidence` -> use `trialrun --emit evidence`
- `anchor index` -> use `ir export --with-anchors`

### Level 2: Self-loop with primitive commands only

This path does not require `verify-loop`.

Step A: generate machine-readable signals from Logix commands.

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

Step B: run base quality commands directly.

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

Step C: agent decides next action from:

- command exit codes
- `CommandResult@v2` fields (`reasonCode`, `reasons[]`, `artifacts[]`)
- produced artifacts under `.artifacts/*`
- optional internal harness outputs (if used): `scenario-playbook.report.json` + `scenario.verdict.json` (+ `scenario.remediation-actions.json` when failed)

### Level 3: Optional orchestration with `verify-loop`

Use this only when you want standardized verdicts, retry policy, and run/resume identity chain.

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

Runtime gate mapping (when `--executor real`):

- `gate:type` -> `pnpm typecheck`
- `gate:lint` -> `pnpm lint`
- `gate:test` -> `pnpm test:turbo`
- `gate:control-surface-artifact` -> `pnpm -C packages/logix-cli test`
- `gate:diagnostics-protocol` -> `pnpm -C packages/logix-cli test -- test/Contracts`

Governance gate mapping:

- `gate:perf-hard` -> `pnpm run check:perf-evidence`
- `gate:ssot-drift` -> `pnpm run check:ssot-alignment`
- `gate:migration-forward-only` -> `pnpm run check:forward-evolution`

## Protocol

### `CommandResult@v2` core fields

- `schemaVersion=2`
- `kind=CommandResult`
- `runId/instanceId/txnSeq/opSeq/attemptSeq`
- `command/ok/exitCode/reasonCode/reasonLevel/reasons[]`
- `artifacts[]`
- `nextActions[]`
- `trajectory[]`

### Exit code mapping (`CommandResult@v2`)

- `0`: `PASS`
- `1`: `ERROR`
- `2`: `VIOLATION`
- `3`: `RETRYABLE`
- `4`: `NOT_IMPLEMENTED`
- `5`: `NO_PROGRESS`

## Troubleshooting

- `CLI_MISSING_RUNID`: every command requires explicit `--runId`
- `CLI_INVALID_ARGUMENT`: invalid option/value (`--entry`, `--mode`, `--target`, etc.)
- `E_CLI_COMMAND_MERGED`: compatibility entry; switch to replacement command
- `CLI_PROTOCOL_VIOLATION`: invalid protocol field, identity drift, or gate-contract violation
- `VERIFY_RETRYABLE` / `VERIFY_NO_PROGRESS`: retry flow branching

## Internal Appendix: Scenario Harness (for CLI gap discovery)

`scenario-playbook`/`scenario-suite` scripts are internal orchestration helpers used by CLI maintainers to discover primitive capability gaps. They do not add any user-facing command.

Example:

```bash
pnpm run verify:scenario-suite-p0p1
pnpm run check:scenario-coverage-facts
```
