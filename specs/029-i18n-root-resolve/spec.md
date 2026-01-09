# Feature Specification: 国际化接入与 Root.resolve 语法糖

**Feature Branch**: `029-i18n-root-resolve`  
**Created**: 2025-12-24  
**Status**: Draft  
**Input**: User description: "那$.root.resolve(Tag)这样吧，合适。然后把我们刚刚讨论的所有国际化相关的确定的定论，新建个需求，编号 029"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 在模块逻辑中显式获取 Root 单例（Priority: P1）

作为业务开发者，我希望在模块逻辑中能够以“明确且少样板”的方式拿到当前应用的全局单例能力（例如全局配置、鉴权、国际化等），并且不会因为装配遗漏而悄悄拿到错误实例。

**Why this priority**: 这是跨模块协作与平台级能力（如国际化、鉴权、配置等）最常见的依赖获取方式；若没有稳定且清晰的入口，容易造成串实例与可诊断性问题。

**Independent Test**: 在一个最小 Runtime Tree 中提供 root 单例与局部 override，并在单个 Module Logic 内分别使用 strict 与 root 入口解析，验证“strict 缺失即失败”与“root 解析不受 override 影响”。

**Acceptance Scenarios**:

1. **Given** 应用已提供某个“依赖标识”的全局单例，且当前局部范围也提供了一个同名替代实现，**When** 逻辑选择“root（全局）”语义解析该依赖，**Then** 返回全局单例（不受局部替代实现影响）。
2. **Given** 应用未提供某个依赖，**When** 逻辑选择“root（全局）”语义解析该依赖，**Then** 失败并返回可操作的诊断信息（包含依赖标识、入口与修复建议）。

---

### User Story 2 - 共享外部国际化实例并保持既有 DX（Priority: P1）

作为业务开发者，我希望继续沿用既有的国际化使用方式（UI 侧的翻译能力、业务代码里直接调用“全局翻译函数”等），同时在 Logix 模块逻辑中也能使用同一个国际化实例产出文案或“可延迟翻译的消息描述”，而无需在组件里额外写监听与手动重算代码。

**Why this priority**: 国际化是高频横切能力；若要求业务迁移到一套“仅 Logix 可用”的翻译方式，会显著降低 DX 并造成双轨维护。

**Independent Test**: 在同一应用中注入一个外部国际化实例：UI 使用既有方式翻译；Module Logic 通过注入能力翻译；两者对同一 key 的输出一致，并在切换语言后同步变化。

**Acceptance Scenarios**:

1. **Given** 应用注入了一个外部国际化实例并已可翻译，**When** UI 与 Module Logic 分别翻译同一 key，**Then** 文案一致。
2. **Given** 语言发生切换，**When** UI 展示基于 message token 的文案，**Then** 无需手动触发重算即可显示新语言结果。

---

### User Story 3 - 异步初始化与“等待/不等待”两档语义（Priority: P2）

作为业务开发者，我希望支持“国际化实例可能需要异步初始化/加载语言包”的现实情况：多数场景可以先用 key/默认文案回退，不阻塞主流程；少数关键场景（如需要最终文案再继续的流程）可以选择等待就绪并获得确定结果。

**Why this priority**: 异步初始化是常见接入形态；若强制所有调用点显式“先等 ready 再翻译”，会在逻辑中扩散大量样板代码。

**Independent Test**: 在国际化实例未就绪时触发两类翻译：不等待模式立即回退；等待模式在就绪后返回最终文案；并验证初始化失败时的降级语义。

**Acceptance Scenarios**:

1. **Given** 国际化实例未就绪，**When** 触发“不等待”的翻译请求，**Then** 立即返回可展示的回退结果（如 key/默认文案），且不阻塞事务性逻辑。
2. **Given** 国际化实例未就绪但随后就绪，**When** 触发“等待”的翻译请求，**Then** 在就绪后返回最终文案。

---

### Edge Cases

