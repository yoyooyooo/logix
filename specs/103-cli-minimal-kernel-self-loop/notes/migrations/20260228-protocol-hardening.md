---
migrationId: MIG-20260228-protocol-hardening
spec: 103-cli-minimal-kernel-self-loop
gate: gate:migration-forward-only
reasonCode: GATE_MIGRATION_FORWARD_ONLY_FAILED
breaking: true
owners:
  - '@logix-cli-maintainers'
---

# Migration: 103 协议核与 verify-loop 治理硬化

## Breaking Summary

- `CommandResult@v2`、`verify-loop input/report`、`extension-manifest` 以及 reason catalog 在本次收敛中执行了 forward-only 强化，旧调用方必须按新契约迁移。

## Protocol/Behavior Mapping

| surfaceId | affectedPath | changeType | fromVersion | toVersion | operatorAction |
| --- | --- | --- | --- | --- | --- |
| contract.command-result.schema | specs/103-cli-minimal-kernel-self-loop/contracts/schemas/command-result.v2.schema.json | schema-break | v2-legacy | v2-strict | 更新 `CommandResult@v2` 断言，补齐稳定 ID 与 unknown-field fail-fast |
| contract.extension-manifest.schema | specs/103-cli-minimal-kernel-self-loop/contracts/schemas/extension-manifest.v1.schema.json | schema-break | v1-legacy | v1-strict | 扩展清单需适配新 fail-fast 约束 |
| contract.verify-loop.input.schema | specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.input.v1.schema.json | schema-break | v1-legacy | v1-strict | 调整 run/resume 输入，确保 `previousRunId` 与轨迹语义一致 |
| contract.verify-loop.report.schema | specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.report.v1.schema.json | schema-break | v1-legacy | v1-strict | 对齐 `gateScope` 分层、`verdict/exitCode` 一致性与 artifacts 字段 |
| contract.reason-catalog | specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md | reason-catalog-break | legacy-set | strict-set | reason code 仅允许登记集合，旧自定义码需补登记 |
| runtime.verify.gates | packages/logix-cli/src/internal/verify-loop/gates.ts | behavior-break | legacy-gates | runtime-governance-partitioned | runtime/governance gate 分层固定化，调用方需按 scope 运行 |
| runtime.verify.state-machine | packages/logix-cli/src/internal/verify-loop/stateMachine.ts | behavior-break | legacy-machine | strict-machine | 退出码与 verdict 映射按新状态机更新 |

## Upgrade Steps

1. 升级调用方对 `CommandResult@v2` 的 schema 校验，显式处理 `nextActions` 与稳定标识链。
2. 按 `contracts/verify-loop.md` 调整 `verify-loop run/resume` 输入，禁止沿用旧参数组合。
3. 把所有自定义 `reasonCode` 先补入 `contracts/reason-catalog.md`，再更新实现。
4. 执行 `pnpm run check:forward-evolution -- --base <baseRef>` 并确认 `gate:migration-forward-only` 通过。

## Failure Guidance

- 症状：CI 在 governance gate 阶段失败，reasonCode=`GATE_MIGRATION_FORWARD_ONLY_FAILED`。
- 常见原因：
  - 修改了协议/行为 surface，但未更新迁移说明；
  - 修改 schema 但未 bump 版本指针；
  - 迁移说明缺少必须章节或 front matter 键。
- 处理：按本文件模板补齐迁移说明并补齐版本提升后重跑 governance gates。

## Verification Evidence

- `pnpm run check:forward-evolution -- --base <baseRef>`
- `pnpm run check:ssot-alignment -- --base <baseRef>`
- `pnpm run check:perf-evidence -- --base <baseRef>`
