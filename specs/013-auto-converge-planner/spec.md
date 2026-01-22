# Feature Specification: 013 Auto Converge Planner（无视场景的及格线）

**Feature Branch**: `[013-auto-converge-planner]`
**Created**: 2025-12-16
**Status**: Draft
**Input**: User description: "在 009 实施完毕的基础上，追求一个更完美的道路：引入更智能的 StateTrait 收敛策略，像并发渲染模式一样，在任何写入分布下都能保证不低于 full 的及格线表现；智能方案允许付出改造成本，但必须配套测试用例与性能脚本兜底，避免负优化场景变多；控制粒度以 Module 级覆盖为主。"

## Clarifications

### Session 2025-12-16

- Q: 未显式配置时 `traitConvergeMode` 的默认值是什么？ → A: 默认 `auto`（模块可覆盖回退 `full`/`dirty`）
- Q: “决策预算”与“执行预算”是否拆分？ → A: 拆分为两类预算：执行用 `traitConvergeBudgetMs`；另增 `traitConvergeDecisionBudgetMs`（默认 0.5ms）
- Q: `cold-start fallback` 的触发边界是什么？ → A: 每个 module instance 的第 1 笔事务
- Q: 事务摘要里 `Converge Execution Mode` 的枚举取值是什么？ → A: `full|dirty`（`auto` 仅出现在 requestedMode；`dirtyAll` 用 flag/原因字段表达）

### Session 2025-12-17

- Q: 模块级覆盖/回退通过什么配置载体落地？ → A: 通过 Runtime 配置按 `moduleId` 覆盖（可热切换，下一笔事务生效；无需修改 Module 代码）
- Q: 是否允许在 `@logixjs/react` 的 `RuntimeProvider` 范围内覆盖 converge 配置？ → A: 允许（更局部赢）；通过 `RuntimeProvider.layer`（Layer/Tag）做 Env 级覆盖，仅对子树生效；切换在下一笔事务生效；不得要求“新建 runtime 复制配置”
- Q: Devtools 是否需要把 evidence 变成“下一步建议”（Lighthouse 风格）？ → A: 需要；Runtime 只产出 Slim、可序列化的证据；建议/Timeline 等深挖能力由后续独立 Devtools spec（基于 `specs/005`）落地，且其输入只能来自 evidence（避免执行器特判化）

### Session 2025-12-18

- Q: 是否需要 **per-transaction override**（例如 submit/root validate 强制 `requestedMode=full`）？ → A: **暂不支持**。理由：会引入“每笔事务一个开关”的新维度，容易补丁化并扩大协议/证据的长期维护成本；当前 A/B 与复现诉求可通过 Provider/module 覆盖满足。**再评估触发条件**：当 010/014 的代表性矩阵点证明“仅对单次事务强制 full”是必要且 Provider/module 覆盖无法表达时，再引入；若引入，必须同步扩展 evidence 的来源口径（例如将 `configScope` 扩展为包含 `transaction`，并确保可审计、可序列化、可回放）。
- Q: 本文中的三位数引用（如 005/009/014/016）应如何解释？ → A: 统一指 `specs/<三位数>-*` 下对应 spec（例如 `016 = specs/016-serializable-diagnostics-and-identity`）。
- Q: 当 `Diagnostics Level=off` 时，013 是否仍需要产出可导出的 `trait:converge` 事件/摘要？ → A: 不需要；off 档位不产出任何可导出的 `trait:converge` 事件/摘要（Devtools/EvidencePackage 不包含 converge 证据）。
- Q: 013 的硬门槛 `auto <= full * 1.05` 在 `specs/014-browser-perf-boundaries` 的报告/diff 里，应绑定到哪条观测口径（`metricCategories`）？ → A: 绑定 `category=runtime` 作为硬门槛；`category=e2e` 仅记录不作为 gate。
- Q: 当 `Diagnostics Level=light` 时，`trait:converge` 的 `data.dirty` 应该包含到什么粒度（尤其是 `roots` / `rootIds`）？ → A: `light` 仅输出 `data.dirty.dirtyAll`；不输出 `roots` / `rootIds`（需要具体 pattern 细节时使用 `full`）。
- Q: `013` 的性能门槛 `auto <= full * 1.05` 在 `specs/014-browser-perf-boundaries` 跑道里，默认用哪档 `Diagnostics Level` 作为硬 gate 环境？ → A: 仅在 `Diagnostics Level=off` 做硬 gate；`light|full` 仅记录 overhead（不影响 pass/fail）。
- Q: 在 EvidencePackage 里，`Converge Static IR` 的导出策略选哪种（用于让 `trait:converge` 事件可离线解释/回放）？ → A: `light` 仅导出 `staticIrDigest`；`full` 导出 `staticIrDigest` + 去重后的 `ConvergeStaticIR`（按 `staticIrDigest` 去重，同一 `instanceId:generation` 只出一次）。
- Q: 当 `Diagnostics Level=full` 时，`trait:converge.data.dirty` 的 `roots/rootIds` 输出策略选哪种（在保证可解释的同时严格受控 evidence 体积）？ → A: 输出 `rootCount` + `rootIds` 前 K 个（默认 K=3，可配置；硬上界 16）+ `rootIdsTruncated=true|false`。
- Q: `staticIrDigest` 应如何定义（用于 `trait:converge` 事件引用与 EvidencePackage 内去重导出 `ConvergeStaticIR`）？ → A: `staticIrDigest = instanceId + ":" + generation`。
- Q: 在 `ConvergeStaticIR`（`full` 下去重导出）里，`FieldPathId -> FieldPath` 的映射应该用哪种表达？ → A: 直接用 `FieldPath[]`（段数组），复用 `specs/009-txn-patch-dirtyset/contracts/schemas/field-path.schema.json`。
- Q: 在 `ConvergeStaticIR`（`full` 下去重导出）里，`StepId -> output FieldPathId` 的映射策略选哪种？ → A: 强制 `1 StepId -> 1 output FieldPathId`，导出 `stepOutFieldPathIdByStepId`（紧凑数组/TypedArray 语义）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - “Auto” 模式在任何场景不低于 full（Priority: P1）

