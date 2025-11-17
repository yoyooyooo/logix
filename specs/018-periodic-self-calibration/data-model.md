# 018 定期自校准 · Data Model

本文件描述“校准/推荐”在系统内的最小数据模型（用于持久化、导出与对比复现）。

## 1) CalibrationPolicy（策略配置）

用于描述“是否启用 + 何时触发 + 评估/安全阈值 + 候选空间”的配置快照。

- `schemaVersion`: number（策略 schema 版本）
- `enabled`: boolean（是否启用自校准；默认 false）
- `autoApply`: boolean（是否自动将推荐作为应用侧覆盖生效；默认 false）
- `minIntervalMs`: number（两次校准最短间隔）
- `ttlMs`: number（推荐过期时间；到期视为需要重校准）
- `interactionGuardMs`: number（交互活跃判定窗口，例如最近 N ms 有输入则暂停）
- `maxCalibrationDurationMs`: number（单次校准总时长上限）
- `workloads`: Array<{ `id`: string; `kind`: "synthetic" | "ui"; `weight`?: number }>
- `candidates`: Array<{ `id`: string; `stateTransaction`: { `traitConvergeMode`: "auto" | "full"; `traitConvergeBudgetMs`?: number; `traitConvergeDecisionBudgetMs`?: number } }>
- `safety`: { `rejectDegraded`: boolean; `maxP95RegressionRatio`: number; `minMedianImprovementMs`?: number; `minSamples`: number }
- `scope`: { `moduleId`?: string | "global" }（可选：按 moduleId 覆盖/全局覆盖）

## 2) CalibrationEnv（运行环境摘要）

用于把一次推荐和“适用范围/可比性”绑定，避免跨环境误用。

- `userAgent`: string
- `hardwareConcurrency`?: number
- `deviceMemoryGb`?: number
- `platform`?: string
- `screen`?: { `width`: number; `height`: number; `devicePixelRatio`: number }
- `timezoneOffsetMinutes`: number

> 说明：此处允许使用“时间”作为元信息，但不得作为唯一稳定锚点。

## 3) CalibrationRun（一次校准运行）

一次校准的全过程记录（可用于 UI 展示、导出、复现与审计）。

- `schemaVersion`: number
- `kind`: "libraryAudit" | "runtimeCalibration"（本次运行属于“库侧审计”还是“用户侧自校准”）
- `runId`: string（稳定 runId：建议 `tuningId + runSeq`）
- `runSeq`: number（localStorage 单调序号）
- `createdAt`: string（ISO 时间，仅元信息）
- `policy`: CalibrationPolicy（运行时的策略快照）
- `env`: CalibrationEnv
- `baseline`: CandidateEval（baseline 的评估结果）
- `candidates`: Array<CandidateEval>
- `recommendation`: Recommendation | null
- `status`: "running" | "completed" | "cancelled" | "failed"
- `error`?: { `message`: string; `kind`?: string }

## 4) CandidateEval（候选评估结果）

单个候选在一次校准中的评估摘要（以 017/014 口径为准）。

- `id`: string（候选 id）
- `stateTransaction`: CalibrationPolicy["candidates"][number]["stateTransaction"]
- `ok`: boolean
- `workloadCoverage`: Array<{ `id`: string; `status`: "ok" | "unavailable" | "skipped"; `reason`?: string }>
- `metrics`: {
    `commitWallTimeMs`?: { `n`: number; `median`: number; `p95`: number }
    `executionDurationMs`?: { `n`: number; `median`: number; `p95`: number }
  }
- `converge`: {
    `executedMode`?: "auto" | "full"
    `outcome`?: "Ok" | "Degraded"
    `reasons`?: string[]
    `staticIrStepCount`?: number
  }
- `notes`?: string[]

## 5) Recommendation（推荐产物）

推荐配置本身，以及“为什么推荐/如何回退/置信度”。

- `schemaVersion`: number
- `sourceRunId`: string
- `recommendedDefault`: { `stateTransaction`: CandidateEval["stateTransaction"] }
- `configScope`: "libraryDefaults" | "provider" | "runtimeOptions"（生效方式：库默认值建议更新 / 应用侧覆盖）
- `confidence`: "high" | "medium" | "low"
- `uncertainty`: Array<{ `kind`: string; `detail`: string }>
- `fallback`: { `kind`: "baseline" | "builtin"; `reason`: string }
