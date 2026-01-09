# Feature Specification: Loader Spy 依赖采集（加载态自描述证据：不作权威）

**Feature Branch**: `084-loader-spy-dep-capture`  
**Created**: 2026-01-09  
**Status**: Draft  
**Input**: 在加载态/构造态引入“Spy Context”证据采集能力：当逻辑在初始化阶段通过 `$.use(Tag)` 获取服务时，Spy 记录“被使用到的依赖”作为动态证据，用于建议生成、对齐校验与 Devtools 解释；但严格强调该证据 **不成为长期权威事实源**（单一真相源仍在源码显式声明）。

## Context

平台想知道 Module↔Service 关系，既可以通过显式声明（最佳），也可以通过试跑/加载态证据（辅助）：

- 纯动态采集（TrialRun/Spy）覆盖不完备，且容易被分支/环境/副作用影响；
- 纯静态解析（Parser）在遇到动态/黑盒形态时会降级。

因此 Loader Spy 的合理定位是：

- 作为 **证据与建议**：帮助发现“声明缺口”与“声明 vs 实际使用”的偏离；
- 作为 **校验输入**：在 CI/Devtools 中解释为什么需要某个依赖；
- 明确不是权威：最终关系必须写回源码（见 `078/079`），宁可漏不乱补。

## Clarifications

### Session 2026-01-09

- AUTO: Q: 是否能硬性保证“零 IO 副作用”？→ A: 不能对任意 JS 代码做硬保证；MVP 以 best-effort 隔离/缺服务/预算与超时收束为主，并必须输出 `coverage.limitations` 与结构化 `violations`。
- AUTO: Q: Browser 是否执行采集？→ A: MVP 不在浏览器端执行采集（Node-only Harness）；浏览器侧只消费报告。
- AUTO: Q: occurrences 怎么记录？→ A: `usedServices[]` 去重但保留聚合计数（不记录逐次调用明细）。

## Goals / Scope

### In Scope

- 在“受控加载/构造阶段”采集 `$.use(Tag)` 的使用证据，并输出结构化报告（可序列化、确定性）。
- 明确报告的覆盖局限：仅代表当前执行路径/初始化路径中实际触达的依赖使用点。
- 支持把采集结果作为建议输入：用于提示“可能缺失的 services 声明”或“声明未使用/使用未声明”的偏离。

### Out of Scope

- 不追求穷尽覆盖全部分支（不把它当静态分析替代品）。
- 不把采集结果直接写回源码（默认 report-only；写回必须经过 `079` 的保守判定与 rewriter）。
- 不允许在采集过程中产生对外 IO 副作用；若发生违规必须可解释失败。
- MVP 不在浏览器端执行采集（Node-only Harness）；浏览器侧只消费报告。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台可在加载态采集服务使用证据，用于建议与解释 (Priority: P1)

作为平台/Devtools 维护者，我希望在加载模块时就能拿到“哪些服务被实际使用到”的证据清单，并能在诊断界面解释：这些依赖来自哪些模块/逻辑单元、在什么阶段被使用；同时明确这不是穷尽的静态事实。

**Why this priority**: 它能在不跑完整业务交互的前提下补充解释链路，尤其在“作者忘写声明”时提供行动线索。

**Independent Test**: 对同一模块以受控加载方式采集两次，证据输出稳定一致；当逻辑未触达某分支依赖时，该依赖不会被误报为“已使用”。

**Acceptance Scenarios**:

1. **Given** 一个模块在初始化阶段使用若干服务，**When** 执行 Loader Spy 采集，**Then** 输出包含被使用的服务标识清单（稳定、可序列化），并能关联到 `moduleId` 与可用的定位信息。
2. **Given** 依赖仅在条件分支中使用且未被触达，**When** 执行采集，**Then** 该依赖不出现在“已使用”清单中（避免误导）；报告需标注覆盖局限。

---

### User Story 2 - 发现“声明 vs 实际”偏离，并以可解释方式报告 (Priority: P2)

作为仓库维护者，我希望系统能把“声明的 services”与“Spy 观测到的实际使用”做对照：声明但未使用/使用但未声明都能被结构化报告出来，用于门禁策略与 Devtools 解释。

**Why this priority**: 它能把“隐藏漂移”显式化，减少试跑/回放时的 surprise。

**Independent Test**: 构造一个声明缺失/声明冗余的模块，执行对照，得到稳定可 diff 的偏离报告。

**Acceptance Scenarios**:

1. **Given** 声明了某服务但初始化未使用，**When** 对照，**Then** 报告标记为“declared-but-not-used（evidence-limited）”而非直接失败（默认）。
2. **Given** 初始化使用了某服务但未声明，**When** 对照，**Then** 报告标记为“used-but-not-declared”，并给出建议（默认 `port=serviceId`）。

## Edge Cases

- 初始化阶段触发了不可控副作用（IO/随机/时间）：必须可解释失败，并明确指出违规来源。
- 长驻逻辑导致采集无法结束：必须有预算/超时/收束策略，并在报告中可解释。
- 多模块组合/多次加载：证据需要带 session/run 锚点，避免混淆。
- 同一服务多次使用：必须去重，避免证据膨胀；同时保留 `occurrences` 聚合计数（不记录逐次调用明细）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供受控的 Loader Spy 采集能力，输出“服务使用证据清单”并可序列化为 JSON。
- **FR-002**: 输出 MUST 明确覆盖语义：它是 best-effort 的动态证据，不承诺穷尽所有分支；必须包含覆盖局限标记（不提供行级覆盖率/真实覆盖统计）。
- **FR-003**: 系统 MUST 支持把证据与“显式声明（Manifest/servicePorts）”做对照，并产出结构化偏离报告。
- **FR-004**: 采集默认 MUST 为 report-only：不得直接写回源码；任何写回必须交由 `079/082` 的保守补全与回写链路。
- **FR-005**: 采集过程 MUST 受控且默认只读：对外 IO 为契约禁止项；MVP 以 best-effort 隔离/缺服务/预算与超时收束为主，无法对任意 JS 代码硬性证明“绝对无 IO”，因此必须在 `coverage.limitations` 中声明局限，并在可检测到的违规场景输出结构化 violations。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 输出 MUST slim 且可序列化；存在预算/截断与可解释降级。
- **NFR-002**: 采集 MUST 有资源上界（时间/并发/输出大小），并在超限时可解释失败或部分结果输出。
- **NFR-003**: 证据锚点 MUST 稳定：服务标识与模块标识去随机化；避免把进程对象引用写入报告。
- **NFR-004**: 在 `$.use` 热路径上的插桩 MUST 默认零成本或接近零成本（未注入 SpyCollector 时不得引入可观测回归）；变更必须通过可对比的性能证据验证。

### Key Entities _(include if feature involves data)_

- **Spy Evidence Report**: Loader Spy 输出的结构化证据（usedServices/coverage/violations/diffs…）。
- **Coverage Marker**: 覆盖局限标记与解释字段（声明该证据的适用边界）。
- **Deviation Report**: “声明 vs 实际”偏离对照输出，用于门禁与 Devtools。

## Success Criteria _(mandatory)_

- **SC-001**: 在不运行完整业务交互的情况下，平台能获得可序列化的“初始化阶段服务使用证据”，并能用于解释与建议。
- **SC-002**: 证据输出确定性且可 diff；不触达的分支依赖不会被误报。
- **SC-003**: 采集过程受控：无对外 IO；超时/违规可解释；输出有预算与截断语义。