- root provider 与当前作用域同时提供同一 Tag：root 入口必须固定选择 root；strict 入口必须固定选择当前作用域。
- 同一进程存在多棵 Runtime Tree：root 解析结果必须按 Tree 隔离，不得跨 Tree 串用。
- 国际化实例初始化失败：必须有可预测的降级路径（例如持续回退 key/默认文案）与可诊断信号。
- 语言切换过于频繁：应避免导致高频无意义重算；系统需提供可控的“变化信号”或节流策略（由调用方选择）。
- message token 过大或不可序列化：必须拒绝/裁剪，避免污染可回放状态与诊断载荷。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 在 Module 的 `$` 上提供 root 解析入口（语法糖），用于显式解析当前 Runtime Tree 的 root provider 单例（模块或服务）。
- **FR-002**: 系统 MUST 保持 strict 默认语义不变：当调用方使用 strict 入口解析依赖且缺失提供者时，必须稳定失败，不得回退到更远作用域或进程级全局兜底。
- **FR-003**: root 解析入口 MUST 与 root provider 语义一致：当同一 Tag 在局部作用域存在 override 时，root 解析结果必须仍固定为 root 单例。
- **FR-004**: 系统 MUST 支持注入“外部国际化实例”到当前 Runtime Tree，使 Module 逻辑与 UI/业务代码可共享同一个实例（避免双实例与不一致）。
- **FR-005**: 系统 MUST 提供可在 Module 逻辑中使用的国际化能力，至少包含：读取当前语言、订阅语言变化、以及产出文案或可延迟翻译的 message token。
- **FR-006**: 系统 MUST 定义并提供“等待/不等待”两档翻译语义：调用方可选择在国际化未就绪时立即返回回退结果，或等待就绪后返回最终文案。
- **FR-007**: 系统 MUST 支持将 message token 写入可回放状态（例如表单错误树/提示信息），且 token 必须是 Slim、可序列化、可稳定对比的结构化值。
- **FR-008**: 系统 MUST 提供明确的装配与覆盖规则文档：何时使用 strict（实例/父子关系），何时使用 root（全局单例），以及在多 runtime tree 下的隔离语义。
- **FR-009**: 系统 MUST 同时提供两种 Logix 侧国际化接入形态：I18n Service（Tag/Layer 注入）与 I18nModule（Root 单例模块）。在同一 Runtime Tree 内，两者 MUST 共享同一外部国际化实例；多 Runtime Tree 并存时必须隔离（不得串实例）。
- **FR-010**: 系统 MUST 将“语言/就绪变化信号”以 I18n Service 的可订阅快照（例如 I18nSnapshot/changes）作为单一事实源对外暴露；I18nModule 若提供额外语法糖/控制面，必须复用该变化信号（不得另起并行事实源）。默认推荐 message token + 展示边界翻译；若调用方选择把最终字符串落到 state，则必须显式依赖该变化信号触发重算（不提供隐式魔法）。
- **FR-011**: `tReady(key, options, timeoutMs?)` MUST 设计为“永不失败”的等待翻译：默认等待上限为 5 秒（支持调用方通过 `timeoutMs` 覆盖）。当国际化初始化失败、一直未就绪或超过等待上限时，必须在可预期的时机返回可展示回退结果（优先 `options.defaultValue`，否则 key），同时通过 I18nSnapshot 标记 `init="failed"` 并产出结构化诊断信号。
- **FR-012**: 系统 MUST 提供从 Logix 侧发起“请求切换语言”的能力，并以 I18n Service 作为主入口；I18nModule 若提供该能力，必须仅作为对 I18n Service 的封装/转发，且不得绕过 I18n Service 的变化事实源与 Tree 隔离语义。
- **FR-013**: 系统 MUST 提供独立的领域特性包 `@logixjs/i18n`，承载 I18n Service / I18nModule / message token 等国际化能力；`@logixjs/core` 仅承载通用运行时能力（如 `$.root.resolve` 与解析语义），不得被国际化引擎/资源加载机制所耦合。
- **FR-014**: `@logixjs/i18n` MUST 采用“driver-first”的对接策略：定义最小 I18nDriver（最小面、控制反转），并使宿主可直接把“符合该最小面”的外部 i18n 实例注入到 Runtime Tree（例如 i18next 风格的实例可直接作为注入值）；`@logixjs/i18n` 不得对特定引擎产生强耦合依赖。
- **FR-015**: 系统 MUST 不要求新增 React 专用包（例如 `@logixjs/i18n-react`）。React 侧应继续使用既有国际化订阅/Provider（例如 i18next-react）驱动 re-render；Logix 侧只需保证同一外部实例可注入与 per-tree 隔离，并提供文档/示例说明如何组合使用。