作为运行时使用者/平台集成者，我希望开启派生收敛的 “auto” 模式后，不需要理解写入分布、dirty-set 形状或模块规模，就能保证在任何场景下性能不低于 `full` 的“及格线”，并在稀疏写入场景自动吃到显著加速。

**Why this priority**: 这是“下一处完美点”的核心目标：不让极端场景成为负担，同时不牺牲典型场景收益。

**Independent Test**: 通过一份固定的性能矩阵脚本，比较 `full` vs `auto` 在同一机器/同一输入下的统计结果，并验证 “auto 不劣于 full 的门槛”。

**Acceptance Scenarios**:

1. **Given** 一组覆盖“稀疏/中等/广泛/全量”写入分布、不同 steps 规模的性能矩阵场景，**When** 分别以 `full` 与 `auto` 运行并收集中位数与 p95，**Then** 每个矩阵点都满足 `auto <= full * 1.05`（见 NFR-002；噪声预算默认 5%），并按 NFR-001 的口径可复现（默认：每点至少运行 5 次，记录 p50/p95 与波动）。
2. **Given** 稀疏写入场景（dirty-roots 明显小于 steps 总量），**When** 以 `auto` 运行，**Then** 应产生可观测的收益并在 trace 中能解释为何选择增量路径；收益门槛作为**非阻塞指标**纳入报告：`auto <= full * 0.70`（用于评估收益，不作为合并门槛）。

---

### User Story 2 - 决策可解释、可调参、可回退（Priority: P2）

作为 Devtools/平台调试者，我希望每次事务都能解释“为什么这次选了 full 或增量”，并能在模块级进行覆盖与回退（避免黑盒魔法导致排障困难）。

**Why this priority**: “智能”如果不可解释，就会把不可控风险推给业务；可解释与可回退是自动策略能默认开启的前提。

**Independent Test**: 在单元测试中构造不同写入分布，并断言导出的事务摘要包含决策解释字段，且可 JSON 序列化。

**Acceptance Scenarios**:

1. **Given** 同一模块分别以 `auto` / `full` / `dirty` 模式运行，**When** 触发一次事务提交，**Then** 诊断摘要必须包含：请求模式、实际执行模式、决策依据的可序列化数据（例如受影响 steps 数、估算成本、选择原因、回退原因），并且对外提供 Module 级覆盖入口。
2. **Given** `auto` 模式在某些业务模块上出现异常波动，**When** 业务把该模块切回 `full`（Module 级覆盖），**Then** 行为立刻回退到稳定基线，且不会影响其他模块的策略与缓存状态。

---

### User Story 3 - 负优化被系统性遏制（Priority: P3）

作为运行时维护者，我希望 “auto” 的智能决策本身不会成为新的热路径负担：决策开销必须有上界，且在没有足够信息时宁可退回 full，也不能把负优化扩大到更多场景。

**Why this priority**: 目标是“无视场景也及格”，这要求系统把 full 当作下界并严格控制决策成本。

**Independent Test**: 用构造性的测试验证：当 “auto 需要的信息不足” 或 “受影响面接近全量” 时，必定选择 full；同时决策过程不允许依赖全量扫描（以可观测的统计字段约束其复杂度）。

**Acceptance Scenarios**:

1. **Given** 某个 module instance 的第 1 笔事务（冷启动），**When** `auto` 执行一笔事务，**Then** 必须选择 `full`（保底），并在摘要中标注 “cold-start fallback”。
2. **Given** 写入分布接近全量（受影响 steps 接近总 steps），**When** `auto` 执行事务，**Then** 必须选择 `full`，且不会在事务窗口内进行与 steps 总量线性相关的额外估算开销。
3. **Given** 同一模块实例中重复出现相同的 dirty-pattern（同一 canonical dirty-roots 集合重复出现），**When** 第二次及后续出现该 dirty-pattern，**Then** 决策过程必须复用此前结果，使“决策开销”接近 0（以可观测字段证明为 cache hit），且复用结果不会改变语义正确性。
4. **Given** 某些对抗性场景会导致决策过程本身耗时很长（例如 steps 极大、依赖高度复杂、dirty-pattern 过于分散），**When** `auto` 的决策耗时超过模块级配置的 `traitConvergeDecisionBudgetMs`（默认建议 0.5ms），**Then** 必须立刻终止决策并回退到 `full`，在摘要中标注 “budget cut-off fallback”，并保证该止损机制本身不会引入新的不可控开销。
5. **Given** 写入模式高度离散导致 dirty-pattern 高基数、cache 命中率极低，**When** 连续执行多笔事务，**Then** 系统必须在“空间与开销”上保持上界：缓存容量不得无限增长（有明确容量/内存预算与逐出信号），并在命中率持续过低时主动降低缓存带来的额外成本（例如关闭复用、缩小缓存或优先回退 full），且该自我保护行为必须可解释、可观测。
6. **Given** 首次遇到一个新的 dirty-pattern（cache miss），**When** `auto` 进行决策并首次构建可复用结果，**Then** 首次开销必须被量化且受控：不得让单次事务因缓存构建而超出 full 下界门槛；若不可避免超出，则必须触发预算止损并回退 full（而不是硬扛到底）。
7. **Given** 模块的派生图/依赖关系发生变化（例如规则集版本变化、安装/卸载某些派生节点），**When** 再次出现旧 dirty-pattern，**Then** 旧缓存必须严格失效且不得被误用；系统必须提供可观测的“版本/代际”信息证明本次未命中旧缓存，并通过回归测试覆盖该失效语义。

