# Migration Ledger

## Purpose

记录每个被删除、降级或 allowlist 的 public surface 对应的迁移说明。

## Entries

| Surface | Disposition | Affected Consumers | Replacement Or No Replacement | Docs/Examples Cleared | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Module.implement(...)` | `remove` | `packages/logix-core/test/**`, `packages/logix-test/**`, `packages/logix-sandbox/test/browser/**` | `Program.make(...)`；内部确需旧 `ProgramRuntimeBlueprint` 记录时只保留为历史 removal witness，当前实现口径使用 internal `ProgramRuntimeBlueprint` | `yes` | `130` | `completed` |
| `Runtime.trial(...)` | `remove` | `packages/logix-core/test/observability/**`, `packages/logix-core/test/Contracts/Contracts.045.*` | canonical 默认路径改为 `runtime.trial`；core 自测若需 generic effect trial，改走 internal backing import | `yes` | `130` | `completed` |
| `Runtime.trial(...)` | `remove` | `examples/logix-sandbox-mvp/**`, `packages/logix-sandbox/public/sandbox/**`, `packages/logix-core/test/TrialRunArtifacts/**`, `packages/logix-core/test/observability/**` | canonical 默认路径改为 `runtime.trial` facade；internal backing 仅供 core 内部测试/实现使用 | `yes` | `130` | `completed` |
| `CoreReflection.verifyKernelContract / verifyFullCutoverGate` 作为默认验证入口 | `expert-only` | `packages/logix-core/test/Contracts/Contracts.045.*` | 保留 expert 路由；默认验证入口迁到 `runtime.check / runtime.trial / runtime.compare` | `yes` | `130` | `completed` |
| CLI `trialrun` 命令面与 archived backend | `remove` | `packages/logix-cli/src/internal/commands/{trial.ts,trialRun.ts,describe.ts}`, `packages/logix-cli/src/internal/args.ts`, `packages/logix-cli/src/Commands.ts`, matching CLI tests | `logix trial` + final `runtime.trial` contract | `yes` | `130` | `completed` |
| sandbox `trialRunModule` 默认 client/service surface | `remove` | `packages/logix-sandbox/src/{Client.ts,Service.ts}`, `packages/logix-sandbox/public/sandbox/**`, browser tests, `examples/logix-sandbox-mvp/**` | final `runtime.trial` facade；不再保留 public compat wrapper | `yes` | `130` | `completed` |
| `@logixjs/core` root export 中的 mixed `Observability` / `Reflection` 默认心智 | `rename-to-explicit-role` | `packages/logix-core/src/index.ts`, docs, examples, consumers | root barrel 仅保留显式分类后的 `expert-only` / `control-plane-only` 角色说明；`Observability` 不再公开试跑 helper | `yes` | `130` | `completed` |

## Gate

- 每个 breaking surface 都必须有一条迁移记录。
- 若任一条目缺 replacement/no-replacement、affected consumers、owner 或 status，则 final cutover 不通过。
