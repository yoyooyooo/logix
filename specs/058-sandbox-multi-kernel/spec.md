# Feature Specification: Sandbox 多内核试跑与对照（core/core-ng）

**Feature Branch**: `058-sandbox-multi-kernel`  
**Created**: 2025-12-28  
**Status**: Draft  
**Input**: User description: "那你顺便加上这个 spec（为 @logixjs/sandbox 增加多 kernel 资产与选择能力，支持 core/core-ng 对照试跑）"

## Clarifications

### Session 2025-12-28

- AUTO: Q: 多内核场景下未提供 `kernelId` 时如何选择默认内核？ → A: 若仅存在一个内核则使用该内核；否则必须由 Host 明确提供 `defaultKernelId`，缺省则失败并返回 `availableKernelIds`。
- AUTO: Q: `strict` 的默认值是什么？ → A: 默认 `strict=true`（strict by default），除非运行请求显式传 `strict=false`。
- AUTO: Q: `strict=false` 时是否允许自动降级（fallback）？ → A: 只有在显式允许 fallback 时允许；否则仍失败，禁止“non-strict=自动回退”的隐式语义。
- AUTO: Q: fallback 的目标选择规则是什么？ → A: 固定降级到 Host 的 `defaultKernelId`；若没有 defaultKernelId，则不允许 fallback（不得从可用列表里随意挑一个）。
- AUTO: Q: `kernelId` 的命名/稳定性约束是什么？ → A: 必须稳定且满足 `[a-z0-9-]+`（lower-kebab）；`core`/`core-ng` 作为推荐保留名用于对照。
- AUTO: Q: Host 注册一个 KernelVariant 的最小资产引用是什么？ → A: 必须提供 `kernelUrl` 指向该内核的 `logix-core.js` 入口；`effect.js` 与 `logix-core.manifest.json` 作为同目录 sibling 资源由约定解析（或显式提供等价引用）。
- AUTO: Q: 默认安全策略允许跨域内核资源吗？ → A: 默认仅允许同源；跨域仅在 Host 显式允许且满足 CORS/审计要求时启用；错误摘要不得暴露敏感 URL。
- AUTO: Q: 并发运行/多 Playground 同页时，内核选择的隔离边界是什么？ → A: 以“单次运行会话”为隔离边界；并发运行之间不得互相影响 `requested/effective` 选择。
- AUTO: Q: 运行结果里内核相关字段的最小稳定结构是什么？ → A: 必须总是包含 `requestedKernelId` 与 `effectiveKernelId`（可相等），并包含 `kernelImplementationRef`（复用 045 schema；来源为 TrialRunReport.environment.kernelImplementationRef）；发生 fallback 时必须包含 `fallbackReason`。
- AUTO: Q: “枚举可用内核”返回哪些元信息？ → A: 至少返回 `kernelId`（稳定）+ `label`（可选），并明确标识默认内核（`defaultKernelId` 或等价字段）；返回顺序应稳定（以 Host 注册顺序为准）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 选择内核并获得明确结果标识 (Priority: P1)

作为仓库维护者/运行时开发者，我希望在 Sandbox/Playground 中对同一段可运行模块选择不同内核（例如当前 core 与 core-ng）进行试跑，并在运行结果中明确标识“本次使用了哪个内核/实现引用”，从而可以做对照验证与排障，不会因隐式默认值产生误判。

**Why this priority**: 多内核并行演进的所有对照验证都依赖“可选择 + 可解释”。如果无法在浏览器侧明确选择并标识内核，docs/debug/CI 的对照链路会退化为口头约定，易漂移。

**Independent Test**: 在同一 Host 环境预置至少两个可用内核后，分别选择运行两次，得到两份 RunResult/TrialRunReport；人工可仅凭结果摘要判断两次实际使用的内核不同且可对比。

**Acceptance Scenarios**:

1. **Given** Host 配置了 `core` 与 `core-ng` 两个内核变体，**When** 请求以 `core` 运行一次试跑，**Then** 运行结果中明确标识 `effectiveKernelId=core`（并包含实现引用）。
2. **Given** Host 配置了 `core` 与 `core-ng` 两个内核变体，**When** 请求以 `core-ng` 运行一次试跑，**Then** 运行结果中明确标识 `effectiveKernelId=core-ng`（并包含实现引用）。

