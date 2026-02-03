# Feature Specification: IR Reflection Loader（IR 反射与试运行提取）

**Feature Branch**: `025-ir-reflection-loader`  
**Created**: 2025-12-23  
**Status**: Done  
**Input**: 通过“运行时反射 + 受控试运行”提取多类 IR（Manifest / Runtime / Construction），服务 Studio/CI/Agent；并要求 Logix 内核在不影响运行性能的前提下尽可能提前提供支撑。

## Clarifications

### Session 2025-12-24

- Q: 025 的 Trial Run 是否会执行 024 的 `main`？ → A: 不会；Trial Run 只复用 024 的 `openProgram/boot` 启动 program module，在受控窗口内采集证据/IR，然后关闭 scope 收束（不执行 `main`）。
- Q: 025 的 `runId` 与 runtime `instanceId` 的关系是什么？ → A: `runId` 是 Trial Run / RunSession 的会话标识；`instanceId` 仍是 runtime 实例标识（默认可稳定如 `i1`）。证据/IR 对齐时携带 `runId + moduleId + instanceId`，且 `runId` 与 `instanceId` 不应混用或强行相等。
- Q: 025 Trial Run 的超时模型如何定义（试跑窗口 vs 释放收束）？ → A: 两段超时：`trialRunTimeoutMs`（试跑窗口）+ `closeScopeTimeout`（释放收束，复用 024 `closeScopeTimeout`）；窗口超时归类为 TrialRunTimeout，释放超时归类为 DisposeTimeout（必要时可同时记录）。
- Q: 025 Trial Run 遇到缺失依赖（Service/Config）时，是失败还是 warnings？ → A: 必须失败（hard fail）；失败载荷必须携带缺失清单与最小上下文（阶段/入口/标识），供 CI/平台展示与修复。
- Q: 025 Trial Run 的启动范围是 build-only 还是 full boot？ → A: full boot：复用 024 的 `openProgram/boot` 完整启动（包含 logics/processes），但不执行 024 的 `main`；在受控窗口内采集证据/IR，然后关闭 scope 收束。
- Q: 025 的 EnvironmentIR 语义口径是什么（观测 vs 声明）？ → A: 采用“试运行期间观测到的依赖集合（best-effort）”，不承诺穷尽；并输出缺失依赖的可行动失败摘要。
- Q: 025 的 ModuleManifest.meta 字段允许哪些来源与用途？ → A: 仅允许稳定、可复现的元信息（禁止时间戳/随机/机器特异信息）；CI diff 默认不把 meta 变化视为 breaking。
- Q: 025 的 ModuleManifest.digest 是否包含 meta/source？ → A: digest 只由结构字段决定（例如 moduleId/actionKeys/schemaKeys/logicUnits/staticIr.digest）；不包含 meta/source（减少 CI diff 噪音）。
- Q: 025 的 diffManifest 默认如何处理 meta 变化？ → A: meta 变化默认归类为 RISKY（可通过 allowlist 降噪）；CI gate 默认不把 meta 变化视为 breaking。
- Q: 025 TrialRunReport 在失败时是否仍应尽可能携带可解释 IR（manifest/environment 等）？ → A: 是；失败时仍尽可能输出 `environment`（含缺失清单）与 `manifest`（若能提取），用于 CI/平台解释与修复；提取不到则省略。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 导出 Manifest IR（供 Studio/CI/Agent 消费） (Priority: P1)

作为平台/工具链开发者，我希望无需读取源码 AST，就能从用户导出的模块对象中得到一份可序列化、可对比的 Manifest（模块结构摘要），用于画布渲染、CI 防腐与 Agent 工具注册。

**Why this priority**: 这是平台化落地的第一步：只要能稳定导出 Manifest，就能立刻支撑远程 Studio、CI diff 与 Agent “工具目录”三类高价值场景。

**Independent Test**: 给定一个模块入口，执行一次“反射提取”，可得到一份 JSON Manifest；对同一输入重复执行，输出保持一致；对比两份 Manifest 能检测出破坏性变更。

**Acceptance Scenarios**:

1. **Given** 一个用户导出模块对象（可能由工厂函数/trait 组合生成），**When** 运行 Manifest 提取，**Then** 得到一份可序列化输出，包含模块身份、可见 Schema/Slots/Meta/Source 等结构信息（Meta 仅允许稳定、可复现元信息），且不依赖源码 AST。
2. **Given** 同一模块在两个版本中发生变更，**When** 对比前后 Manifest，**Then** 能识别结构层面的破坏性变更（例如 schema key 丢失/slot 消失/action key 删除/logic slot kind 变化），供 CI 失败或告警使用（meta 变化默认 RISKY、source 变化默认 INFO，均不作为 breaking；meta 可通过 allowlist 降噪）。

