# Contracts: 058 Sandbox Multi Kernel（core/core-ng）

本目录存放本特性的“契约层”产物（用于实现阶段对齐与验收），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- Kernel Contract 与实现引用：`specs/045-dual-kernel-contract/contracts/`
- `KernelImplementationRef` schema（复用 045）：`specs/045-dual-kernel-contract/contracts/schemas/kernel-implementation-ref.schema.json`
- Sandbox/Playground 协议主题（概念与演进输入）：`docs/specs/drafts/topics/sandbox-runtime/`

## 本特性新增/固化的契约点

- **KernelVariant**：Host 注册的可选内核变体（`kernelId` + `kernelUrl` + 可选 label）。
- **KernelSelection**：单次运行的 `requestedKernelId/effectiveKernelId/strict/fallbackReason`（必须可序列化）。
- **KernelImplementationRef（复用 045）**：对照锚点的唯一事实源（从 TrialRunReport.environment 提取，避免重复定义）。

schemas：

- `schemas/kernel-variant.schema.json`：KernelVariant 结构（用于 Host/consumer 配置校验）
- `schemas/kernel-registry.schema.json`：KernelRegistry 结构（用于 “kernels + defaultKernelId” 配置校验）
