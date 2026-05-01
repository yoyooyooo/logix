# Feature Specification: Toolkit Layer SSoT

**Feature Branch**: `147-toolkit-layer-ssot`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "规划官方 @logixjs/toolkit 作为 core-first 之后的官方二层，明确其定位、Core-first/Toolkit-second 准入门禁、Agent First 约束、与 core/domain/form/react host law 的边界，以及如何从 examples 与 call surfaces 提炼 support/helper/sugar 到 toolkit。"

## Normative Authority

当前 live authority 固定在：

- [../../docs/ssot/runtime/11-toolkit-layer.md](../../docs/ssot/runtime/11-toolkit-layer.md)
- [../../docs/ssot/runtime/12-toolkit-candidate-intake.md](../../docs/ssot/runtime/12-toolkit-candidate-intake.md)
- [../../docs/adr/2026-04-18-official-toolkit-layer.md](../../docs/adr/2026-04-18-official-toolkit-layer.md)

这份 spec 只保留 feature scope、traceability 与规划闭环。
若与 live authority 冲突，以 live authority 为准。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: `NS-3`, `NS-4`
- **Kill Features (KF)**: `KF-3`, `KF-9`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者收口官方二层定位 (Priority: P1)

作为维护者，我需要一套清晰的 toolkit 定位、层级关系和准入门禁，好把不该进 core 的 support、helper、sugar、recipe 收口到同一个官方二层，而不再把这些讨论散落在各个 examples、proposal 和 leaf page 里。

**Traceability**: `NS-3`, `NS-4`, `KF-3`, `KF-9`

**Why this priority**: 如果 toolkit 的层级与门禁不先冻结，后续任何 helper 升格讨论都会继续在 core truth、domain package、examples residue 和私人口味之间摇摆，公共语义无法闭合。

**Independent Test**: 只阅读 docs/ssot 与 ADR，不看代码实现，维护者就能判断一个候选 helper 应该进入 core、toolkit，还是继续留在业务项目局部封装里。

**Acceptance Scenarios**:

1. **Given** 一个需要升格的 helper 候选，**When** 维护者阅读 toolkit layer 事实源，**Then** 能按固定门禁先判断它是否补的是 primitive contract，还是只是 DX 组合层。
2. **Given** 一个已经存在于 examples 的 wrapper，**When** 维护者对照 toolkit layer 文档，**Then** 能判断它是否只算 residue、是否值得进入 toolkit、以及它为什么不该直接进入 core。

---

### User Story 2 - Agent 与作者能区分 core truth 和 toolkit DX (Priority: P2)

作为 Agent 或业务作者，我希望知道 canonical spine 继续停在 core，而 toolkit 只是官方二层，这样我在日常 authoring 时能分清“底层真相”和“官方推荐封装”。

**Traceability**: `NS-3`, `KF-3`

**Why this priority**: 若 toolkit 与 core 的边界不明确，Agent 很容易把 toolkit 误学成第二套 authoring 主链，或者把 examples residue 误学成官方 truth。

**Independent Test**: 只根据 public API spine、React host boundary、Form route boundary 和 toolkit layer 文档，Agent 能解释 toolkit API 必须怎样回解到 core / domain primitives。

**Acceptance Scenarios**:

1. **Given** 一个 toolkit noun，**When** Agent 查看 toolkit layer 文档，**Then** 能知道它不能持有第二 runtime、第二 host law、第二 error truth、第二 list identity truth。
2. **Given** 一个教程或 example 想使用 toolkit，**When** 作者查看 docs 路由，**Then** 能知道 tutorial 若采用 toolkit 写法，仍必须给出 core 展开视图。

---

### User Story 3 - examples 成为候选素材池而不是隐性真相源 (Priority: P3)

作为维护者，我希望 examples 只作为候选素材池，而不是反向定义官方 surface，这样我可以基于真实反馈提炼候选，再按自己的节奏决定下沉 core 或升格 toolkit。

**Traceability**: `NS-4`, `KF-9`

**Why this priority**: examples 最容易积累本地便利层。如果不先把“素材池 vs 真相源”分开，仓库很容易被 demos 反向塑造公开 contract。

**Independent Test**: 只阅读 examples 与 toolkit 相关文档，维护者能判断“example 是素材”“toolkit 是官方收口点”“core 是最终真相层”这三层关系。

**Acceptance Scenarios**:

