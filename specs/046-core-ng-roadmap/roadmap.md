# Roadmap: After 045（core-ng 长期演进与切换门槛）

本文件是 `specs/046-core-ng-roadmap/` 的“可扫描路线图”：用最少文字把 **里程碑**、**硬门槛（Gate）**、**边界**说清楚。

> 需要“更细的后续 specs 清单/依赖顺序/证据门禁/类型划分”，看：`specs/046-core-ng-roadmap/spec-registry.md`。

## 当前状态（手工回写）

- `Policy Update / 单内核默认（2025-12-31）`：默认运行时内核回退为 `core`（单内核默认），`core-ng` 仅作为对照/试跑内核显式启用。
  - 目的：默认用户只跑一个内核；对比场景才多内核；单内核路径不因为 kernel 选择引入不必要的装配成本；同时为未来随时新增实验内核包留出扩展槽位。
  - Perf（diff / default kernel A/B）：`specs/046-core-ng-roadmap/perf/diff.browser.default-kernel.core-ng__core.darwin-arm64.20251231-235522.default.json`、`specs/046-core-ng-roadmap/perf/diff.node.default-kernel.core-ng__core.darwin-arm64.20251231-235522.default.json`（解读见 `specs/046-core-ng-roadmap/perf/README.md`）
- `M0 / 045` 已达标：`specs/045-dual-kernel-contract/quickstart.md`
  - Perf（diff）：`specs/045-dual-kernel-contract/perf/diff.node.worktree.default.json`、`specs/045-dual-kernel-contract/perf/diff.browser.worktree.default.json`
  - Contract harness：`packages/logix-core/src/internal/reflection/kernelContract.ts`
- `M1 / 039` 已达标：`specs/039-trait-converge-int-exec-evidence/quickstart.md`
  - Perf（summary）：`specs/039-trait-converge-int-exec-evidence/perf.md`
  - Perf（diff）：`specs/039-trait-converge-int-exec-evidence/perf/diff.node.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.diagnostics-overhead.worktree.json`
- `M3 / 047` 已达标：`specs/047-core-ng-full-cutover-gate/quickstart.md`
  - Perf（diff）：`specs/047-core-ng-full-cutover-gate/perf/diff.node.default.worktree.json`、`specs/047-core-ng-full-cutover-gate/perf/diff.browser.default.worktree.json`
- `M4 / 048` 已达标（历史迁移 spec；当前 Policy Update 已回退默认 `core`）：`specs/048-core-ng-default-switch-migration/quickstart.md`
  - Perf（diff）：`specs/048-core-ng-default-switch-migration/perf/diff.before.38db2b05__after.worktree.default.json`
- `046 / 综合对比（38db → 当前）` 已固化（用于回答“046 这一大波总体收益”）
  - Perf（summary）：`specs/046-core-ng-roadmap/perf/README.md`
  - Perf（diff）：`specs/046-core-ng-roadmap/perf/diff.browser.38db2b05__c2e7456d.darwin-arm64.20260101-005537.default.json`
- `M1.5 / 057` 已达标：`specs/057-core-ng-static-deps-without-proxy/quickstart.md`
  - Perf（summary）：`specs/057-core-ng-static-deps-without-proxy/perf/README.md`
  - Perf（diff）：`specs/057-core-ng-static-deps-without-proxy/perf/diff.browser.legacy__selectorGraph.darwin-arm64.default.json`、`specs/057-core-ng-static-deps-without-proxy/perf/diff.node.legacy__selectorGraph.darwin-arm64.default.worktree.gc.json`
- `056` 已达标（schema-aware accessors baseline）：`specs/056-core-ng-schema-layout-accessors/spec.md`
  - Perf（diff）：`specs/056-core-ng-schema-layout-accessors/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-075738.default.json`、`specs/056-core-ng-schema-layout-accessors/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-075738.default.json`
- `059` 已达标（typed reachability baseline）：`specs/059-core-ng-planner-typed-reachability/spec.md`
  - Perf（diff）：`specs/059-core-ng-planner-typed-reachability/perf/diff.node.core-ng.execVm.on.before__after.converge.txnCommit.darwin-arm64.20251231-072950.default.json`、`specs/059-core-ng-planner-typed-reachability/perf/diff.browser.core-ng.execVm.on.before__after.matrixP1.darwin-arm64.20251231-072950.default.json`
- Next Action：无（可选路线 `053/054/055` 已 frozen；053/054 已完成 Trigger Check 并保持 frozen；055 已完成 pilot 预选并保持 frozen；仅在证据触发条件满足时解冻）

## 里程碑总览（建议执行顺序）

