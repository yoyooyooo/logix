# Contract: Full Cutover Coverage Matrix（单一事实源）

本 contract 定义 047 所需的 “Full Cutover 覆盖矩阵” 的维护口径（不是实现细节）。

## Required

- coverage matrix MUST 作为单一事实源维护（SSoT=代码）：必选 serviceId 列表由 `@logix/core` 导出读取入口提供（优先 `packages/logix-core/src/Kernel.ts`）；测试/CI/harness 只读此处。
- matrix MUST 明确 Full Cutover Gate 的必选 serviceId 集合，且该集合 MUST 等于 Kernel Contract 当前所有可替换 `serviceId`（随着 Contract 演进自动扩面；新增/扩展必须同步纳入，避免漏判）。
- matrix MUST 版本化（可审计），并能关联到 046 spec registry 的条目与里程碑（M3）。
- contract diff allowlist（如启用）MUST 同样遵循 SSoT=代码：在 `@logix/core` 导出读取入口（例如 `KernelContractMetaAllowlist`），并以 `metaKey` 作为条目主键（避免 spec/CI 漂移）。
- allowlist 默认 MUST 为空且禁用；仅在明确需要时才显式启用，并逐条记录 reason（避免无意放行）。

## Initial serviceIds (seed)

> 初始种子仅用于启动治理与讨论；不作为权威集合。实现阶段以 `@logix/core` 的 code SSoT 为准（任何与 seed 不一致的地方以 code 为准）。

- `txnQueue`
- `operationRunner`
- `transaction`
- `dispatch`

## Notes

- `trial-run/test/dev` 的渐进替换不属于 Full Cutover；该模式允许混用但必须证据化（045）。
- 任何新增可替换 serviceId，如果属于核心路径，应该优先纳入 coverage matrix 并被 Gate 覆盖。