1. **Given** 一个 example 封装同时混合了 view 推导、error precedence 和 UI 叶子假设，**When** 维护者按 toolkit layer 文档审视，**Then** 能拆出其中哪些是 primitive 缺口、哪些只是 wrapper、哪些应继续停在业务项目。
2. **Given** 一个 docs 页面在介绍 form helper，**When** 作者对照 toolkit 与 core 边界，**Then** 不会再把 example residue 描述成官方 truth。

---

### User Story 4 - `call` 相关边界进入同一裁决框架 (Priority: P2)

作为维护者，我希望 `$.use(Tag)`、`Workflow.call({ service })`、`callById`、service port 组合、stepKey 组织方式这些 `call` 周边边界，也进入与 examples 相同的裁决框架，这样我可以先冻结哪些必须留在 core，再决定未来哪些 recipe 值得重开。

**Traceability**: `NS-3`, `NS-4`, `KF-3`, `KF-9`

**Why this priority**: 如果只看 examples 而不看 call surfaces，toolkit 会错过高风险边界；如果现在就把 call sugar 抬进 toolkit，又会重新制造第二套 orchestration truth。

**Independent Test**: 只阅读 toolkit layer、相关 spec 与 call 样本，维护者就能判断 `call` 周边对象哪些是 `closed core surface`、哪些是 `core gap`、哪些只是历史 recipe 素材。

**Acceptance Scenarios**:

1. **Given** 一个围绕 service port 组织的历史 recipe，**When** 维护者按 toolkit 门禁审视，**Then** 能判断它当前只算 recipe 素材，而不是新的 call truth。
2. **Given** 一个涉及 `serviceId / stepKey` 的候选，**When** 维护者按 toolkit 与 core 边界审视，**Then** 能判断它更像 identity primitive 议题，应优先回 core。

### Edge Cases

- 当一个候选能力看起来像 DX sugar，但实际隐含 owner、identity、projection 或 diagnostics truth 时，必须优先判定为 core 议题，而不是 toolkit 议题。
- 当一个 examples 封装只在单个 demo 中有价值，且没有跨场景复用密度时，必须允许它继续停在业务项目局部，不强行升格为 toolkit。
- 当 toolkit 封装和 core primitive 之间无法给出稳定的 de-sugared mapping 时，该能力不能进入 toolkit。
- 当某个领域包试图把 toolkit law 再内嵌回自己的 package root 时，必须被判为边界违规。
- 当一个 `call` 候选同时改动 `serviceId`、`stepKey`、workflow branch truth 或 error routing，它必须被视为 core 议题，而不是 toolkit 议题。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, KF-3) 系统 MUST 在 docs 层为 `@logixjs/toolkit` 建立单独事实源，明确其是 core-first 之后的官方 secondary layer，而不是 core public spine 的一部分。
- **FR-002**: (NS-3, KF-3) 系统 MUST 明确 `Core-first / Toolkit-second / Maintainer-curated` 的裁决顺序，使维护者先判断候选能力是否应进入 core，再判断是否进入 toolkit。
- **FR-003**: (NS-3) 系统 MUST 为 toolkit 定义可执行的准入门禁，区分 primitive contract 缺口、owner truth 缺口与仅提升 DX 的 support/helper/sugar/recipe/pattern kit。
- **FR-003A**: (NS-3, KF-3) 系统 MUST 规定：若候选只是对已冻结 raw truth 的 strict one-hop derivation，且不新增 acquisition route、第二对象真相或 policy，则它必须先回 core，归类为 `closed-core-surface` 或 `core-gap`，不得直接进入 `toolkit-first-wave`。
- **FR-004**: (NS-3) 系统 MUST 明确 toolkit 的 Agent First 约束，包括 noun 稳定、可预测、可展开、不可依赖隐藏上下文，以及必须可机械回解到 core / domain primitives。
- **FR-005**: (NS-4, KF-9) 系统 MUST 说明 examples 的角色是候选素材池，不能反向定义 toolkit truth；从 examples 提炼候选时，维护者必须能够判断哪些该进 core、哪些该进 toolkit、哪些继续停在业务项目。
- **FR-005A**: (NS-4, KF-9) 系统 MUST 把 `call` 相关 surfaces 纳入同一裁决框架，并优先冻结 `closed core surface`、`core gap` 与 `reject/residue`，避免先生成第二套 toolkit orchestration truth。
- **FR-006**: (NS-3) 系统 MUST 规定 toolkit 不得拥有第二套 runtime、第二套 host law、第二套 pure projection truth、第二套 verification control plane、第二套 error truth 或第二套 list identity truth。
- **FR-007**: (NS-4, KF-9) 系统 MUST 把 toolkit 的定位同步回写到受影响的 runtime / form / React host 边界页与 docs 索引页，避免出现 parallel truth。
- **FR-008**: (NS-3) 系统 MUST 规定 toolkit 若被 tutorial 或 examples 采用，文档必须能同时给出 core 展开视图，避免 DX 层把 canonical spine 遮蔽掉。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-3) toolkit 规划 MUST 保持 public concept-count 最小化，不得为了未来扩展预留第二 authoring 主链、第二 host route 或多组等价 noun。
- **NFR-002**: (NS-4) toolkit 规划 MUST 保持单点 authority，toolkit 的定位、门禁与禁止项必须能回链到唯一 leaf page，而不是散落在多个 sibling page 上。
- **NFR-003**: (NS-3, KF-3) toolkit 规划 MUST 保持可诊断性：对任一 toolkit wrapper，文档需要支持说明其 de-sugared mapping 与不变量，避免黑盒 magic。
- **NFR-004**: (NS-4, KF-9) toolkit 规划 MUST 支持后续从真实反馈中渐进提炼，不要求一次冻结具体 API 清单，但必须冻结“如何裁决是否升格”的规则。
- **NFR-005**: toolkit 规划 MUST 允许未来拆分卫星包，但当前不得提前扩大 package surface；第一阶段只冻结 `@logixjs/toolkit` 这一个官方包名。