---

### User Story 2 - 受控试运行提取 IR（Environment/Runtime IR，用于合规与编排） (Priority: P2)

作为平台/CI 的运行前检查者，我希望在“可控副作用”的环境中试运行模块的启动/装配阶段（复用 024 `openProgram/boot`，不执行脚本级 `main`），以便：

- 提取运行依赖的观测摘要（Environment IR：`tagIds/configKeys` 等；best-effort，不承诺穷尽）；
- 在发现构建态违规（例如构造/装配阶段访问 Build Env 未提供的 Service/Config）时给出可行动错误。

**Why this priority**: 仅靠 Manifest 只能看“结构”；试运行可以补齐“依赖观测摘要/副作用边界”，让平台在部署、沙箱、合规检测场景里更可控。

**Independent Test**: 在 mock 环境中试运行一个模块：若模块在构造/装配阶段访问未注入的 Service/Config，则试运行失败并标注其发生在 build-time（构造/装配阶段）与原因；若试跑成功，则输出包含观测到的依赖集合（best-effort）的 IR。

**Acceptance Scenarios**:

1. **Given** 一个模块在构造/装配阶段访问了 Build Env 未提供的 Service/Config（构建态依赖违规），**When** 进行受控试运行，**Then** 试运行必须失败，并输出可序列化的诊断信息，明确指出发生在构造/装配阶段并给出可行动提示。
2. **Given** 一个模块在装配阶段请求若干依赖（服务与配置 key），**When** 进行受控试运行，**Then** 试运行输出必须包含 Environment IR（观测到的依赖集合，best-effort），供部署预检与自动编排使用。
3. **Given** Trial Run 失败（missing/timeout/runtime failure），**When** 输出 TrialRunReport，**Then** report 仍应尽可能包含可解释 IR（`environment` 缺失清单、`manifest` 若可提取），供平台/CI 定位与修复；提取不到则省略字段。

---

### User Story 3 - 内核提前支撑（不影响运行性能） (Priority: P3)

作为 Logix 内核维护者，我希望在不影响运行时热路径性能的前提下，把“可反射、可序列化、可对齐”的信息尽量提前固化在模块定义/运行时结构中，以便平台侧在规则未完全定稿时也能逐步接入。

**Why this priority**: 平台/工具链会演进，但内核如果提前把“稳定锚点与反射载荷”准备好，后续对齐成本会显著降低，且不会在运行时引入隐性开销。

**Independent Test**: 在不启用任何平台/loader 的情况下跑既有运行时/测试，性能与行为不回退；启用提取时能稳定产出 IR，且 IR 字段不引入随机/时间锚点。

**Acceptance Scenarios**:

1. **Given** 现有业务模块与运行时基准用例，**When** 未启用任何 IR 提取/诊断增强，**Then** 运行时性能与行为不发生可观测回退。
2. **Given** 同一个模块在不同进程/不同机器上被提取，**When** 不涉及用户输入差异，**Then** IR 中用于对齐的标识与排序保持确定性（可复现、可对比）。

### Edge Cases