---

### User Story 2 - 不可用内核的失败/降级是可解释且可门禁的 (Priority: P1)

作为 CI/Perf Gate 或高级调试读者，我希望当请求的内核不可用或初始化失败时，系统要么给出清晰、面向读者的错误（含可用内核列表/恢复建议），要么在明确允许的情况下做降级，并把降级原因显式记录为证据；并支持“严格模式”把任何降级视为失败，从而避免静默回退污染默认路径或 Gate 结论。

**Why this priority**: 多内核运行时最危险的是“看起来跑了其实没用到目标内核”。必须让失败/降级可见、可序列化、可拦截。

**Independent Test**: 在 Host 只配置 `core` 的情况下请求运行 `core-ng`：严格模式应直接失败；非严格模式若允许降级，应明确标识 fallback 与实际使用内核。

**Acceptance Scenarios**:

1. **Given** Host 未提供请求的 `kernelId`，**When** 以 strict 模式试跑，**Then** 运行失败并返回可理解的错误摘要（含 `requestedKernelId` 与 `availableKernelIds`）。
2. **Given** Host 未提供请求的 `kernelId`，**When** 以 non-strict 且允许降级的模式试跑，**Then** 运行可以继续但结果必须记录 `fallbackReason` 且明确标识 `effectiveKernelId`。

---

### User Story 3 - 文档/Playground 可以枚举内核并在 Debug 场景中做对照 (Priority: P2)

作为 docs inline playground 或其他 Playground consumer，我希望能枚举当前环境可用的内核列表（含人类可读 label/版本提示），并在 Debug 示例中选择或展示内核信息，以便把“内核差异/对照结论”变成可运行的教学与解释素材。

**Why this priority**: 选择能力只有暴露为可用清单与可视化标识，才真正可被 docs/debug 消费，否则依然需要外部约定。

**Independent Test**: Consumer 在不运行任何模块的情况下能拿到可用内核清单；运行后能在 UI 里展示本次运行使用的内核标识。

**Acceptance Scenarios**:

1. **Given** Host 已注册多个内核，**When** Consumer 请求可用内核清单，**Then** 返回包含稳定 `kernelId` 与可展示的元信息。
2. **Given** 运行完成，**When** Consumer 展示运行结果，**Then** 能展示本次 `effectiveKernelId` 与实现引用信息（无需解析内部对象图）。

### Edge Cases

