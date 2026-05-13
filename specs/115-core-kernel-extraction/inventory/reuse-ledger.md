# Inventory: Reuse Ledger

## Goal

登记 `core` 与 `core-ng` 当前最值得直接保留、平移或拆分的实现与测试资产。

## Reuse Candidates

| Path | Kind | Reuse Mode | Owner Zone | Why |
| --- | --- | --- | --- | --- |
| `packages/logix-core/src/internal/runtime/core/ModuleRuntime*.ts` | `hot-path` | `keep` | `kernel` | 模块运行时主线已集中在 core |
| `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts` | `hot-path` | `keep` | `kernel` | kernel 主入口 |
| `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` | `hot-path` | `keep` | `kernel` | 事务边界核心模块 |
| `packages/logix-core/src/internal/runtime/core/TaskRunner.ts` | `hot-path` | `keep` | `kernel` | 任务执行核心 |
| `packages/logix-core/src/internal/runtime/core/process/**` | `hot-path` | `keep` | `process` | process 功能簇已独立成型 |
| `packages/logix-core/src/internal/observability/**` | `diagnostics` | `keep` | `observability` | verification/report/trial 主链已成型 |
| `packages/logix-core/src/internal/reflection/**` | `helper` | `keep` | `reflection` | manifest/static IR/control surface 主链已成型 |
| `packages/logix-core/src/internal/runtime/core/DebugSink*.ts` | `diagnostics` | `split` | `observability` | 实现仍在 core，需要职责归位到 observability |
| `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner*.ts` | `helper` | `split` | `runtime-shell` | 更偏运行协调层 |
| `packages/logix-core/src/internal/runtime/core/RuntimeServices.impls.coreNg.ts` | `helper` | `keep` | `kernel` | 当前 core/core-ng 过渡桥接点 |
| `packages/logix-core-ng/src/RuntimeServices.impls.ts` | `helper` | `move` | `kernel` | 作为 legacy runtime services 对照材料 |
| `packages/logix-core-ng/src/ExecVmEvidence.ts` | `diagnostics` | `move` | `observability` | 旧证据项适合被 observability 吸收 |
| `packages/logix-core/test/Contracts/Contracts.045.KernelActivation.test.ts` | `test` | `keep` | `kernel` | kernel 激活合同基线 |
| `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts` | `test` | `keep` | `kernel` | kernel 合同验证基线 |
| `packages/logix-core/test/Contracts/Contracts.048.NoCoreNgImports.test.ts` | `test` | `keep` | `kernel` | 主线禁依赖护栏 |
| `packages/logix-core/test/Runtime/Runtime.defaultKernel.core.test.ts` | `test` | `keep` | `kernel` | 默认 kernel 行为基线 |
| `packages/logix-core/test/Runtime/Runtime.rollbackKernel.core.test.ts` | `test` | `keep` | `kernel` | rollback 行为基线 |
| `packages/logix-core/test/Process/**` | `test` | `keep` | `process` | process 主线覆盖较完整 |
| `packages/logix-core/test/observability/**` | `test` | `keep` | `observability` | trial/evidence/report 覆盖较完整 |
| `packages/logix-core-ng/test/KernelContract.verifyKernelContract.test.ts` | `test` | `move` | `kernel` | 适合并入 support matrix 验收 |
| `packages/logix-core-ng/test/RuntimeServicesFallback.test.ts` | `test` | `move` | `kernel` | legacy runtime services 回退基线 |
| `packages/logix-core-ng/test/RuntimeServicesSelection.test.ts` | `test` | `move` | `kernel` | runtime services 迁移对照 |

## Immediate Rule

- `keep` 表示优先直接沿用
- `split` 表示实现保留，职责边界需要重新落位
- `move` 表示迁移为 support matrix 或相邻功能簇的材料