| Milestone | 目标（做完能得到什么） | 硬门槛（必须可证据化/可重复验证） | 主落点（spec） |
| --------- | ---------------------- | ---------------------------------- | -------------- |
| M0        | 045 分支点落地：Kernel Contract + 对照验证跑道可用 | `KernelImplementationRef`/`RuntimeServicesEvidence` 分档位正确；对照验证 harness 可输出结构化 diff；默认路径 Node+Browser 无回归证据 | `specs/045-dual-kernel-contract/` |
| M1        | 当前内核“够硬”：收敛/事务热路径整型化 + 证据达标 | 039 的 `SC-002/SC-003/SC-005` 达标；Node+Browser before/after/diff 固化；明确阻断“半成品态” | `specs/039-trait-converge-int-exec-evidence/` |
| M1.5      | 读状态协议化：ReadQuery/SelectorSpec + 车道（AOT/JIT/Dynamic）+ struct memo + Devtools 可解释 | 无插件仍可用（JIT 默认）；dynamic 回退必须可观测且可在 strict 下失败；读依赖能进入统一最小 IR（至少声明 reads/deps） | `specs/057-core-ng-static-deps-without-proxy/` |
| M1.6      | Txn Lanes 默认开启：从显式 opt-in 切为默认 on（保留回退/对照） | Default Switch Gate 达标（见 060）；`diagnostics=off` 近零成本不回归（052）；Node+Browser before/after/diff（默认路径 off vs default-on，core+core-ng 都需达标） | `specs/062-txn-lanes-default-switch-migration/` |
| M2        | core-ng 可并行推进：在 trial-run/test/dev 可渐进替换 | core vs core-ng 可被同一对照验证驱动；fallback 必须可解释；请求 core-ng 的 perf 不得显著回归 | `specs/045-dual-kernel-contract/`（US2/US3） |
| M3        | core-ng 关键路径“全套切换可达标” | “宣称可切默认”时必须 **无 fallback**（全套切换）；契约一致性验证通过；Node+Browser 预算内 | `specs/047-core-ng-full-cutover-gate/` |
| M4        | core-ng 成为默认实现（可切换/可回退） | 切默认动作本身可证据化；回退口径明确；上层不需要直接依赖 core-ng | `specs/048-core-ng-default-switch-migration/` |
| M5        | AOT/编译工具链（可选加速器） | 仅在证据证明“解释层已成主瓶颈”时启动；必须另立 spec；必须有 Node+Browser 证据与可解释降级口径 | registry: `053-core-ng-aot-artifacts`（frozen；证据触发再启动） |
| M6        | Wasm/Flat Memory 等极致路线（探索→落地） | 只在 M1/M3 证据显示仍被 GC/Map/Set 主导时考虑；必须坚持“resident data + integer bridge + buffer reuse” | drafts input + registry: `054/055`（frozen；证据触发再启动） |

> 注：M1.5（057 读状态车道）与 M2（045 US2/US3 渐进替换）**可并行推进**；表格顺序是建议执行/阅读顺序，不表示强依赖。

## Playground / Sandbox（Browser kernel 对照入口）

- Browser 侧的 trial-run/对照入口不等同于 runtime kernel 切换，但会直接影响 docs/调试/CI 是否能“可解释地证明跑的是哪个内核”。
- 046 对该表面的统筹原则：
  - SSoT：runtime kernel 的契约/门槛以 045/047/048 为准；Sandbox/Playground 的 kernel 资产选择以 058 为准（`specs/058-sandbox-multi-kernel/`）。
  - 命名对齐：Sandbox 的 `kernelId` 应与 `KernelImplementationRef.kernelId`（requested kernel family）保持一致（推荐 `core`/`core-ng`），避免 UI/证据两套叫法。
  - 单核退化：Host 只提供一个 kernel 时，不需要 `defaultKernelId`；多 kernel 时必须显式 `defaultKernelId`，且 fallback 只能降级到它（禁止“从可用列表里随便挑一个”）。
  - 当前默认：Playground/Sandbox 的默认选择应为 `core`；`core-ng` 保留为显式对照/试跑选项（对照场景 strict by default，不允许隐式 fallback）。

## 关键 Gate（避免误判/避免负优化）

- **Gate: trial-run/test/dev 渐进替换 ≠ 可切默认**：渐进替换允许按 `serviceId` 混用，但必须记录证据；“宣称可切默认/已切到 core-ng”时必须全套切换（无 fallback）。
- **Gate: 默认路径无回归**：任何契约抽象层/装配点改动，都必须先通过 `$logix-perf-evidence` 的 Node+Browser before/after/diff 证明默认路径预算内。
- **Gate: 语义改变必须另立 spec**：time-slicing（043）、采样诊断（044）、Txn Lanes（060）都不能混入“纯优化不改语义”的链路。
- **Gate: dynamic lane 不得隐形污染默认路径**：允许动态兜底，但必须可观测/可审计；在 CI/perf gate 可将 dynamic 回退升级为失败（strict）。

## 039 的处置（写死，避免漂移）

- 039 在短期是“当前内核加固”的主线：做完它你才能放心继续做平台/上层生态。
- 039 在中期是“证据跑道/guardrails”：core-ng 的任何关键改动都应复用其证据口径拦截负优化。
- 039 在长期可以“达标冻结”：当 core-ng 成为默认且不再投资旧实现时，039 不删，只停止扩展并保留证据作为对照基线。

## core-ng 与 Vite/AOT：必须吗？

- **不必须**：core-ng 的关键里程碑（M2/M3）可以仅靠运行时层面的契约注入与整型化/零分配策略达成。
- **AOT 是可选加速器**：仅当证据显示解释层成为主瓶颈且 runtime 手段难以再降时，才启动“工具链路线”，并要求另立 spec + 明确降级/回退口径。

> 提醒：这里的“工具链”不是极致性能的前置条件。真正的关键是让热路径执行形态接近“编译产物”（线性指令流 + 整型索引 + buffer 复用 + off 零分配），这些可以先通过运行时构造期预编译（JIT-style）完成；工具链更多是最后一公里（减少 cold build/动态分析成本、做更激进 inlining）的可选项。
