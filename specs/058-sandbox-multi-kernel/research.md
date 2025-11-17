# Research: Sandbox 多内核试跑与对照（core/core-ng）

**Date**: 2025-12-28  
**Feature**: [058-sandbox-multi-kernel](./plan.md)

## Decision 1: 内核变体由 Host 显式注册（kernelId → kernelUrl）

**Decision**: multi-kernel 的事实源在 Host：由 Host 提供稳定 `kernelId`，并映射到该变体的 `kernelUrl`（`logix-core.js` 入口，且同目录包含 `effect.js` 与 `logix-core.manifest.json`）；当存在多个变体时，Host 必须同时提供 `defaultKernelId`（用于默认选择与 fallback 目标），且默认仅允许同源内核资源（跨域仅在 Host 显式允许且可审计时启用）。

**Rationale**:
- 复用现有 Worker 逻辑：Worker 当前以 `kernelUrl` 推导 `effectUrl` 与 manifest URL，最小改动即可扩展到多变体；
- consumer 不需要直接依赖 `@logix/core-ng`：只通过选择 kernel 资产完成对照；
- 保持可复现与可审计：默认推荐同源静态资源（docs/playground 场景）。

**Alternatives considered**:
- 在 INIT 一次性注入 `kernelBlobUrls` 并在 Worker 内部管理多 kernel：实现更“协议化”，但需要重构编译插件与选择时机；可作为后续演进目标。

## Decision 2: 选择粒度是“单次运行”，切换内核时以 Worker 重建作为兜底

**Decision**: `kernelId` 选择以单次 `trialRunModule/run` 为边界；当 kernel 变体切换时，Host 可以选择重建 Worker 作为强隔离兜底（避免缓存/状态导致串扰）。

**Rationale**:
- 可靠优先：多内核对照的首要风险是“跑了但没用到目标内核”，重建 Worker 可最大化隔离；
- 对 docs/debug 场景足够：内核切换频率低，牺牲少量冷启动换取确定性更划算。

**Alternatives considered**:
- 在同一 Worker 内软切换 kernel：性能更好，但更容易出现“残留状态/缓存影响下一次运行”的串扰，需更复杂的清理语义。

## Decision 3: strict / fallback 语义必须可门禁且可解释

**Decision**:
- strict（默认）：任何无法按 `requestedKernelId` 运行的情况都失败（含缺失/加载失败/初始化失败/发生 fallback）。
- non-strict：仅在显式允许 fallback 时才允许降级，且 fallback 目标固定为 Host 的 `defaultKernelId`；必须显式记录 `fallbackReason` 与 `effectiveKernelId`。

**Rationale**:
- 避免静默回退污染 Gate 结论；
- 让 docs/debug 可以把“为什么没有用到目标内核”解释清楚。

## Decision 4: 结果锚点复用 045 的 KernelImplementationRef

**Decision**: “本次运行使用了哪个内核实现”的唯一事实源是 TrialRunReport 的 `environment.kernelImplementationRef`（契约与 schema 复用 `specs/045-dual-kernel-contract/contracts/schemas/kernel-implementation-ref.schema.json`）。

**Rationale**:
- 避免重复定义 `kernelId/implRef` 导致并行真相源；
- 与 046/045 的对照验证链路天然对齐。

## Decision 5: 协议/文档与代码 SSoT 对齐优先

**Decision**: 协议与包 API 的裁决以 `packages/logix-sandbox/src/*` 为 SSoT；需要同步更新 `docs/specs/drafts/topics/sandbox-runtime/15-protocol-and-schema.md` 与 `25-sandbox-package-api.md`，把 multi-kernel 的字段与语义写清。

**Rationale**:
- 目前 docs 中存在 `kernelBlobUrls`（理想形态）与代码中 `kernelUrl`（PoC 形态）的差异；multi-kernel 会放大漂移风险；
- 先统一口径，再进入实现，避免 consumer/测试按“错误协议”接入。
