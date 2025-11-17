# Research: IR Reflection Loader（IR 反射与试运行提取）

**Date**: 2025-12-23  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/025-ir-reflection-loader/spec.md`

## 背景与目标

本特性希望把“平台/CI/Agent 可消费的 IR”落到一条 **不依赖源码 AST**、且 **可复现/可对比/可解释** 的链路上：

- **Manifest IR（ModuleManifest）**：结构摘要（JSON），用于 Studio/CI/Agent。
- **Trial Run（受控试跑）**：在 Build Env 里跑一次，导出证据包（EvidencePackage）与最小 IR 摘要（包含控制面证据、Environment IR、可选 Static IR）。
- **内核提前支撑**：尽量复用现有控制面/证据协议，避免平台侧再造一套“依赖/覆写/证据”的并行真相源。

本研究阶段的重点是：在不引入运行时热路径开销的前提下，明确哪些信息可以“静态化/序列化”，以及各 IR 的最小字段集与确定性规则。

## Decision 1：Manifest IR 以“字段投影 + 确定性 digest”为主

**Decision**: ModuleManifest 作为 `ModuleDescriptor` 的“平台化投影”，但 **不包含 runtime instance 信息**，并提供稳定 digest 供 diff。  
**Rationale**:

- `packages/logix-core/src/Module.ts` 的 `descriptor(module, runtime)` 混入了 `moduleId/instanceId`（运行期锚点），不适合作为平台静态 Manifest。
- Manifest 的核心价值是：不读 AST，直接从最终对象形状拿到 **可序列化结构摘要**，用于 Studio/CI/Agent。
- 为 CI/平台做 drift detection，需要稳定的 `digest`：由“可导出字段”稳定排序后计算（不得含时间/随机锚点）。

**Alternatives considered**:

- 直接复用 `ModuleDescriptor` 作为 Manifest：会引入运行期 instanceId，导致 CI diff 不可复现；拒绝。
- Manifest 直接导出 `schemas`（Effect Schema 对象）：不可序列化；拒绝。

## Decision 1.1：Manifest 的 meta 与 digest 口径（降噪 + 确定性）

**Decision**:

- `ModuleManifest.meta` 仅允许稳定、可复现元信息（禁止时间戳/随机/机器特异信息）。
- `ModuleManifest.digest` **只由结构字段决定**（例如 `moduleId/actionKeys/schemaKeys/logicUnits/staticIr.digest`），**不包含** `meta/source`。

**Rationale**:

- meta/source 往往是“可读性与追溯信息”，但其变化频率高、易引入 CI 噪音；把它们排除在 digest 之外能保证 drift detection 更聚焦于结构变化。
- meta 仍然有价值（owner/docs/稳定标签等），但必须禁止非确定性字段进入输出，避免破坏“可复现/可对比”的基本门槛。

**Alternatives considered**:

- digest 包含 meta：会把弱稳定字段放大成 breaking 风险；拒绝。
- 完全移除 meta/source：降低可解释性与可追溯性；暂不取。

## Decision 1.2：Contract Guard（diffManifest）对 meta 的默认口径

**Decision**: `diffManifest` 默认把 meta 变化归类为 **RISKY**（不作为 breaking），并支持通过 allowlist 降噪（只检查 allowlist keys）。  
**Rationale**:

- meta 变化不应阻断 CI，但需要被显式提示与可解释（避免“悄悄漂移”）。
- allowlist 让团队可以逐步把“高价值 meta key”纳入治理，而不是一次性把全部 meta 变化都当噪音。

**Alternatives considered**:

- meta 变化默认 INFO：容易被忽略，治理效果弱；不取。
- meta 变化默认忽略：丢失治理入口；不取。

## Decision 2：Schema 暂以 `schemaKeys` 为主，JSON Schema 转换是扩展点

**Decision**: 025 的 Manifest 默认只保证 `schemaKeys`（以及 meta/source/logic slots 等），不强制交付 Schema→JSON Schema 的转换器；但在 contracts/plan 中保留扩展点。  
**Rationale**:

- 当前仓库内未发现稳定的 `effect/Schema -> JSON Schema` 转换器；强行引入会扩大 scope，且容易引入非确定性（`$ref` 命名、排序、去重策略）。
- 025 的 P1 能先用 schemaKeys 支撑“结构 diff / UI 节点枚举 / Agent 工具目录”的最小闭环；JSON Schema 可后续单独演进或由平台侧 loader 提供。

**Alternatives considered**:

- 立即在 core 内实现 JSON Schema 转换：风险与工作量过大，且会牵涉大量确定性规则；暂缓。
- 平台侧用 AST 取 schema：与本特性目标冲突；拒绝。

## Decision 3：Static IR 的首选落点 = StateTrait.exportStaticIr（图级、可 diff）

**Decision**: FR-010（Static IR）优先复用 `StateTrait.exportStaticIr` 的输出形态作为“声明式推导关系依赖图”的 canonical Static IR。  
**Rationale**:

- `packages/logix-core/src/internal/state-trait/ir.ts` 已提供 stable stringify + digest（`stir:...`），输出纯 JSON（nodes/edges），天然适合平台可视化与 CI diff。
- 该 IR 语义上正对应“派生/联动/校验”等声明式关系（computed/link/source/check），符合 FR-010 的定义。

**Alternatives considered**:

- 以 `ConvergeStaticIrExport` 作为唯一 Static IR：该结构更偏“运行时优化表”（整数表/拓扑序），对平台语义表达不足；作为补充即可。

## Decision 4：ConvergeStaticIrExport 属于“证据摘要”，而非 Manifest 主体

**Decision**: `packages/logix-core/src/internal/state-trait/converge-ir.ts` 的 `exportConvergeStaticIr` 作为 EvidencePackage 的一个 summary 子项（或可选导出），默认不进入 Manifest。  
**Rationale**:

- `ConvergeStaticIrExport` 以 `instanceId:generation` 为 digest，天然更偏运行期对齐（并与实例/代际绑定）；而 Manifest 面向“静态结构对比”。
- 该 IR 更适合 Devtools/对齐实验室/性能诊断，而不是 Studio 的结构面板。

**Alternatives considered**:

- 强行把 converge IR 放入 Manifest：会把运行期概念带入静态面，增加困惑与噪音；拒绝。

## Decision 5：Trial Run 复用 Observability.trialRun（Scope close = 资源释放语义）

**Decision**: 受控试跑的执行与资源释放复用 `packages/logix-core/src/internal/observability/trialRun.ts` 的 `trialRun`：内部 `Scope.make()` + `Scope.close(scope, exit)` 保证结束时释放资源/取消 fibers。  
**Rationale**:

- 试跑无法推断“何时退出常驻逻辑”；唯一可靠手段是 **由试跑策略显式关闭 Scope**。
- 该实现已经把“导出 EvidencePackage 与释放资源”绑定为原子步骤，可避免 demo 里 `Deferred.await(done)` 的入侵样板。

**Alternatives considered**:

- “无活跃 fiber 自动退出”：不可预测且不可解释；拒绝。

## Decision 6：Trial Run 的可对比性要求显式注入 `runId`（CI 必须）

**Decision**: 在 CI/平台场景，Trial Run 必须显式提供 `runId`（以及需要时 `startedAt`），禁止依赖 `RunSession` 默认的 `Date.now()`/进程序号。  
**Rationale**:

- `packages/logix-core/src/internal/observability/runSession.ts` 默认 `runId=run-${Date.now()}.${seq}`，天然非确定；用于 diff 会导致“每次都变”。
- 明确要求调用方注入可复现 runId（例如 `${commitSha}:${entry}`）能保障对比稳定。

**Alternatives considered**:

- core 内部默认改成确定性 runId：会影响所有现有观测用例与调试体验；不在 025 直接改动。

## Decision 7：Environment IR = “观测到的依赖” + “可行动违规摘要”

**Decision**: Environment IR 由两部分组成：

1. **observed（观测到的依赖）**：trial run 过程中被访问的 `tagIds/configKeys`（尽量记录、去重、可裁剪）。
2. **violations（可行动违规）**：构建态缺失服务/禁止副作用等违规摘要（必须明确阶段与原因）。

其中 Tag 稳定标识规则复用 `packages/logix-core/src/Root.ts` 的 `tagIdOf(tag)`（优先 `tag.id`，否则 `tag.key`）。  
**Rationale**:

- 平台化需要“依赖契约”的可序列化摘要；在动态组合/条件分支存在时，只能承诺“观测到的集合”，并把不确定性显式暴露出来。
- 违规摘要必须可行动：例如 `ConstructionGuardError(kind=missing_service)` 至少能给出缺失 serviceId 列表。

**Alternatives considered**:

- 静态分析推导依赖（AST）：与目标冲突；拒绝。
- 只输出缺失依赖、不输出 observed：平台无法做“部署预检/编排提示”的正向体验；拒绝。

## Decision 7.1：TrialRunReport 失败时仍尽可能携带可解释 IR

**Decision**: TrialRunReport 在失败时仍尽可能输出 `environment`（含缺失清单）与 `manifest`（若能提取），用于 CI/平台解释与修复；提取不到或超限则省略对应字段。  
**Rationale**:

- 平台与 CI 的核心诉求是“可行动”：失败时没有缺失清单/manifest 会迫使用户反复重跑或去读源码，背离“可解释链路”目标。
- 将“可解释 IR”与失败一起输出，不改变失败语义，但显著提升修复体验与可诊断性。

**Alternatives considered**:

- 失败时只输出 error：信息不足、可行动性差；拒绝。
- 仅 missing 失败带 environment：对 timeout/runtime failure 的排障帮助不足；暂不取。

## Decision 8：控制面证据（RuntimeServicesEvidence）直接复用为 Trial Run summary 的 runtime 子项

**Decision**: 025 不再发明“控制面 IR”，直接复用 `RuntimeServicesEvidence`（scope/bindings/overridesApplied）进入 EvidencePackage summary（已有 schema：`specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json`）。  
**Rationale**:

- 这是现有控制面的单一事实源；平台侧如需解释“为什么选了这个 impl”，应该直接消费该证据模型。
- 025 的增量应集中在“manifest/试跑/Environment IR”，而不是重造覆写语义。

**Alternatives considered**:

- 平台侧再输出一套“覆写来源图”：会造成口径漂移，后续很难统一；拒绝。

## Open questions（已收敛到后续 tasks 的裁决点）

- 是否需要在 `$.use(tag)` / `Root.resolve(tag)` 上引入可注入的“依赖收集器”，以记录 `observed.tagIds`；要求 `diagnostics=off` 分支保持零额外开销（沿用 022 的 perf gate）。
- `configKeys` 的采集策略：优先在 BuildEnv 中包装 ConfigProvider（仅影响 trial run），避免影响生产运行时。