### Key Entities _(include if feature involves data)_

- **Toolkit Layer**: 官方二层，承接不该进 core 的 support/helper/sugar/recipe/pattern kit，必须建立在 core 与 domain truth 之上。
- **Primitive Contract Candidate**: 一个真实反馈中暴露出的底层缺口，涉及 owner、identity、projection、diagnostics 或 verification truth，默认优先考虑进入 core。
- **Toolkit Candidate**: 建立在既有 truth 之上的高频 DX 封装，主要收益是降低样板、统一默认姿势与提高 authoring 效率。
- **Strict Derivation Corollary**: 建立在已冻结 raw truth 之上的一跳、严格、policy-free 派生；它优先视为 core projection corollary，而不是 toolkit sugar。
- **Example Residue**: examples 或业务项目中的局部封装样本，只作为候选素材池，不直接构成官方 truth。
- **Call Surface Candidate**: 围绕 `$.use(Tag)`、`Workflow.call({ service })`、`callById`、service port 组合、`serviceId / stepKey` 组织方式出现的样本；它们优先用于冻结 core 边界与 reject 集。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-3, KF-3) 维护者在阅读 toolkit 相关事实源后，能在 5 分钟内把任一候选归类为 `closed-core-surface`、`core-gap`、`toolkit-first-wave` 或 `reject-residue` 四者之一。
- **SC-001A**: (NS-3, KF-3) 对于建立在已冻结 raw truth 之上的 strict one-hop derivation，维护者能在 5 分钟内判断它应先回 core，而不是误判成 toolkit first-wave。
- **SC-002**: (NS-4, KF-9) docs 中关于 toolkit 的单点事实源能够被索引页正确路由，且受影响的 runtime / form / tutorial 页面不再出现与 toolkit 定位冲突的 parallel truth。
- **SC-003**: (NS-3) Agent 只凭公开文档就能解释 toolkit 与 canonical spine 的关系，并说明 toolkit API 不能改写哪些 core / domain 不变量。
- **SC-004**: (NS-4) examples 可以继续作为候选素材池存在，但维护者能明确指出“这只是素材，不是官方 truth”，且后续提炼流程有固定裁决门禁。
- **SC-005**: (NS-4) `call` 相关 surfaces 进入裁决框架后，维护者能先冻结 core 边界与 reject 集，而不会因为 `call sugar` 再长出第二 orchestration truth。
- **SC-006**: 文档在冻结 toolkit 层定位后，不需要立即冻结具体 API 清单，也不会因为缺少 API 清单而重新长出“是否属于 core / toolkit”的歧义。
- **SC-007**: 持续识别协议与持续追加台账分离：稳定 intake 规则进入 SSoT，活跃 candidate ledger 进入 internal，不再让 proposal 长期充当工作台。