### Edge Cases

- 冷启动：没有足够历史成本信息时如何避免“误判导致抖动”？
- 极端规模：steps 非常多时（例如数千级），auto 的决策是否仍有严格上界？
- “未知写入/不可定位写入”：必须退回全量，并能解释原因。
- 列表/动态行写入：索引归一化后，受影响集合的定义必须稳定可解释。
- 配置错误（环/多写者）：必须维持硬失败语义，不得被 auto 掩盖或软降级吞掉。
- Provider 范围覆盖：在 React 子树内覆盖 converge 配置时，必须只对子树生效、可审计、可回收；不得导致“配置局部化失控”或引入执行器特判。
- 诊断分档：在 `light` 模式缺失 patch 序列与细粒度 trace 时，Devtools/平台侧必须优雅降级展示（例如显示“本次为 light，细节不可用”的提示），不得白屏或误导。
- 高基数 dirty-pattern：随机写入或动态 key 导致 pattern 不可复用时，缓存不得膨胀；必须可自我保护并可解释。
- 列表/动态行：若 key 归一化不当导致 pattern 随 index 爆炸，缓存会失控；必须定义稳定的 pattern 口径与边界测量用例。

### Non-Goals（避免把 Form 语义污染进 converge 控制面）

- 不引入任何 `@logixjs/form` 专属分支/特判：Form 领域语义（errors 写回、rowId、rules 合并等）由 010 负责，013 只提供与领域无关的控制面与可序列化证据。
- 不接受/传播 index-path 作为运行时/证据口径：坚持 canonical FieldPath（无索引）；任何 index/row 语义只能通过稳定标识与范围字段表达。

## Requirements _(mandatory)_

### Architectural Convergence Strategy（避免补丁化）

> 目的：避免 `auto converge` 走向“补丁叠补丁”。本特性把所有不确定性收敛到少数可验证的边界，并把性能问题的修复路径收敛为：**加基准点 / 补证据字段 / 调策略参数或回退阀门**。

#### 终态目标：Integer-only Runtime Kernel（无字符串内核）

- **终局原则**：字符串 Path 仅存在于 I/O 边界（Schema 定义、Devtools 展示、持久化/导入导出）；核心循环（Transaction/DirtySet/Converge）应以整型 ID 运算，降低 GC/哈希与字符串比较成本。
- **演进路线（Phase 1–4）**：
  1. **Phase 1（本 spec 013 范围）**：在 Converge 内闭环引入 `FieldPathId`/`StepId`，Planner + Cache 的交换格式以整型为主；对外 dirty-set 若仍是字符串，只允许在边界处“一次性映射”为 ID，随后全程使用 ID（见 FR-017/FR-018）。
  2. **Phase 2（Post-013）**：ID 分配下沉到 Module build/install；StateTrait 节点注册即获 ID，减少运行期查表与口径漂移风险。
  3. **Phase 3（Post-013）**：Transaction/DirtySet 进入混合态（`id + path`），逐步去字符串并建立 BitSet/TypedArray 的落点。
  4. **Phase 4（Post-013）**：Kernel Switch：从 `Runtime.dispatch` 起点转 ID，整个 Transaction Loop（Reducer→Patch→Converge→Commit）全程整型；字符串仅在 Debug/导出时懒加载反查。

#### Converge as Performance Control Plane（把 `auto` 从“算法”升级为“控制面”）

- **强隔离**：`requestedMode = full|dirty|auto`；`executedMode = full|dirty`，执行层禁止出现 `auto` 第三路径（只允许通过 Policy 选择两条基线执行路径）。
- **统一控制面能力**：
  - **Policy**：输出 `executedMode` +（dirty 时）`Execution Plan` + `Planner Evidence`（可序列化证据）。
  - **Budget**：统一决策/执行/缓存预算；任何超预算必须止损并回退基线（并写入 evidence 的阈值/预算与触发原因）。
  - **Circuit Breaker**：当命中率持续过低、pattern 高基数、generation 高频 bump、warm-up 成本不可控等风险出现时，自动进入保守模式（模块级/版本级），优先回退 `full`，避免把负优化扩散到更多场景。
  - **Harness**：perf matrix + 对抗性边界地图；新增场景只能“进地图”（变成可回归输入），禁止“进执行器特判”。
  - **Audits/Timeline（Devtools，后续独立 spec）**：Runtime 只产出证据；Devtools 负责把证据变成“下一步建议”（稳定 Audit ID + 可操作建议 + 最小行动入口），并把新问题的进入路径收敛为：新增边界地图点 +（必要时）补 evidence 字段（避免执行器特判化）。
- **Anti-patch rule（强制收敛的修复路径）**：任何新发现的负优化/异常波动，只允许通过以下三类改动进入系统：
  1. 新增/扩展 perf matrix 或 adversarial map 场景；
  2. 补齐/稳定 `Planner Evidence` 字段（让决策可解释、可聚合、可回放）；
  3. 调整 Policy 的阈值/预算/断路器策略（或模块级回退配置）。
     禁止在执行器/patch 生成/Devtools 展示层添加场景特判来“修一个 case”。

#### 建议的落地切片（用于 plan；不改变本 spec 的门槛）

- **Phase A（先立骨架，策略先保守）**：`ConvergePolicy` 接口 + 最小 Evidence Schema + 决策预算止损 + Execution Plan Cache（上界/失效/自我保护）+ 最小对抗性边界地图（可跑可回归）。
- **Phase B（可解释的代价模型）**：引入启发式 cost model（阈值 + margin + 可解释字段），让稀疏写入稳定吃到收益，同时仍以 `full` 为下界。
- **Phase C（稳定性系统能力）**：断路器（低命中/高基数/generation 抖动/warm-up）与在线校准（按模块/代际分桶），把不确定性转化为可控风险。

