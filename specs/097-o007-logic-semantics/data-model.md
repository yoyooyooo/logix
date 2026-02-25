# Data Model: O-007 Canonical Logic Execution

## 概览

本特性不引入业务数据模型，新增的是 runtime 内核执行语义模型。

## 核心实体

### 1. RawLogicInput

- 含义：`Module.logic(...)` 产出的原始 logic 输入。
- 形态：
  - 单相 `Effect`；
  - 直接 `LogicPlan`；
  - 可解析为 plan 的 effect（legacy marker 形态）。

### 2. CanonicalLogicPlan

- 含义：执行层唯一接收的标准结构。
- 字段：
  - `setup: Effect<void, E, R>`
  - `run: Effect<void, E, R>`
  - `phaseRef: { current: 'setup' | 'run' }`
  - `skipRun?: boolean`（仅用于 phase 违规降级语义）

### 3. LogicNormalizationResult

- 含义：normalize 阶段产物。
- 字段：
  - `plan: CanonicalLogicPlan`
  - `logicUnit`: 逻辑诊断上下文（moduleId/index 等）
  - `sourceKind`: `single-phase | plan | plan-effect`

### 4. LogicPhaseDiagnostic

- 含义：phase 违规的结构化诊断载荷。
- 关键字段：
  - `code: logic::invalid_phase`
  - `kind`、`api`、`phase`
  - `moduleId`、`message`、`hint`

## 状态迁移

1. `raw logic` -> normalize -> `CanonicalLogicPlan`
2. 设置 `phaseRef.current = setup` 执行 `setup`
3. 若 `skipRun=false`，切换 `phaseRef.current = run` 并 fork `run`
4. 生命周期继续：`lifecycle.runStart` + `Effect.yieldNow`

## 不变量

- 执行层不直接处理 raw logic，必须先 normalize。
- setup/run 边界固定，不允许 run-only API 在 setup 执行。
- 诊断载荷必须 Slim 且可序列化。
- stable identity（instanceId/txnSeq/opSeq）不得因本特性漂移。
