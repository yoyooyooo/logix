# PR Draft: refactor/logix-core-runtime-kernel-selection-split-20260223

## 目标
- 将 `RuntimeKernel.ts` 中“runtime service 选择 + evidence scope 计算”纯函数下沉到独立模块。
- 保持 `RuntimeKernel` 的 Tag/Context 依赖与 evidence attach/get 入口不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`（调用点）
- `packages/logix-core/test/internal/Runtime/RuntimeKernel/*`
- `packages/logix-core/test/Runtime/Runtime.kernelEvidence.serializable.test.ts`
- `packages/logix-core/test/Contracts/Contracts.045.KernelActivation.test.ts`
- `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.*.test.ts`

## Spec 对齐（灵感来源）
- `specs/020-runtime-internals-contracts/spec.md`：内部契约边界与可替换实现。
- `specs/027-runtime-observability-hardening/spec.md`：可观测证据结构稳定与可解释性。

## 本轮改动
- 新增 `RuntimeKernel.selection.ts`：承载 `selectRuntimeService`、`makeRuntimeServicesEvidence` 及其内部 pure helpers。
- `RuntimeKernel.ts` 保留 Tag/Context 和 evidence attach/get，改为复用新模块导出的纯函数。
- `resolveRuntimeServicesOverrides` 改为返回可复用类型 `RuntimeServicesOverrideLayers`（语义不变）。
- 新增 `RuntimeKernel.Selection.test.ts`：补齐 fallback note/`overridesApplied` 与 `scope=maxScope` 的定向回归。

## 验证
- `pnpm --filter @logixjs/core typecheck`
- `pnpm --filter @logixjs/core exec vitest run test/internal/Runtime/RuntimeKernel test/Runtime/Runtime.kernelEvidence.serializable.test.ts test/Runtime/Runtime.rollbackKernel.core.test.ts test/Runtime/Runtime.defaultKernel.core.test.ts test/Contracts/Contracts.045.KernelActivation.test.ts test/Contracts/Contracts.047.FullCutoverGate.fallback.test.ts test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
- `pnpm --filter @logixjs/core exec vitest run test/internal/Runtime/RuntimeKernel/RuntimeKernel.Selection.test.ts test/internal/Runtime/RuntimeKernel`

## 独立审查
- subagent `019c866e-7b42-7de1-8795-d07197e3a98b`（explorer）两轮复核后结论：无阻塞问题，可合并。
- 初审建议已吸收并落地：新增 `RuntimeKernel.Selection.test.ts` 覆盖 fallback note/`overridesApplied` 与 `scope=maxScope`。

## 风险与关注点
- 需确认 `RuntimeServicesOverrideLayers` 类型抽离后不影响 `ModuleRuntime.impl.ts` 调用推导。
- 需确认 evidence scope 计算（`maxScope`）与 fallback note 拼接完全保持原行为。
