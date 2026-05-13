# Canonical Adapter Split

| Slice | Current Location | Target Location | Notes |
| --- | --- | --- | --- |
| `route-entry` | `internal/observability/trialRunModule.ts` | keep in same file | 仅保留入口编排 |
| `environment` | `internal/observability/trialRunModule.ts` | `internal/observability/trialRunEnvironment.ts` | 若现有文件继续过厚则拆出 |
| `error-mapping` | `internal/observability/trialRunModule.ts` | `internal/observability/trialRunErrors.ts` | timeout / dispose / missing dependency 解释 |
| `report` | `internal/observability/trialRunModule.ts` + `trialRunReportPipeline.ts` | `internal/observability/trialRunReport.ts` 或保持现状 | 视厚度决定 |
| `artifact` | `internal/observability/trialRunModule.ts` + `artifacts/**` | 保持或局部整理 | 不得反向吞回 proof-kernel |

## Rule

- 拆分后的任何文件都不得重新创建 session、collector 或 shared layer wiring
- 若无法一句话说明新文件职责，继续拆

## Current Assessment

### 2026-04-08

- `trialRunModule.ts` 当前 524 LOC
- 第一批优先拆分候选：
  - `environment`
  - `error-mapping`
- 第二批视厚度决定：
  - `report`
  - `artifact`

## Execution Snapshot

### 2026-04-08

- `trialRunModule.ts` 已压到 334 LOC
- 已落地：
  - `trialRunEnvironment.ts`
  - `trialRunErrors.ts`
- 当前仍在主文件内的职责：
  - route-entry
  - kernel boot / close 协调
  - report / artifact re-export orchestration
- 结论：第二批 `report / artifact` 拆分暂不强制，可作为后续进一步压缩点
- 结构 gate 已要求 `trialRunModule.ts` 继续通过 `./trialRunEnvironment` 与 `./trialRunErrors` 消费已拆出的 slice