- 模块通过多层工厂/trait/配置组合生成：反射应读取“最终对象形状”，而不是依赖静态源码。
- 同一入口导出多个模块/多个候选对象：提取工具需要可选择性导出，并能在输出中区分各对象。
- Schema/slot/meta/source 缺失：应降级输出（字段为空或省略），但保持格式稳定。
- meta 含非确定性字段（时间戳/随机/机器特异信息）：视为禁止；不得进入 Manifest（避免破坏确定性与 CI diff 噪音）。
- source 漂移（文件/行列变化）：允许；不得进入 digest（避免重排/移动文件导致 CI 噪音）。
- 反射输出过大：必须有大小上界与裁剪策略，避免 UI/CI/Agent 被巨型 IR 拖垮。
- 试运行遇到缺失依赖：必须 hard fail，并在失败载荷中输出“缺失依赖摘要”（缺失清单 + 阶段/入口/标识等最小上下文），避免静默失败或进入半初始化状态。
- 试运行过程中出现常驻逻辑：不得依赖“自动退出”；必须在可控窗口内结束并释放资源。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供一种“反射提取”能力：从模块对象导出 Manifest IR，且输出必须可序列化与可对比。
- **FR-002**: Manifest IR MUST 覆盖最低限度的结构信息，且字段名/语义 MUST 与 `packages/logix-core/src/Module.ts` 的 `ModuleDescriptor` 对齐（Manifest 作为其可序列化投影）：模块身份（`moduleId`）、可见 `schemaKeys`、`actionKeys`、`logicUnits` 摘要、`meta` 与 dev `source`（若存在），避免平台/CI 侧引入映射层。
- **FR-003**: Manifest IR MUST 是确定性的：字段与集合的输出顺序稳定；不得引入随机/时间默认值作为对齐锚点；Manifest 的 `meta` 仅允许稳定、可复现元信息（禁止时间戳/随机/机器特异信息）；`digest` 必须只由结构字段决定（不包含 meta/source）。
- **FR-004**: 反射提取 MUST 不依赖源码 AST；对“动态组合生成的模块对象”同样适用。
- **FR-005**: 系统 MUST 提供一种“受控试运行”能力：在可控环境中复用 024 的 `openProgram/boot` 完整启动 program module（包含 logics/processes 启动，但不执行脚本级 `main`），在受控窗口内采集 IR/证据，并输出可序列化的 IR 与诊断。
- **FR-006**: 受控试运行 MUST 能提取 Environment IR：输出试运行期间观测到的依赖集合（服务/tagIds 与 configKeys，best-effort、不承诺穷尽）以及缺失依赖摘要，用于部署预检与自动编排。
- **FR-007**: 受控试运行 MUST 捕获构建态依赖违规：在构造/装配阶段访问未注入的 Service/Config 时必须 hard fail，并提供可行动错误（包含缺失清单、阶段与最小上下文）。
- **FR-011**: TrialRunReport 在失败时 MUST 尽可能携带可解释 IR：至少包含 `environment` 的缺失依赖摘要；若能提取 `manifest` 则一并携带；提取失败或超限时允许省略对应字段。
- **FR-008**: Logix 内核 MUST 提供（或补齐）反射所需的稳定锚点与载荷（schemas/meta/source/logic slots 等），且默认不得影响运行时热路径性能。
- **FR-009**: 系统 MUST 支持“契约防腐”工作流：对比两个 Manifest IR 的差异并输出可机器消费的结果，用于 CI 阻断或告警；meta 变化默认归类为 RISKY（可通过 allowlist 降噪），不得作为 breaking。
- **FR-010**: 系统 MUST 提供一种可序列化、可对比的 Static IR：用于描述模块内“可声明式推导的关系”（例如派生/联动/校验等）的依赖图或等价摘要，并可用于平台化可视化与 CI 漂移检测；当模块不具备此类关系时，输出应为空或省略，但整体格式保持稳定。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在不启用 IR 提取/诊断增强的情况下，运行时 MUST 保持近零额外开销；若涉及核心路径改动，必须提供可复现的性能基线与预算。
- **NFR-002**: IR/诊断输出 MUST 是 Slim 且可序列化；任何用于对齐的标识 MUST 可复现且去随机化（包括 Manifest 中的 meta，不得包含时间戳/随机/机器特异信息）。CI/平台场景 MUST 显式注入 `runId`（RunSession 会话标识）；`runId` 与 runtime `instanceId` 分离，TrialRun 证据/IR 对齐时至少携带 `runId + moduleId + instanceId`。
- **NFR-003**: 受控试运行 MUST 有资源上界（时间/并发/输出大小），并在超限时以结构化错误失败。时间上界至少包含两段：`trialRunTimeoutMs`（试跑窗口）与 `closeScopeTimeout`（释放收束，复用 024 `closeScopeTimeout`）；窗口超时归类为 TrialRunTimeout，释放超时归类为 DisposeTimeout（必要时可同时记录）。
- **NFR-004**: 受控试运行 MUST 在完成后可靠释放资源（避免悬挂进程、dangling fibers、半初始化驻留）。
- **NFR-005**: IR 提取与运行时执行语义 MUST 保持可解释链路：输出中能区分“构造/装配失败”“运行期失败”“违规副作用”等类别，便于平台给出行动建议。

### Key Entities _(include if feature involves data)_

