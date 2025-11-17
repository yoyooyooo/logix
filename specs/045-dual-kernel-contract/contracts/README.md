# Contracts: 045 Dual Kernel Contract（当前内核 + core-ng）

本目录存放本特性的“契约层”产物（用于实现阶段对齐与验收），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- 统一观测协议与证据包：`specs/005-unify-observability-protocol/contracts/`
- 可序列化诊断与稳定身份：`specs/016-serializable-diagnostics-and-identity/contracts/`
- 运行时内部契约化与服务化方向：`specs/020-runtime-internals-contracts/`

## 本特性新增/固化的契约点

- **KernelSelection / KernelImplementationRef**：用于解释“当前 runtime 请求的内核族是什么、来源是什么”，并用于契约一致性验证的差异报告锚点。
- **RuntimeServicesEvidence（复用既有）**：用于解释“serviceId → implId”的细粒度选择结果（RuntimeKernel 机制），避免引入第二套不可对齐的选择协议。

## 关键语义（避免并行真相源/避免误读）

- `KernelImplementationRef.kernelId` 表示**请求的内核族（requested kernel family）**，不是“已全套生效”的证明。
- 是否发生 fallback/混用 builtin、是否满足“宣称已切到 core-ng/准备切换默认实现”的全套切换门槛，必须结合 `RuntimeServicesEvidence` 判定（见 `specs/045-dual-kernel-contract/spec.md` 的 Clarifications 与 FR-003/FR-008）。
- 诊断分档：
  - diagnostics=off：至少导出 `KernelImplementationRef`（极小摘要），不得默认导出 `RuntimeServicesEvidence`。
  - diagnostics=light/full：导出 `RuntimeServicesEvidence` 以支撑解释链路与对照 diff。

schemas：

- `schemas/kernel-implementation-ref.schema.json`：内核实现引用（Slim、可序列化）
