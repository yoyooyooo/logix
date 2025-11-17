# Research: 048 切默认到 core-ng（迁移与回退口径）

本 research 固化“切默认”的关键裁决，避免在实现阶段产生隐式 fallback 与口径漂移。

## Decision 0：切默认的前置条件

**Chosen**：必须先通过 `specs/047-core-ng-full-cutover-gate/`（无 fallback + 契约一致性 + Node+Browser 证据预算）。未达 gate 不能切默认。

## Decision 1：默认选择与回退的语义

**Chosen**：

- 默认：未指定 kernel → `core-ng`；
- 回退：仅在显式配置下选择 `core`；
- 禁止隐式 fallback：默认路径必须 full cutover；任何 fallback 必须视为失败并结构化暴露（不允许“为了可用偷偷回退”）。

## Decision 2：迁移说明替代兼容层

**Chosen**：切默认属于 breaking change（默认行为变化），但本仓不承诺向后兼容：用迁移说明（步骤 + 回退）替代长期兼容层。

## Decision 3：证据门禁（Node + Browser）

**Chosen**：切默认必须产出 `$logix-perf-evidence` 的 Node + ≥1 条 headless browser before/after/diff，并满足预算门槛（suites/budgets SSoT=matrix.json，至少覆盖 `priority=P1`；`pnpm perf diff`：`comparability.comparable=true` 且 `summary.regressions==0`）。Browser 证据缺失视为未完成。

## Decision 4：失败口径（无 fallback）与证据锚点

**Chosen**：

- 047 Gate 未 PASS：不得合入/发布切默认；不走“先切默认再补 gate”的路径。
- 默认路径请求 `core-ng` 但缺 bindings：必须 FAIL（不得隐式 fallback），并输出最小可序列化证据锚点（装配期允许 `txnSeq=0`）。
- Browser-only 回归仍视为 FAIL：Node 或 Browser 任一 required suite 回归都阻断完成结论。
- 显式选择 kernel 但实现/绑定不匹配：必须 FAIL 且可解释（输出 requested kernelId + 可用 kernels/bindings 摘要），禁止隐式 fallback。

## Decision 5：成功态证据口径（Fully Activated）与 core-ng 包边界

**Chosen**：

- “Fully Activated” 的成功态证据以 Full Cutover Gate 的结构化结果为准：`verdict="PASS"` 且 `fullyActivated=true`（并且 `missingServiceIds=[]`、`fallbackServiceIds=[]`）。
- `packages/logix-core-ng/*` 的真实实现达标属于 047 Gate；048 以“切默认 + 证据口径 + 迁移说明”为交付，不以“改 core-ng 包”为前提。
