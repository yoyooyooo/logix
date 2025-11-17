# Data Model: Sandbox 多内核试跑与对照（core/core-ng）

**Date**: 2025-12-28  
**Feature**: [058-sandbox-multi-kernel](./plan.md)

> 说明：本数据模型用于约束 “Host 注册内核变体 → 单次运行选择 → 结果可解释” 的结构化边界；不引入持久化存储。

## Entity: KernelVariant

Host 提供的一个可被选择的内核变体。

**Fields**
- `kernelId` (string, stable): 变体标识（用于选择与对照；`[a-z0-9-]+`）。
- `label` (string, optional): 人类可读名称（用于 UI 展示）。
- `kernelUrl` (string): 该变体的 kernel 入口 URL（`logix-core.js`）。

**Notes**
- `effect.js` 与 `logix-core.manifest.json` 默认从 `kernelUrl` 的 sibling URL 推导；是否显式化由实现阶段裁决。
- 默认仅允许同源内核资源；跨域内核仅在 Host 显式允许且可审计时启用。

## Entity: KernelRegistry

Host 提供的“可用内核注册表”，是 kernel 选择与 fallback 的事实源。

**Fields**
- `kernels` (ReadonlyArray<KernelVariant>): 可用内核列表（顺序稳定，建议以注册顺序为准）。
- `defaultKernelId` (string, optional): 默认内核；当 `kernels.length > 1` 时必须提供；当仅一个内核时可省略（等价于该唯一内核）。
- `allowCrossOrigin` (boolean, optional): 是否允许跨域内核资源（默认 false；启用需满足 CORS 与可审计要求）。

## Entity: KernelSelection

单次运行的选择请求与实际生效结果（必须可序列化、可解释）。

**Fields**
- `requestedKernelId` (string): 请求的内核（未提供时由 Host 的 `defaultKernelId` 或“仅一个内核”规则确定，并在输出中回填为确定值）。
- `effectiveKernelId` (string): 实际使用的内核（必须存在于可用集合内）。
- `strict` (boolean, default true): 严格模式：任何无法按 requested 运行都失败（strict by default）。
- `fallbackReason` (string, optional): 当发生 fallback 时的原因摘要（例如 missing/load-failed/init-failed）；fallback 目标固定为 Host 的 `defaultKernelId`。

## Entity: KernelRunSummary

面向 consumer 的最小摘要（用于 docs/debug/CI 对照）。

**Fields**
- `runId` (string): 运行标识（由 Host 显式提供，保持确定性）。
- `selection` (KernelSelection): 本次选择与实际生效结果。
- `kernelImplementationRef` (unknown, optional): 实现引用（复用 045 的 `KernelImplementationRef` schema；来源为 TrialRunReport 的 `environment.kernelImplementationRef`；成功运行必须可用）。
- `durationMs` (number, optional): 运行耗时。
- `errorSummary` (object, optional): 面向读者的可理解错误摘要（不要求携带内部实现对象）。

## Notes

- “跑的是哪个内核实现”以 `kernelImplementationRef` 为唯一事实源；`effectiveKernelId` 仅作为 Host 侧可解释标签，不应替代实现引用。
