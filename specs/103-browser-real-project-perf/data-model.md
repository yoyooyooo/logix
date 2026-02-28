# Data Model: 真实项目 Browser 模式性能集成测试基线

## 1. ScenarioSuite

- Purpose: 定义一个可独立运行、可比较的业务性能场景。
- Fields:
  - `id` (string): 全局唯一场景标识。
  - `title` (string): 人类可读标题。
  - `priority` (`P1` | `P2` | `P3`): 场景优先级。
  - `primaryAxis` (string): 主加压维度。
  - `axes` (record<string, primitive[]>): 参数维度与档位。
  - `metrics` (string[]): 指标名集合。
  - `budgets` (Budget[]): 预算定义。
  - `requiredEvidence` (string[]): 必备证据字段。

## 2. Budget

### 2.1 AbsoluteBudget

- Fields:
  - `type` = `absolute`
  - `metric` (string)
  - `p95Ms` (number)
  - `id` (optional string)

### 2.2 RelativeBudget

- Fields:
  - `type` = `relative`
  - `metric` (string)
  - `maxRatio` (number)
  - `minDeltaMs` (optional number)
  - `numeratorRef` (string)
  - `denominatorRef` (string)
  - `id` (optional string)

## 3. PerfRun

- Purpose: 一次完整采样执行结果。
- Fields:
  - `schemaVersion` (number)
  - `meta`:
    - `createdAt`
    - `matrixId`
    - `config` (`runs/warmupDiscard/timeoutMs/profile/stability`)
    - `env` (`os/arch/node/browser/headless`)
  - `suites` (SuiteResult[])

## 4. SuiteResult

- Fields:
  - `id/title/priority/primaryAxis`
  - `points` (PointResult[])
  - `thresholds` (ThresholdResult[])
  - `metricCategories` (record<string, `e2e` | `runtime` | `diagnostics` | `workflow`>)

## 5. PointResult

- Fields:
  - `params` (record<string, primitive>)
  - `status` (`ok` | `timeout` | `failed` | `skipped`)
  - `reason` (optional string)
  - `metrics` (MetricResult[])
  - `evidence` (EvidenceResult[])

## 6. PerfDiff

- Purpose: before/after 对比产物。
- Fields:
  - `meta.comparability`:
    - `comparable` (boolean)
    - `configMismatches` (string[])
    - `envMismatches` (string[])
    - `warnings` (string[])
  - `summary`:
    - `regressions/improvements/budgetViolations`
  - `suites`:
    - `thresholdDeltas`
    - `metricDeltas`
    - `evidenceDeltas`
    - `recommendations`

## 7. Validation Rules

- `ScenarioSuite.id` 必须唯一。
- 所有 `budget.metric` 必须存在于 `metrics`。
- relative budget 的 ref 必须能在轴空间中解析到有效组合。
- PointResult 的 `status != ok` 时，相关 metric/evidence 必须给 unavailable reason。
- `PerfDiff.meta.comparability.comparable=false` 时，不允许输出硬门结论（由流程层保证）。
