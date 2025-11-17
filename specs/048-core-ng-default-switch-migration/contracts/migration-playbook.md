# Contract: Default Switch Migration Playbook（切默认步骤与回退）

本 contract 固化切默认的“可交接步骤清单”，用于 048 的 quickstart 与 tasks。

> NOTE（2025-12-31）：本 playbook 对应“默认切到 `core-ng`”的历史实现；当前仓库已选择 **单内核默认**（默认 `core`，`core-ng` 仅对照/试跑显式启用），因此本文不再作为当前行为裁决。以 `specs/046-core-ng-roadmap/roadmap.md` 的 Policy Update 为准。

## Precheck（必须全部满足）

- 047 Full Cutover Gate：PASS（无 fallback + 契约一致性 + Node+Browser 证据预算）
- 045 Kernel Contract：对照验证 harness 可用（core vs core-ng 可跑）

## Switch（切默认）

- 在 `@logix/core` 的 runtime 装配入口切换默认 kernel implementation 到 `core-ng`（通过默认注入的 KernelImplementationRef/Layer 决定，而非 runtime options）
- 确保默认路径为 full cutover（禁止隐式 fallback）

## Rollback（显式回退）

- 允许显式装配 runtime 时选择 `core`（通过显式提供 `core` kernel layer / KernelImplementationRef 覆盖；仅用于排障/对照）
- 回退必须可解释且证据化（不得静默）

## Evidence（必须落盘）

- `$logix-perf-evidence`：Node + ≥1 headless browser before/after/diff
- suites/budgets 以 matrix.json 为裁决（至少覆盖 `priority=P1`；`pnpm perf diff`：`comparability.comparable=true` 且 `summary.regressions==0`）
- Fail-fast 口径：默认/回退/失败都必须可证据化；缺 bindings / 请求不可用 kernel 必须 FAIL（不得隐式 fallback；装配期允许 `txnSeq=0`）