### Assumptions & Dependencies

- 宿主应用能够提供一个“外部国际化实例”，并期望 UI 与业务代码继续使用同一实例（本特性不替代宿主既有国际化体系）。
- 外部国际化实例可能需要异步就绪（例如加载语言包、拉取配置）；系统需支持“就绪前可用回退结果”的使用模式。
- 同一进程中可能存在多棵 Runtime Tree；本特性必须以“每棵 Tree 独立”作为前提。

### Scope & Non-Goals

- In scope：提供 root 解析语法糖；提供与外部国际化实例共享的注入与使用方式；提供 I18n Service 与 I18nModule 两种接入形态；提供可回放的 message token 形态与就绪语义。
- Out of scope：不把完整语言包/词条数据写入可回放状态；不引入任何进程级全局兜底作为正确性语义；不强制业务迁移既有 UI 国际化调用方式；不在 `@logixjs/core` 内引入国际化引擎/资源加载的强耦合；`@logixjs/i18n` 不负责绑定/内置特定国际化引擎依赖（例如不强依赖 i18next），由宿主按需安装并以最小形状注入。
- Out of scope：不引入 `@logixjs/i18n-react` 这类“重复封装 i18n 框架订阅”的适配层（除非后续有明确需求另开特性）。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 系统 MUST 为新增的 root 解析入口定义性能预算，并在实现前记录基线；实现后在 diagnostics 关闭时不得引入可测量的热路径回归（例如：批量解析场景的时间与分配不应显著上升）。
- **NFR-002**: 系统 MUST 为以下关键事件提供结构化诊断信号，且 diagnostics 关闭时开销接近零：root 解析失败、国际化实例就绪/失败、语言切换、message token 违规（过大/不可序列化）。
- **NFR-003**: 系统 MUST 在诊断与回放面保持确定性标识（实例/事务/操作）：不得通过随机数或时间默认值生成关键锚点。
- **NFR-004**: 系统 MUST 强制同步事务边界：事务窗口内不得执行 IO/异步初始化；国际化的异步加载必须发生在事务窗口外或以可控的后台流程表达。
- **NFR-005**: 系统 MUST 更新面向开发者的文档与示例，以给出稳定心智模型（≤5 个关键词）并覆盖：strict vs root 的选择、局部 override 与 root 固定语义、国际化注入与共享实例、异步就绪两档语义。
- **NFR-006**: 系统 MUST 避免任何进程级全局兜底作为正确性语义（包括国际化与模块解析）；多 runtime tree 并存时必须隔离，且错误信息必须能定位到具体 tree/入口。

### Key Entities _(include if feature involves data)_

