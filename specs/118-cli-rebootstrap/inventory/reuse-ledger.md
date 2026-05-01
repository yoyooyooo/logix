# Inventory: Reuse Ledger

## Goal

登记新命令面可直接复用的 helper、artifact 处理与旧测试资产。

## Reuse Candidates

| Path | Kind | Reuse Mode | Why |
| --- | --- | --- | --- |
| `packages/logix-cli/src/internal/output.ts` | helper | keep | 已处理 JSON 落盘与 stdin 读取 |
| `packages/logix-cli/src/internal/result.ts` | helper | keep | 已有结构化 `CommandResult` |
| `packages/logix-cli/src/internal/artifacts.ts` | artifact | keep | 已支持 artifact output / inline / budget |
| `packages/logix-cli/src/internal/stableJson.ts` | helper | keep | 已提供稳定 JSON 序列化与 digest |
| `packages/logix-cli/src/internal/commands/irValidate.ts` | helper | move | 可作为 `check` 的底层执行器 |
| `packages/logix-cli/src/internal/commands/irDiff.ts` | helper | move | 可作为 `compare` 的底层执行器 |
| `packages/logix-cli/test/Integration/cli.ir-validate.fields.test.ts` | test | move | 可映射为 `check.command.test.ts` 的字段契约基线 |
| `packages/logix-cli/test/Integration/cli.ir-diff.fields.test.ts` | test | move | 可映射为 `compare.command.test.ts` 的字段契约基线 |
| `packages/logix-cli/test/Integration/cli.describe-json.test.ts` | test | split | 仍可保留 describe，但不属于主命令面验证 |

## Immediate Rule

- 新命令面优先套现有 helper
- 不为 `check / compare` 再造第二套 artifact / output helper