- **ModuleManifest（Manifest IR）**: 模块结构摘要（可序列化），用于 Studio/CI/Agent 消费与对比。
- **EnvironmentIR**: 依赖观测摘要（`tagIds/configKeys` 等，best-effort）+ 缺失依赖摘要，用于部署预检与编排。
- **TrialRunReport**: 受控试运行的结果封装：包含导出的 IR、告警/错误分类与可行动诊断信息。
- **StaticIR**: 描述“声明式推导关系”的静态依赖图或摘要（可序列化、可对比），用于平台化可视化与契约检测。

### Assumptions & Scope Boundaries

- 本特性聚焦“可序列化 Manifest IR + 受控试运行提取 Environment IR”，以及为其所需的内核反射支撑；不在本特性内交付 Studio、数字孪生、HMR 等上层产品能力。
- 首个落地载体（first consumer）是 024 的 **program module**：即会被 `Runtime.runProgram/openProgram` 运行的模块入口；CI/平台将以该入口为单位产出 Manifest/StaticIR/TrialRunReport 工件并做契约防腐。
- 反射信息缺失时允许降级（例如缺少 source/meta/schema 时输出为空或省略），但必须保持输出格式稳定且可对比。
- Trial Run 的边界：Trial Run 只负责在受控窗口内启动/装配并提取 IR/证据；它不会执行 024 的脚本级 `main`（MainFn 由调用方在 `runProgram` 时提供，属于正式执行阶段）。
- Trial Run 的启动范围：Trial Run 复用 024 的 `openProgram/boot` full boot 语义（包含 logics/processes 启动）；在 `trialRunTimeoutMs` 窗口内采集 IR/证据，然后关闭 scope 收束（受 `closeScopeTimeout` 约束）。
- 缺失依赖策略：Trial Run 若检测到缺失依赖（Service/Config），必须 hard fail；失败载荷必须携带缺失清单与最小上下文（阶段/入口/标识），供 CI/平台展示与修复。
- 受控试运行不负责“自动推断退出时机”：若模块存在常驻逻辑，试运行必须在可控窗口内结束并释放资源（由试运行策略定义）。
- 本特性不引入额外的 “boot-only/dryRun” 变体：Trial Run 仍按 full boot 启动；“受控副作用”依赖 BuildEnv/ConstructionGuard + `options.layer` 注入 Trap/Mock（以及 budgets/timeout）实现收束与可解释失败，避免另起一套 boot 协议导致漂移。
- 本特性不实现下列 IR（作为后续需求的候选）：Trace IR、Intent IR、Effect Op Tree；但会在设计阶段评估是否需要提前预留最小扩展点以避免未来反向破坏。

### IR Map（informative）

> 本段是“发散分析”的压缩版，用于对齐平台化应用场景与 IR 演进路线（不作为本特性验收硬指标）。

- **Manifest IR（ModuleManifest/ModuleDescriptor 子集）**：用于远程 Studio 画布渲染、CI 契约防腐、Agent 工具注册。
- **Environment IR（依赖观测摘要）**：用于部署预检与自动编排（缺失服务/配置的可行动提示）。
- **Construction IR（模块对象/构造期反射）**：用于架构合规检测（构建态依赖违规检测与副作用边界）；通用 IO 禁止策略作为后续扩展。
- **Runtime IR（活体拓扑/依赖图）**：用于 Devtools 实时依赖可视化、细粒度热更新、数字孪生（本特性不落地，但需避免阻塞其演进）。
- **Trace IR / Intent IR / Effect Op Tree**：用于可回放因果链、语义搜索/反解、并发/泄漏可视化（本特性不落地，后续单独规划）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对同一模块输入重复提取 Manifest IR，输出内容一致（可复现、可 diff）。
- **SC-002**: 在 CI 中对比前后 Manifest IR，可可靠识别并报告结构破坏（例如 schema key 丢失/slot 变化/action key 删除/logic slot kind 变化）；meta 变化默认 RISKY、source 变化默认 INFO，均不作为 breaking（meta 可通过 allowlist 降噪）。
- **SC-003**: 受控试运行能输出 Environment IR（依赖观测摘要），并能在缺失依赖时给出可行动失败信息。
- **SC-004**: 当模块在构造/装配阶段发生构建态依赖违规（访问未注入 Service）时，受控试运行能稳定失败并明确归因到“构造/装配阶段违规”。
- **SC-005**: 在未启用 IR 提取能力的场景下，核心运行时不出现可观测的性能回退（相对既有基线）。
- **SC-006**: 对具备声明式派生/联动/校验关系的模块，Static IR 可稳定导出并可用于 diff（同一输入重复导出一致；变更可被识别）。
