# Kernel Zone Map

## Snapshot

- Date: 2026-04-06
- Source anchors: `docs/ssot/runtime/02-hot-path-direction.md`, `specs/115-core-kernel-extraction/inventory/kernel-zone-map.md`
- Goal: 统一 hot-path 视角下的 kernel / shell / control plane / process / runner 边界

## Zone Ledger

| Zone | Primary Code Roots | steady-state | Allowed In Main List | Notes |
| --- | --- | --- | --- | --- |
| `kernel` | `packages/logix-core/src/internal/runtime/core/**`，排除 `core/process/**` 与 `core/runner/**` | yes | yes | steady-state 主线只认这一层，不新开第二 kernel 目录 |
| `runtime-shell` | `packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Logic.ts`、`packages/logix-core/src/internal/runtime/**` 中非 `core/**` 的外层协调代码 | no | no | 装配、外层协调和公开壳层 |
| `control plane` | `packages/logix-core/src/internal/evidence-api.ts`、`packages/logix-core/src/internal/reflection-api.ts`、`packages/logix-core/src/internal/observability/**`、`packages/logix-core/src/internal/debug/**` | no | no | 诊断、trial、report、diff 不进入 steady-state 主清单 |
| `process` | `packages/logix-core/src/internal/runtime/core/process/**` | no | no | process runtime 靠近 core，但不计入 steady-state 主清单 |
| `runner` | `packages/logix-core/src/internal/runtime/core/runner/**`、`packages/logix-core/src/internal/runtime/ProgramRunner*.ts` | no | no | root runner / openProgram / runProgram 属于外层运行协调 |

## Audit Notes

- `ProgramRunner` 不再按 `kernel` 解读，它属于 shell / runner 协调面
- `process` 在目录上贴近 `core/**`，职责上仍独立，不可借路径贴近重新混入主热链路
- `DebugSink` 等观测能力即使落在 `core/**`，仍按 control plane / observability 解释