- **Root Provider（全局依赖提供者）**: 当前 Runtime Tree 的根作用域依赖集合（为应用提供全局单例模块/服务）。
- **Strict Resolution（严格解析）**: 只允许从“当前实例范围”获得依赖；缺失必须失败，不允许自动回退到全局。
- **Root Resolution（全局解析）**: 显式从 root provider 解析依赖；即使局部有替代实现也不受影响。
- **I18n Instance（外部国际化实例）**: 宿主应用既有的国际化实例（期望 UI、业务代码与 Logix 逻辑共享）。
- **I18n Service（国际化服务）**: 注入到 Runtime Tree 的可替换能力（以 Tag/Layer 形态提供），对外暴露语言快照/翻译/构造 message token 等能力。
- **I18nModule（国际化模块）**: Root 单例模块形态的国际化能力入口；用于承载额外的语法糖/控制面，并与 I18n Service 共享同一外部国际化实例。
- **I18nDriver（国际化驱动）**: `@logixjs/i18n` 侧定义的最小引擎抽象（最小形状/控制反转），用于承载翻译/语言切换/就绪语义，并保持 per-tree 隔离与可测试性。
- **I18n Snapshot（国际化快照）**: 国际化的可订阅状态（至少包含当前语言、是否就绪、变化序列号）。
- **Message Token（可延迟翻译的消息描述）**: 结构化值（key + 可序列化 options 子集，推荐使用 `defaultValue` 作为兜底文案），用于写入可回放状态并在展示时按当前语言生成最终文案。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 在一个示例应用中，沿用既有 UI 国际化用法即可完成接入；至少 10 个来自“模块逻辑产出”的 message token 能在 2 种语言下正确渲染，并在语言切换后自动更新。
- **SC-002**: 三类场景（表单错误、异步提示/Toast、模块内派生文案）各提供至少 1 个可独立验收的演示；验收步骤不要求在组件中新增“手写监听语言变化并触发重算”的逻辑。
- **SC-003**: 同一进程内创建 2 棵 Runtime Tree 并注入不同国际化实例：对任意一棵 Tree 连续切换语言 ≥10 次，另一棵 Tree 的文案结果保持不变（跨 Tree 污染率 0%）。
- **SC-004**: 当 root 解析失败或国际化初始化失败时，诊断信息至少包含：依赖标识、入口类型（strict/root）、所在 Tree 标识、以及 ≥2 条修复建议；在开发环境下可直接用于定位问题。
- **SC-005**: 在 diagnostics 关闭时，新增 root 解析语法糖的批量调用吞吐回归 ≤1%，且不会引入与调用次数线性增长的额外内存占用。
- **SC-006**: 写入可回放状态的单个 message token 必须满足“可序列化且 Slim”的预算；早期至少在开发环境对超限产出可诊断信号，后续可升级为稳定拒绝并给出可操作错误提示。

## Clarifications

### Session 2025-12-24

- Q: Logix 侧的 I18n 接入形态怎么定？ → A: 同时提供 I18n Service（Tag/Layer 注入）与 I18nModule（Root 单例模块）；同一 Runtime Tree 内共享同一外部实例，多 Tree 必须隔离（不得串实例）。
- Q: 语言变更的“持续监听/自动更新”主路径怎么定？ → A: 以 I18n Service 的 I18nSnapshot/changes 作为变化信号单一事实源；I18nModule 仅封装/复用；默认 token + 展示边界翻译；最终字符串落 state 时必须显式订阅触发重算。
- Q: `tReady(key, options, timeoutMs?)` 的失败/超时语义怎么定？ → A: tReady 永不失败；默认等待上限 5 秒（支持覆盖）；初始化失败/一直未就绪/超时均返回 `options.defaultValue`（否则 key），并通过 I18nSnapshot 标记 `init="failed"` + 结构化诊断体现。
- Q: “请求切换语言”的发起入口归属怎么定？ → A: 以 I18n Service 为主入口提供“请求切换语言”能力；I18nModule 可封装/转发但不得另起事实源或绕过 Tree 隔离语义。
- Q: `@logixjs/i18n` 的包边界与耦合策略怎么定？ → A: 需要新增 `@logixjs/i18n` 作为 i18n 领域特性包；采用 driver-first（最小形状契约 + IoC/DI 注入），不依赖 i18next，且不新增 `@logixjs/i18n-react`（React 侧继续用 i18next-react）。