- 请求的 `kernelId` 存在但对应资产加载失败（404/超时/脚本错误）时如何处理？
- 同一页面多个 Playground 并发运行时，是否会因共享 Worker/内核缓存导致“内核选择串扰”？
- 在一次运行进行中切换选择内核时，如何保证“本次运行”与“下一次运行”边界清晰、可取消且不污染？
- 输出/证据超过预算（maxBytes/maxEvents）时，是否能返回可解释的“被截断/被裁剪”摘要？
- 多内核场景下未提供 `kernelId` 且 Host 未提供 `defaultKernelId` 时，错误摘要如何面向读者呈现？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST 支持 Host 注册多个内核变体，并为每个变体提供稳定的 `kernelId`（`[a-z0-9-]+`；推荐保留名：`core`、`core-ng`）。
- **FR-002**: System MUST 支持在“单次试跑/运行会话”维度选择 `kernelId`，并保证选择只影响当前会话（不跨会话隐式泄漏，且并发运行之间不得互相影响）；当调用方未提供 `kernelId` 时：若仅存在一个内核则使用该内核，否则必须由 Host 明确提供 `defaultKernelId`，缺省则失败并返回 `availableKernelIds`。
- **FR-003**: System MUST 在运行结果中总是记录 `requestedKernelId` 与 `effectiveKernelId`（允许相等），并提供可序列化的实现引用 `kernelImplementationRef`（复用 045 的 `KernelImplementationRef` schema；来源为 TrialRunReport 的 `environment.kernelImplementationRef`）。
- **FR-004**: System MUST 提供“枚举可用内核”的能力，返回稳定 `kernelId` + 最小可展示元信息（例如 `label`），并明确标识默认内核（`defaultKernelId` 或等价字段）；返回顺序必须稳定（以 Host 注册顺序为准）。
- **FR-005**: System MUST 对不可用/初始化失败的内核提供可理解的错误摘要与恢复建议；错误信息必须可序列化，且不得泄漏宿主敏感信息。
- **FR-006**: System MUST 支持严格模式（`strict`，默认 `true`）：任何无法按 `requestedKernelId` 运行的情况（包括缺失、加载失败、初始化失败、或发生 fallback）都必须以失败结束，并能被上层 Gate 使用。
- **FR-007**: 当 `strict=false` 且显式允许 fallback 时，System MAY 降级到 `defaultKernelId` 并继续运行；一旦发生 fallback，System MUST 显式记录 `fallbackReason`，并禁止静默回退（含 `strict=false` 但未允许 fallback 的场景）。
- **FR-008**: System MUST 保持“单内核默认用法”仍可用（单一配置等价于默认 kernel），以便逐步迁移 consumer；当仅存在一个内核时，调用方不提供 `kernelId` 也必须可运行且 `effectiveKernelId` 可解释。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 在只配置单内核且不使用选择能力的场景，系统的额外开销必须可忽略（不引入额外常驻分配/额外网络请求）。
- **NFR-002**: 运行与初始化过程必须产出结构化、可序列化且有界的诊断信息（含 kernelId、fallbackReason、预算裁剪摘要），便于 docs/debug/CI 解释。
- **NFR-003**: 与运行关联的关键标识必须确定性：Host MUST 能显式提供 `runId`；System MUST NOT 默认使用随机/时间戳作为唯一标识源（如需便捷默认值，必须是确定性的序号/派生值，并在结果中回显）。
- **NFR-004**: 安全边界必须清晰：Host 必须能限定可用内核来源；默认仅允许同源内核资源（跨域仅在 Host 显式允许且可审计时启用）；默认配置应以可复现/可审计为目标，不依赖不可控外部资源。
- **NFR-005**: 若该特性引入新的对照/门禁心智模型，必须在用户/开发者文档中提供稳定术语（≤5 关键词）与失败/降级解释口径，并与证据字段命名保持一致。

### Key Entities _(include if feature involves data)_

- **KernelVariant**: 一个可被选择的内核变体（`kernelId`（`[a-z0-9-]+`）+ 可展示元信息 + 资产引用（`kernelUrl` 指向 `logix-core.js`））。
- **KernelSelection**: 单次运行的请求/实际选择结果（`requestedKernelId`、`effectiveKernelId`、`strict`、`fallbackReason`）。
- **TrialRunResultSummary**: 单次试跑的面向读者摘要（含 `requested/effective kernelId`、`kernelImplementationRef`、耗时、成功/失败与可解释错误）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在同一浏览器 Host 中，至少两种内核变体可被注册并对同一模块分别完成试跑，且两次结果均明确标识 `effectiveKernelId`。
- **SC-002**: strict 模式下，请求不可用内核时能稳定失败并给出可理解错误摘要（含 availableKernelIds），无需查看源码即可定位问题。
- **SC-003**: 非 strict 且允许降级时，系统不会静默回退；结果中必须包含 fallbackReason 与实际使用内核，且可被 Devtools/Docs 展示。
- **SC-004**: Consumer 能在运行前枚举可用内核清单，并在运行后展示内核标识与实现引用（不需要解析非序列化对象）。
- **SC-005**: 单内核默认路径的加载与运行体验不因该特性显著变慢（以代表性页面/示例的“进入可运行态耗时”对比为准）。
- **SC-006**: 运行结果/证据在预算限制下仍能输出“被裁剪摘要”而不是崩溃或无界增长，且该摘要可用于解释失败原因。

## Dependencies

- 依赖已存在的 Sandbox/TrialRun 能力（Worker 隔离执行、结构化 RunResult/Report、预算上限）。
- 作为 consumer 代表：docs inline playground（041）与 core-ng 路线的对照验证需求（046/045）。

## Assumptions

- Host 能以可审计的方式提供至少一个内核变体（默认不依赖不可控外部资源）。
- Debug/对照需求是按需启用的：普通教学内容默认不暴露“选择内核”交互。

## Out of Scope

- 在线 IDE/依赖安装/任意 npm 包拉取等“远程执行环境”能力。
- 在没有明确对照需求的普通教学页面暴露内核选择 UI（仅在 debug 场景按需启用）。
