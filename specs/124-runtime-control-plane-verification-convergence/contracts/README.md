# Contracts: Runtime Control Plane Verification Convergence

## 1. Stage Contract

- `runtime.check`
- `runtime.trial`
- `runtime.compare`

## 2. Input Contract

- `fixtures/env`
- `steps`
- `expect`

## 3. Machine Report Contract

- `stage`
- `mode`
- `verdict`
- `errorCode`
- `summary`
- `environment`
- `artifacts`
- `repairHints`
- `nextRecommendedStage`
- `verdict` 固定为 `PASS / FAIL / INCONCLUSIVE`

## 4. Ownership Contract

- `@logixjs/core` 定义 control plane contract
- `@logixjs/cli` 定义 CLI route
- `@logixjs/test` 定义 test harness
- `@logixjs/sandbox` 定义 browser trial surface
- expert / archive route 不得反向长成第二主命令面
