# Inventory: Command Surface

## Goal

把新 CLI 的一级命令面压缩到 `check / trial / compare`，并记录旧命令当前仍占用的位置。

## Current Topology

| Surface | Current Paths | Current Role | Status |
| --- | --- | --- | --- |
| Root entry | `packages/logix-cli/src/bin/logix.ts`, `packages/logix-cli/src/Commands.ts` | 当前仍承接旧命令面分发 | needs-cutover |
| Legacy command cluster | `packages/logix-cli/src/internal/commands/{describe,irExport,irValidate,irDiff,trialRun,anchor*,transformModule,spyEvidence,contractSuiteRun}.ts` | 旧 IR / anchor / trialrun 心智仍是主组织方式 | needs-routing |
| Output helpers | `packages/logix-cli/src/internal/{output,result,artifacts,stableJson}.ts` | 已具备结构化结果与 artifact helper | reusable |

## Target Surface

| Command | Purpose | Primary Input | Primary Output |
| --- | --- | --- | --- |
| `check` | 静态快检，消费 manifest/artifact 或输入目录 | `--in` / `--artifact` | `RuntimeCheckReport` |
| `trial` | 受控试运行，消费 `--entry` | `--entry` | `RuntimeTrialReport` |
| `compare` | 比较 before/after 报告或 artifact | `--before` / `--after` | `RuntimeCompareReport` |

## Current Audit Notes

- `describe` 现在承担的是命令契约发现，不应继续作为 verification 主命令。
- `ir.validate` 与 `ir.diff` 已有可复用逻辑，可作为 `check` / `compare` 的最小落点。
- `trialrun` 目前还是旧命令名，且实现并未启用，需要新入口 `trial` 来接管。
