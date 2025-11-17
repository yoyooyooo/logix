# Research: 047 core-ng 全套切换达标门槛（无 fallback）

本 research 固化 Full Cutover Gate 的关键裁决，避免实现阶段出现“半成品态误判可切默认”。

## Decision 0：本 spec 的定位

**Chosen**：047 是“门槛/治理 spec”，不实现 core-ng 优化本体；它定义 Full Cutover 的硬门槛与验证矩阵，并拆分出实现阶段 tasks。

## Decision 1：Full Cutover 的失败策略（fallback 处理）

**Chosen**：

- `trial-run/test/dev` 允许渐进替换与 fallback，但必须证据化；
- “宣称可切默认 / Full Cutover Gate”下 **禁止 fallback**：任何 serviceId fallback 都必须导致 Gate FAIL（结构化失败 + 可序列化证据）。

**Rationale**：禁止“半成品默认化”，否则会把字符串往返/额外分支/隐藏回退成本带进长期路径，且难以定位。

## Decision 2：coverage matrix 的单一事实源

**Chosen**：coverage matrix 必须有单一事实源，且能被测试与验证 harness 读取；禁止把“必选 service 集合”散落在多处文档或代码里。

**Rationale**：Kernel Contract 会演进；没有单一事实源会出现“新增 service 未纳入 cutover 判定”的隐性缺口。

## Decision 3：契约一致性验证与允许差异口径

**Chosen**：复用 045 的 `verifyKernelContract`（对照验证 harness）。如需允许差异，必须显式登记为白名单并可审计；禁止差异（语义/锚点/事务边界）一律 FAIL。

## Decision 4：性能证据门槛（Node + Browser）

**Chosen**：Full Cutover Gate 的证据门槛统一使用 `$logix-perf-evidence`：

- 必须包含 Node + ≥1 条 headless browser；
- suites/budgets 的 SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（至少覆盖 `priority=P1`；before/after 必须 `matrixId+matrixHash` 一致）；
- 预算裁决：以 `pnpm perf diff` 的 `comparability.comparable=true` 且 `summary.regressions==0` 为硬门槛；
- 任何“中间态可能更慢”的改动必须在落地前/后各采集一次并 diff，阻断负优化。

**Rationale**：Node-only 证据不足以裁决前端 runtime；Browser V8 的 JIT/GC 行为差异会影响热点。
