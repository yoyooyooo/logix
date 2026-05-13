# Inventory: Support Matrix

## Goal

明确 `core` 与 `core-ng` 的能力归属，给 `merge-into-kernel` 路线一个稳定 support matrix。

## Matrix

| Contract / Capability | Core Status | Core-Ng Status | Notes |
| --- | --- | --- | --- |
| `RuntimeKernel` 主执行核 | `source-of-truth` | `removed` | 主线只认 `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts` |
| `ModuleRuntime` / 事务推进 | `source-of-truth` | `removed` | 关键热链路集中在 core |
| `TaskRunner` / 调度 | `source-of-truth` | `removed` | 调度核继续围绕 core |
| `RuntimeServices` 旧实现对照 | `adopted` | `legacy` | `core-ng` 只保留为迁移输入与对照材料 |
| `Kernel contract verification` | `source-of-truth` | `legacy` | core 保持主合同，core-ng 保留 legacy 对照测试 |
| `ExecVmEvidence` | `adopted` | `legacy` | 旧证据项进入 observability 审计，不保持并列产品面 |
| `FullCutoverGate` | `source-of-truth` | `legacy` | 主 gate 在 core；core-ng 只保留验证遗留路线 |
| direct consumer import from `@logixjs/core-ng` | `n-a` | `frozen` | 不允许新增主线依赖 |

## Constraints

- `@logixjs/core` 是唯一长期主线
- `@logixjs/core-ng` 只允许作为 support matrix 输入、迁移说明或 legacy 对照材料
- 任何 consumer 新增依赖都应直接指向 `@logixjs/core`

## Legacy Routing Contract

- `packages/logix-core/src/internal/runtime/core/RuntimeServices.impls.coreNg.ts` 负责声明 `coreNgSupportMatrixRoute`，作为 core 侧唯一 support-matrix 路由事实
- `packages/logix-core-ng/src/RuntimeServices.impls.ts` 保留 `coreNgLegacyRouting` 给旧消费方读取 legacy meaning，并额外暴露 `coreNgSupportMatrixRoute`
- `packages/logix-core-ng/src/index.ts` 继续保留 legacy layers，同时把 `coreNgSupportMatrixRoute` 暴露成主导迁移判断的结构化入口
- `coreNgKernelLayer` 与 `coreNgFullCutoverLayer` 继续保留为遗留路由入口，公开语义上明确降级为 legacy route
- 新增 consumer 不应再把 `@logixjs/core-ng` 当作主入口

## Migration Notes

- `RuntimeServices.impls.coreNg.ts` 是当前最明确的桥接落点
- `Contracts.048.NoCoreNgImports.test.ts` 已提供主线依赖收紧方向
- `KernelContract.verifyKernelContract.test.ts` 与 `RuntimeServicesSelection.test.ts` 适合作为 core-ng 迁移收口前的遗留对照
- `KernelSupportMatrix.test.ts` 与 `KernelLegacyRouting.test.ts` 负责把 legacy route 元数据固定下来