#### 明确非目标（避免范围膨胀；Post-013 可以再做）

- 不要求在 013 内完成 Transaction Loop 的“全整型 Kernel Switch”（见上文 Phase 4 路线）；但必须保证 013 引入的 ID/IR/Cache 设计可复用、不锁死在 Planner 私有实现里（见 FR-023）。
- 不要求在 013 内引入离线训练/复杂 ML；但若引入任何“更聪明”的策略，仍必须走同一 Policy 边界并满足预算/回退/证据/回归门。

#### SSoT 对齐与迁移（本次必须完成）

> 背景：013 引入/强化了 `traitConvergeMode=auto`、`requestedMode vs executedMode`、决策预算与可解释证据等契约。为了避免“规范/实现/文档各说各话”，本特性必须把已识别的漂移面一次性收敛，并给出清晰迁移口径。

- **已识别的漂移面（必须在本特性内收敛）**：
  - **Runtime SSoT（行为语义）**：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.md` 当前 converge 策略仅描述 `full|dirty`，需补齐 `auto`（requested vs executed）、下界门槛、决策预算止损、cache 证据与失效/自保护的语义口径。
  - **Debug 协议 SSoT（证据字段）**：`docs/ssot/runtime/logix-core/observability/09-debugging.md` 的 `traitSummary` 目前是“预留不锁死结构”，本特性需固化最小可用的 converge 证据形态（例如 `trait:converge` 事件/summary schema）并对齐 `off|light|full` 分档裁剪规则。
  - **用户文档（产品视角）**：`apps/docs/content/docs/**` 中涉及 `traitConvergeMode`/converge/Devtools 的章节需更新：默认 `auto`、如何模块级回退 `full|dirty`、以及如何通过证据字段定位回归与调参。
  - **运行时对外 API / 类型裁决**：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/core/env.ts`、`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 当前 `traitConvergeMode` 仅 `full|dirty` 且默认 `full`，需升级为 `full|dirty|auto` 且默认 `auto`，并新增 `traitConvergeDecisionBudgetMs` 以及模块级覆盖的可配置入口。
  - **历史 Spec 口径**：`specs/007-unify-trait-system/review.md` 等文档仍以 `traitConvergeMode="full"|"dirty"` 作为默认口径，需明确标注被 013 更新/替代的部分，避免读者误用旧默认与枚举约束。
- **迁移口径（不做兼容层，但必须可操作）**：
  - 若业务需要维持旧行为：在 Runtime 或模块级显式设置 `traitConvergeMode="full"`（并在 quickstart + 用户文档给出示例与“何时应回退”的判断口径）。
  - 任何证据字段/事件 schema 的 breaking change 必须同步更新 `contracts/*`、`docs/specs` 与 `apps/docs`，并给出对比口径变更说明。

#### 宪法/SSoT 冲突面与收敛方案（把“矛盾”也写进规划）

> 目的：把“容易走向补丁化/局部化”的冲突面提前显式化，并给出硬约束的收敛点（Policy/Evidence/Harness，以及后续 Devtools 深挖入口）。

- **“更局部赢”（Provider override） vs “控制面统一收敛”**：允许 Provider 范围覆盖，但覆盖必须是**少数广谱旋钮**（mode/budgets/cache bounds/breaker）且可审计；Devtools 必须显式展示生效配置来源链与覆盖足迹，避免变相“每 case 一个开关”。
- **“RuntimeProvider 不暴露 stateTransaction props” vs 需要 Provider override**：不新增 React props；通过 `RuntimeProvider.layer`（Layer/Tag）做 Env 级差量覆盖，实现“继承全局 runtime 的 middleware/layer 后再扩展”，避免为局部调参复制构造新 runtime。
- **“最小 IR / Slim 且可序列化” vs 需要 Lighthouse 式建议**：Runtime 只产出 Slim evidence；“建议/下一步”放在后续 Devtools spec（离线规则），且输入只能来自 evidence（避免建议依赖 runtime 内部细节而漂移）。

### Functional Requirements

- **FR-001**: 系统必须提供 `traitConvergeMode` 的三种模式：`full` / `dirty` / `auto`，并且支持 **Module 级覆盖**（通过 Runtime 配置按 `moduleId` 覆盖；可热切换，下一笔事务生效；无需修改 Module 代码；覆盖优先级高于 Runtime 级默认）；未显式配置时 Runtime 级默认值为 `auto`。同时系统必须支持 **Provider 范围覆盖**（更局部赢）：通过 `@logixjs/react` 的 `RuntimeProvider.layer`（Layer/Tag）覆盖 converge 相关配置，仅对子树生效。
- **FR-002**: `auto` 模式必须保证一个“full 下界”：在任何事务中，`auto` 的实际执行路径不得比 `full` 更慢超过可配置噪声预算（默认 5%），且当无法做出可靠判断时必须直接选择 `full`；每个 module instance 的第 1 笔事务视为冷启动，必须 `full` 并标注 “cold-start fallback”。
- **FR-003**: `auto` 模式必须在稀疏写入场景自动选择增量路径，并且其执行 steps 数应与“受影响依赖范围”近似线性，而不是与“总 steps 数”线性。
- **FR-004**: 系统必须提供模块级回退手段：业务可通过 FR-001 的 Module 级覆盖入口将某模块切回 `full`（或固定 `dirty`），且切换后下一笔事务立刻生效，不得污染其他模块或其他实例的策略状态。
- **FR-005**: 决策与执行必须可解释：当 `Diagnostics Level=light|sampled|full` 时，每次事务提交的可序列化摘要中必须包含 “请求模式 / 实际执行模式 / 决策原因（含受影响 steps、总 steps、成本估算或回退原因）”；其中执行模式枚举为 `full|dirty`（`auto` 仅出现在请求模式），`dirtyAll` 用单独 flag/原因字段表达。`Diagnostics Level=off` 时允许不产出该摘要（见 Clarifications 2025-12-18 与 NFR-013）。
- **FR-006**: 决策过程必须满足事务窗口约束：不得在事务窗口内引入 IO/异步等待；决策逻辑必须纯同步（不得引入 `Promise`/`Effect.async`/`Effect.promise`/`Effect.tryPromise` 等异步边界），并提供测试或静态扫描断言该约束；不得引入不可控的全量扫描；决策开销必须有明确上界并可测量，并支持“超过 `traitConvergeDecisionBudgetMs` 即立刻回退 full”的止损机制（模块级可配置，默认 0.5ms）；收敛执行仍受 `traitConvergeBudgetMs` 约束（执行预算）。
- **FR-007**: 现有正确性语义不得被破坏：未知写入必须退回全量；多写者/环必须硬失败并阻止提交；列表/动态行的路径归一化口径与 009 保持一致且可解释。
- **FR-008**: 诊断与回放面必须保持确定性：事务/事件/步骤相关标识不得依赖随机数或时间戳作为默认（沿用稳定 instanceId/txnSeq/opSeq/eventSeq 的约束）。
- **FR-009**: 若系统仍保留 `dirty-set`/patch/trace 等诊断能力，则 `auto` 的决策与执行摘要必须在 `off/light/sampled/full` 分档下满足各自的“零或近零成本”要求（关闭时不得产生额外保留数据）；分档语义：
  - `off`：禁止保留 patch/operation，不进入诊断缓冲区；
  - `light`：仅保留事务摘要与聚合计数（不记录单条 operation）；
  - `sampled`：仅在确定性采样命中时追加少量 per-step 计时/Top-N hotspots 摘要（Slim、可序列化、有界），未命中时等价于 `light`；
  - `full`：记录时间线与 SlimOp（仍需可序列化、可裁剪、有界）。
- **FR-010**: Devtools/平台消费侧必须能够稳定消费 `auto` 的最小决策摘要；当 `light` 模式缺失 patch 序列或细粒度 trace 时，展示层必须显式降级（提示/占位），不得因字段缺失导致白屏或错误展示。
- **FR-011**: 系统必须对“重复出现的 dirty-pattern”复用决策结果以降低热路径开销，并提供安全失效条件：当模块的派生图/依赖关系发生变化时，历史决策不得被错误复用（必须自动失效或显式隔离到新版本）。
- **FR-012**: 系统必须提供一种“结构化的路径/依赖标识”以降低热路径上的分配与比较成本，使 `auto` 的决策开销随模块规模增长时仍保持可控；该标识应支持 build 阶段静态分配的整型 ID，并支持紧凑集合表示（如 bitmask/bitset/typed array）用于依赖重叠判断；同时必须可映射回可解释的路径表示，保证诊断与回放不丢信息。
- **FR-013**: 系统必须为 “Execution Plan Cache” 定义明确的资源上界：至少包括容量上限（条目数或等价预算）、缓存策略（推荐 LRU 或等价可解释策略）、逐出/清空触发条件、以及可观测的逐出统计；缓存作用域必须为 module instance（`moduleId + instanceId + Cache Generation`），不得跨模块或跨实例共享条目；不得出现“cache 随运行无限增长”的行为。
- **FR-014**: 系统必须在命中率持续过低或高基数 dirty-pattern 出现时提供自我保护机制，以避免缓存从“加速器”退化为“负优化源”；该机制必须可解释、可调参、且支持模块级禁用缓存复用而不影响语义正确性。
- **FR-015**: 系统必须定义 dirty-pattern 的稳定 key 口径：以“归一化 + 去冗余 + 排序后的 dirty-roots 集合”为 canonical key（列表/动态行不得因索引差异造成不必要的 key 膨胀，例如 `items[0].value` 与 `items[1].value` 应归一化到同一 root，如 `items[].value`），并能映射回可解释的路径集合用于诊断；key 表达必须基于整型 ID（如 sorted int array / bitset），不得通过字符串拼接或序列化构造 key 以避免热路径 GC 与哈希成本；该归一化允许一定的 over-execution（影响面从单行扩大到 list-level），视为降低 pattern 基数的 trade-off，只要满足 `auto <= full * 1.05` 的下界门槛则不引入 index-敏感 pattern。
- **FR-016**: 系统必须提供 cache 失效的正确性保障：当派生图/依赖关系发生变化时，旧缓存必须自动失效；该行为必须可被测试验证，且在摘要中可观测（例如代际/版本号变化与 miss 原因）。
- **FR-017**: Planner/Runtime 内核接口必须以整型 ID 作为唯一交换格式（FieldPath/Step 等），字符串 Key/Path 只允许在边界处映射一次；Planner 的输出（Execution Plan）必须是纯数据（ID 列表/紧凑集合），不得包含闭包、Effect 或对业务对象的引用，以保证可缓存复用、可 JSON 序列化、可做 fuzz 测试，并为未来替换 Wasm 内核预留接口。
- **FR-018**: 系统必须在 Module 的 build/加载阶段生成并缓存静态 Converge IR（如 `FieldPathId`/`StepId` 映射、依赖邻接表、以及 `full` 模式的静态 topo order 等紧凑数组结构）。
- **FR-019**: 在同一 `Cache Generation` 内，`full` 调度必须复用静态 topo order；`auto` 的 cache-hit 路径必须复用 Execution Plan；不得在每笔事务重复执行 `O(V+E)` 的全量图遍历/拓扑排序或等价的线性扫描热路径。
- **FR-020**: 当 `Cache Generation` 变化时，静态 Converge IR 与 Execution Plan Cache 必须整体失效并重建；该失效原因必须可观测并可被回归测试覆盖（例如 generation 变化 + miss reason）。
- **FR-021**: `Cache Generation` 的 `generation++` 触发源必须显式枚举为有限集合（例如 converge writers/依赖图结构变更、模块逻辑安装/卸载、imports scope 变化等），并在事务摘要中提供最小可观测证据（例如 `generation`、`generationBumpCount` 或 `lastBumpReason`）；若 generation 发生高频抖动导致缓存“刚热身就失效”，系统必须视为负优化风险并触发自我保护（优先回退 `full` 或暂时禁用复用），且该行为需可解释。
- **FR-022**: `auto` 决策必须收敛在明确的 Policy 边界内：执行器只允许 `full|dirty` 两条路径；Policy 必须输出 `executedMode` 与可序列化的 `Planner Evidence`，且在 `executedMode=dirty` 时输出纯数据 `Execution Plan`（可缓存复用、可 JSON 序列化），不得通过在执行器内新增场景特判来修复负优化。
- **FR-023**: `FieldPathId`（以及后续 `StepId` 等结构化 ID）必须设计为 **Module 级可复用的注册表/服务**（挂载在 `ModuleRuntime` 或等价可共享位置），不得隐藏为 Planner 私有 Map；必须同时支持 hot 的 `path → id` 与 cold 的 `id → path`（仅用于 debug/导出）双向查表，并为未来 `BitSet/TypedArray` 的集合运算提供接口落点（见 FR-012/FR-017/FR-018 的整型交换格式约束）。
- **FR-024**: 系统必须定义 converge 配置覆盖的**确定性优先级**与**作用域语义**：`RuntimeProvider` 覆盖 > runtime 的 `moduleId` 覆盖 > runtime 默认 > 内置默认；任意覆盖切换必须在“下一笔事务”生效（禁止半事务切换），且不得污染其他模块/实例/Provider 子树。
- **FR-025**: 系统必须在 `trait:converge` evidence 中输出“本次生效配置的来源/范围”最小证据（例如 `configScope: provider|runtime_module|runtime_default|builtin`）以支撑审计、回收与后续 Devtools 深挖入口；缺失时消费者必须降级为“来源未知”的显式提示。

### 对外性能心智模型（可预测、可预期、稳定）

> 目标：交给用户的只有少量稳定概念，用户不需要理解内部算法也能预测边界，并知道何时介入手动优化。

- **关键词（≤5）**：Transaction（事务窗口）、Patch/Dirty-set（写入范围）、Converge Mode（`full|dirty|auto`）、Diagnostics Level（`off|light|full`）、Overrides（Module/Provider 覆盖与回退）。
- **粗粒度成本模型（用于预期）**：
  - `full`：成本随模块 steps 规模近似线性增长；
  - `dirty`：成本随受影响 steps 与 dirty-roots 规模增长（写入越聚焦越便宜）；
  - `auto`：默认推荐；在两者之间自动选择，并以 `full` 作为性能下界（不确定就回退 full）。
- **稳定“优化梯子”（从不干预到强干预）**：
  1. 默认使用 `auto`；
  2. 通过事务摘要/Devtools 观察本次决策与原因（受影响 steps、回退原因、cache hit/miss、budget cut-off）；
  3. 优先缩小写入范围（避免 `dirtyAll=true`，避免“未知写入”），让 dirty-set 更稀疏；
  4. 列表/动态行确保稳定 rowId（避免 index 语义导致 pattern 基数爆炸）；
  5. 必要时进行模块级覆盖（固定 `full` / `dirty`）或调参（预算/容量），并保留随时回退的刹车片；
  6. 极端场景下拆分模块或重构派生图（减少 steps 与依赖密度）。
- **词汇与证据稳定性**：对外文档与压测报告（014）必须使用同一套术语；事务摘要中的关键证据字段（模式/原因/阈值/统计）视为对外契约的一部分，若发生 breaking change 必须提供迁移说明与对比口径更新。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统必须提供一份可复现的性能矩阵脚本，覆盖至少：
  - steps 规模（小/中/大）；
  - 写入分布（稀疏/中等/广泛/接近全量）；
  - 列表/动态行写入的代表性场景；
    并输出每点的中位数与 p95。默认每个矩阵点至少运行 5 次，并记录同机重复运行的波动（默认目标：p50/p95 相对误差 ≤ ±3%，可配置且需给出理由）。
- **NFR-002**: `auto` 的性能门槛必须被写成可执行的断言（脚本或测试门）：每个矩阵点都满足 `auto <= full * 1.05`（默认噪声预算 5%，可配置但必须有理由）。
- **NFR-003**: `auto` 的决策开销必须可观测并受控：在事务摘要中输出决策耗时/估算成本字段（可选采样），并确保在大 steps 情况下仍满足“相对 full 不明显放大”的目标。
- **NFR-004**: 诊断必须 Slim 且可序列化：auto 相关决策信息必须可 JSON.stringify；不得引入不可序列化对象或闭包。
- **NFR-005**: 系统必须同步更新对外文档，提供稳定、可预测的性能心智模型：关键词（≤5）、粗粒度成本模型、优化梯子（默认→观测→缩小写入→模块级覆盖/调参→拆分），并解释：`auto` 的保底原则（full 下界）、分档下的可见信息差异、以及“如何在模块级回退/调参”。
- **NFR-012**: 观测协议兼容性：`trait:converge` evidence 必须能作为 `specs/009` Dynamic Trace 的事件 payload 导出，并能被 `specs/005` 的宿主无关观测协议（Envelope + EvidencePackage）承载与回放；字段必须 Slim、可 JSON 序列化，且新增字段不得破坏旧消费者的“忽略未知字段”策略。
  - `Diagnostics Level=light` 仅导出 `staticIrDigest`；`full` 除 `staticIrDigest` 外，还必须在 EvidencePackage 中按 `staticIrDigest` 去重导出 `ConvergeStaticIR`（同一 `instanceId:generation` 只出一次），供离线解释/回放（事件通过 digest 引用）。
  - Devtools converge performance pane（Timeline/Audits）由后续独立 spec 落地：`specs/015-devtools-converge-performance/spec.md`。
- **NFR-013**: 诊断分档语义必须确定且可验收：当 `Diagnostics Level=off` 时，系统不得产出任何可导出的 `trait:converge` 事件/摘要（且不得触发递归序列化/降级扫描）；当为 `light|full` 时，才允许导出 `trait:converge` 证据（且必须 Slim、可 `JSON.stringify`）。
- **NFR-014**: 013 的“full 下界”性能 gate 必须与 014 的观测口径对齐：`auto <= full * 1.05` 的硬门槛绑定 `metricCategories.category=runtime`（事务提交/收敛相关 runtime 指标）；`category=e2e` 可记录并展示但不作为 gate（避免把 React/布局等噪声引入“收敛内核下界”判定）。
- **NFR-015**: `Diagnostics Level=light` 的 converge 证据必须保持轻量：`trait:converge.data.dirty` 在 light 档位仅允许输出 `dirtyAll`（禁止输出 `roots/rootIds` 列表）；pattern 细节仅在 `full`（或显式采样）下输出，并仍需满足 Slim/JsonValue 预算。
  - `Diagnostics Level=full` 下允许输出 `roots/rootIds` 以提升可解释性，但必须严格受控：仅输出 `rootCount` + `rootIds` 前 K 个（默认 K=3，可配置；硬上界 16）+ `rootIdsTruncated=true|false`；禁止默认输出全量 `rootIds` 列表，避免在高基数场景撑爆 evidence。
- **NFR-016**: 013 的“full 下界”硬门槛默认在 `Diagnostics Level=off` 下验收（避免观测开销污染）；`light|full` 的开销应在 014 报告中作为独立维度记录与对比，但不得影响 `auto <= full * 1.05` 的 pass/fail 结论。
- **NFR-006**: 系统必须提供一个“决策开销”专项的可复现基准：覆盖 cache miss / cache hit / budget cut-off 三类路径，并能证明决策开销在模块级决策预算（`traitConvergeDecisionBudgetMs`）内被稳定控制（默认 0.5ms，可配置）。
- **NFR-007**: 系统必须提供一个“缓存边界”专项的可复现基准：覆盖高基数随机 dirty-pattern、低命中率、容量逐出、以及列表/动态行归一化场景，并能证明缓存不会引入新的长期负优化（时间与空间均受控）。
- **NFR-008**: 当 `Diagnostics Level=light|full` 时，事务摘要中必须提供最小 cache 证据字段以支持排障：至少包含 cache size、hit/miss、evict 计数、以及失效代际/版本信息（允许采样，但采样策略必须可解释且不会污染 off 档）。
- **NFR-009**: 在 `full` 诊断档位下，Operation 级事件必须使用 SlimOp（仅投影 `opId` / `kind` / `timing` 等元数据）；对 `meta` / `payload` 做递归截断与过滤（例如超长字符串 >256 chars 截断、非 POJO 丢弃），确保事件始终可 `JSON.stringify` 且 ring buffer 内存上界可控。
- **NFR-010**: 系统必须提供一条可执行的“决策纯同步性”约束门：自动策略的决策路径不得引入 `Promise` 或 `Effect.async`/`Effect.promise`/`Effect.tryPromise` 等异步边界，并能通过单元测试或静态扫描在 CI 中稳定断言。
- **NFR-011**: 系统必须提供 Static IR 构建耗时的可复现基线与证据：至少在浏览器基线（014）中输出 `staticIrBuildDurationMs` 的中位数与 p95，并在大 steps 场景下评估是否会产生可感知掉帧；若构建耗时显著（例如 p95 超出 014 的体验预算档位），plan 必须给出分片构建/Worker 预计算/或可解释的“首次加载阻塞可接受范围”预案（不要求本阶段立刻引入 Worker，但必须有可验证的证据与降级路径）。

### Assumptions & Dependencies

- 本文中的三位数编号（如 005/009/014/016）均指 `specs/<三位数>-*` 下的对应 spec；如存在歧义，以目录名为准。
- 本特性以 009 已确立的稳定标识、诊断分档（`off/light/sampled/full`）与路径归一化口径为前提，不重新定义这些契约。
- 上层依赖链路（Runtime V3 加固集群视角）：`016（可序列化证据与稳定身份）` → `011（Lifecycle 容器/严格屏障）` → `013（Planner 控制面）` → `010（Form 场景验收）`。013 不直接依赖 010 的领域语义，但会被 010 的高压矩阵点反向验证与驱动补齐边界用例。
- 运行时侧的微优化落地模式（Dirty Pattern/Plan Cache、Structural ID、决策预算止损、SlimOp、Integer-only 等）参考 `docs/ssot/handbook/reading-room/impl-notes/01-micro-optimizations.md`，但以本 spec 的 FR/NFR 为最终裁决。
- Devtools/平台消费侧需要能够消费并展示 `auto` 的最小决策摘要（即便在 `light` 下缺失细节也必须可用）。
- 性能边界与回归对比的浏览器端基线优先复用 `specs/014-browser-perf-boundaries` 的维度矩阵与报告口径（跑道与固化流程以 014 为准）；本特性只在必要时补充 Node/micro-benchmark 作为辅助证据，不得替代主跑道。

### Key Entities _(include if feature involves data)_

- **Converge Mode**: `full | dirty | auto`，表示派生收敛的策略选择请求。
- **Converge Execution Mode**: 本次事务实际执行的路径枚举（`full | dirty`），用于 Devtools 展示与基准对比；`auto` 仅作为请求模式出现，`dirtyAll` 用独立 flag/原因字段表达。
- **FieldPath**: canonical normalized field path as segments（段数组；无索引、无 `*`）；复用 `specs/009-txn-patch-dirtyset/contracts/schemas/field-path.schema.json` 的约束。
- **FieldPathId**: 在 Module build/加载阶段为每个 canonical fieldPath 分配的整型 ID（仅在同一 `Cache Generation` 内稳定），用于 Dirty Pattern 与依赖重叠判断；跨 session/跨运行不保证稳定，不作为对外持久化契约。
- **StepId / StepIndex**: 在 Module build/加载阶段为每个 converge step 分配的整型 ID/索引（仅在同一 `Cache Generation` 内稳定），用于 Execution Plan 的紧凑表示与执行循环查表；跨 session/跨运行不保证稳定，不作为对外持久化契约。
- **StepOutFieldPathIdByStepId**: 与 `StepId` 同索引的数组，记录每个 converge step 的输出 `FieldPathId`；用于离线解释 `stepStats/topSteps` 等 evidence，并可通过 `fieldPaths: FieldPath[]` 映射回可读路径。
- **Dirty Pattern**: 归一化 + 去冗余 + 排序后的 dirty-roots 集合（建议以整型 ID 列表表示），作为 Execution Plan Cache 的 key，可映射回可解释的路径集合。
- **Dirty Roots Summary**: `Diagnostics Level=full` 下用于解释本次写入形状的受控摘要：`rootCount` + `rootIds`（前 K 个样本；硬上界 16）+ `rootIdsTruncated`；`rootIds` 建议为 `FieldPathId` 样本并通过 `ConvergeStaticIR` 映射回路径。
- **Execution Plan**: Planner 输出的“需要执行哪些 steps”的纯数据结果（优先 `Int32Array` 的 `StepId/StepIndex` 列表或等价紧凑结构），不得包含闭包或 Effect，可被缓存复用并可序列化。
- **Planner Evidence**: 用于解释决策的一组可序列化数据（例如受影响 steps、总 steps、成本估算、回退原因、冷启动状态）。
- **Planner Decision Budget**: `traitConvergeDecisionBudgetMs`（ms），用于约束 `auto` 决策耗时；超过预算必须立刻回退 `full`（默认 0.5ms，模块级可覆盖）。
- **Converge Execution Budget**: `traitConvergeBudgetMs`（ms），用于约束派生收敛执行（执行预算；沿用既有预算语义）。
- **Execution Plan Cache**: 以 Dirty Pattern 为 key，在 module instance + `Cache Generation` 范围内缓存可复用的 Execution Plan/受影响 steps 结果，并具备可解释的命中/失效信号。
- **Structural Path Identity**: 用于降低热路径分配与比较成本的结构化标识（建议 build 阶段静态分配整型 ID），可映射回可解释的路径表示。
- **Converge Static IR**: 在 Module build/加载阶段生成的静态依赖图与调度数据（整型 ID 映射 + 邻接表/拓扑序等紧凑数组），在同一 `Cache Generation` 内复用并在变更时整体失效。
- **Static IR Digest**: 用于将 `trait:converge` 事件与其对应的 `ConvergeStaticIR`（EvidencePackage 内去重导出）关联起来的引用标识；定义为 `instanceId + ":" + generation`；必须可序列化且在同一 evidence 包内稳定。
- **Perf Matrix**: 一组标准化的基准场景定义与统计口径，用于持续验证 “auto 不低于 full 的及格线”。
- **Cache Budget**: 用于约束缓存资源消耗的上界（容量/逐出/禁用策略），并可被观测与调参。
- **Cache Generation**: 描述缓存与派生图版本之间关系的“代际/版本”信息，用于正确性失效与排障。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在标准性能矩阵中，`auto` 在所有矩阵点满足 `auto <= full * 1.05`（中位数与 p95 统计口径一致），且基线可复现。
- **SC-002**: 在稀疏写入矩阵点，`auto` 相对 `full` 有显著收益（建议中位数至少 1.4x 以上提升，或满足 `auto <= full * 0.70` 的门槛）。
- **SC-003**: 当 `Diagnostics Level=light|full` 时，每次事务的导出摘要均可解释 auto 决策，并且可被序列化与持久化到证据包中（`JSON.stringify` 不失败）。
- **SC-004**: 业务可在模块级把 `auto` 切回 `full`，并立即恢复到稳定基线（可通过同一矩阵点验证）。
- **SC-005**: Devtools/平台侧在 `light` 模式缺失 patch/细粒度 trace 时仍可稳定展示（显式提示/占位），不得出现白屏或崩溃。
- **SC-006**: 对外文档已更新并可被用户理解：用户能在不阅读实现细节的情况下形成稳定心智模型（关键词/成本模型/优化梯子），并理解 `auto` 的保底原则与回退/调参入口。
- **SC-007**: 在“重复 dirty-pattern”的场景中，第二次及后续出现的决策耗时可被证明显著低于首次（以 cache hit 指标与基准脚本证明）。
- **SC-008**: 在“决策对抗性场景”中，`auto` 能在模块级决策预算（`traitConvergeDecisionBudgetMs`）内稳定止损并回退 full（以 budget cut-off 指标与基准脚本证明），且不会放大总体回归风险。
- **SC-009**: 在“高基数/低命中率”的场景中，缓存资源占用保持在明确上界内（容量/逐出可见），且 `auto` 仍满足 `auto <= full * 1.05` 的下界门槛，不因缓存膨胀导致新的长期回归。
- **SC-010**: 在“图变化/失效”场景中，旧缓存不会被误用；系统能以可观测字段证明发生了正确失效，并通过回归测试覆盖。
