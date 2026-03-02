# Feature Specification: Logix CLI 最小内核 + 自扩展 + 自验证闭环（Forward-Only）

**Feature Branch**: `103-cli-minimal-kernel-self-loop`  
**Created**: 2026-02-27  
**Status**: Planned  
**Input**: User description: "重组 logix-cli：以最小内核 + 自扩展 + 自验证闭环为目标，CLI 仅做控制平面，外部 agent 动态决策；采用 forward-only，不做兼容层"

## 设计吸收边界（思想借鉴，不照搬）

本特性允许吸收外部优秀 CLI 的设计思想，但必须遵守以下硬约束：

- 可吸收：阶段化执行流水线（parse/normalize/validate/execute/emit）。
- 可吸收：配置优先级可见化（defaults/profile/env/CLI）与来源可解释。
- 可吸收：preflight 前置失败、非 TTY 危险动作自动拒绝、策略热重载与回退。
- 明确拒绝：时间戳/随机 ID 作为主锚点、`0/1` 粗粒度退出语义、仅消息字符串错误模型、默认 allow 的宽松策略、单体巨型 switch 分发。
- 验收口径：凡吸收项都必须回写到本 spec 的 FR/NFR/SC 与 tasks，确保“吸收的是约束，不是实现拷贝”。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-8

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 外部 Agent 可稳定编排 CLI 控制协议 (Priority: P1)

作为外部 Agent 编排者，我希望 `logix-cli` 对每次命令执行都输出稳定、可机读、可重放的控制结果，以便在无人干预下进行“观察-决策-执行-验证-评估”。

**Traceability**: NS-8, NS-3

**Why this priority**: 没有稳定协议，后续所有自闭环能力都无法成立。

**Independent Test**: 对同一输入执行两次（仅 runId 不同），结果在排序、reason、artifacts、trajectory 上保持可比对一致，并可被脚本直接路由下一步动作。

**Acceptance Scenarios**:

1. **Given** 外部 Agent 传入统一命令输入，**When** CLI 执行完成，**Then** 返回统一 `CommandResult@v2`，包含 `exitCode/reasonCode/reasons/nextActions`。
2. **Given** 同一语义输入重复执行，**When** 比较输出结果，**Then** 除显式允许字段外均保持稳定。

---

### User Story 2 - 控制平面与项目策略彻底解耦 (Priority: P1)

作为平台维护者，我希望 CLI 内核不再承载 feature/milestone 等项目语义，所有策略逻辑都通过扩展层注入，从而避免核心协议被业务词汇污染。

**Traceability**: NS-3

**Why this priority**: 这是“最小内核”是否成立的硬边界。

**Independent Test**: 在不改 CLI 内核代码的前提下替换策略扩展，核心协议字段和状态机保持不变。

**Acceptance Scenarios**:

1. **Given** 任意策略扩展，**When** CLI 输出核心协议对象，**Then** 核心字段中不出现 `feature/milestone/epic` 等项目语义。
2. **Given** 扩展加载失败或不兼容，**When** CLI 执行，**Then** 以结构化错误 fail-fast，不污染核心状态机。

---

### User Story 3 - verify-loop 作为机器可执行硬门链 (Priority: P1)

作为无人值守执行者，我希望有统一的 verify-loop **runtime 门禁链**（`gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol`），输出稳定 verdict 与 `nextActions`，供外部 bootstrap-loop 编排收敛。性能预算、SSoT 漂移、迁移检查属于 **governance 治理门**（US5/CI）。

**Traceability**: NS-8, NS-10

**Why this priority**: 没有硬门链，闭环会退化为“脚本猜测 + 人工兜底”。

**Independent Test**: 在包含故障样本的回归集上，verify-loop 能稳定给出 PASS/VIOLATION/RETRYABLE/NO_PROGRESS，并输出可审计证据。

**Acceptance Scenarios**:

1. **Given** 输入变更触发门禁违规，**When** 执行 verify-loop，**Then** 结果以 `exitCode=2` 与稳定 reason codes 阻断。
2. **Given** 可重试临时故障，**When** verify-loop 运行，**Then** 在受控重试预算内自动重试并记录 attempt 轨迹。

---

### User Story 4 - 扩展可自演进且安全可控 (Priority: P2)

作为扩展作者，我希望扩展支持 manifest/state/hot reload，并具备隔离、预算、回滚机制，允许 Agent 对扩展做自演进而不破坏核心执行面。

**Traceability**: NS-8, NS-10

**Why this priority**: 自扩展是“软件构建软件”的关键，但必须在控制平面约束下运行。

**Independent Test**: 新扩展加载-重载-回滚全流程可在本地自动执行，且任何异常都能结构化回报并回退到上一个健康版本。

**Acceptance Scenarios**:

1. **Given** 扩展升级后健康检查失败，**When** 热重载执行，**Then** 系统自动回滚到最后健康版本。
2. **Given** 扩展请求超出 capability allowlist，**When** 调用宿主能力，**Then** 请求被拒绝并产生结构化错误事件。

---

### User Story 5 - Forward-only 迁移与治理一体化 (Priority: P2)

作为仓库治理者，我希望每次协议破坏性升级都有明确迁移说明、自动检查与 CI 门禁，不再维护兼容层或弃用期双轨。

**Traceability**: NS-3, NS-10

**Why this priority**: 若没有治理闭环，协议演进会重新回到漂移状态。

**Independent Test**: CI 能识别并阻断缺迁移说明、缺 SSoT 回写、缺性能证据的变更。

**Acceptance Scenarios**:

1. **Given** 协议字段发生 breaking change，**When** 提交 PR，**Then** 必须同时提供 migration 文档并通过迁移检查。
2. **Given** 变更触及核心路径，**When** CI 执行，**Then** 必须产生可比较的 before/after 性能证据并通过阈值。

### Edge Cases

- 命令存在于 help/describe，但实现不可用（availability 漂移）。
- 扩展 manifest 合法但 hooks 执行超时/崩溃。
- reason code 未登记或 `reasons[].data` 不可序列化。
- 相同 runId 重放导致幂等冲突。
- verify-loop 长时间无进展（连续重试但状态不收敛）。
- diagnostics=off 时仍有显著性能回退。
- 非 TTY 环境下出现需要人工确认的危险写操作。
- 策略热重载过程中规则变更，导致“校验通过后执行前”发生漂移。
- IPC/外部进程瞬态故障（EAGAIN/EOF/ECONN*）被误判为内部永久错误。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8) 系统 MUST 定义并对外暴露最小控制协议对象：`ControlCommand/ControlEvent/ControlState/CommandResult`。
- **FR-002**: (NS-8) 所有命令 MUST 统一输出 `CommandResult@v2`，包含 `schemaVersion=2`、`exitCode`、`reasonCode`、`reasons[]`、`artifacts[]`。
- **FR-003**: (NS-10) 系统 MUST 提供稳定标识链：`instanceId/txnSeq/opSeq/attemptSeq`，并在 `CommandResult@v2` 与 `verify-loop.report.json` 中强制必填，且可从结果反查执行轨迹。
- **FR-004**: (NS-8) `CommandResult@v2` MUST 提供 `nextActions[]`，其最小 DSL 必须包含 `id/action`（可选 `args/ifReasonCodes`），用于外部 Agent 机读路由下一步。
- **FR-005**: (NS-10) CLI MUST 产出 Slim 且可序列化的执行轨迹 artifact（如 `control.events.json` 或等价物）。
- **FR-006**: (NS-3) 命令注册 MUST 基于单一 `CommandRegistry`，help/describe/dispatch 三者一致；不可用命令必须显式 `availability=unavailable`。
- **FR-007**: (NS-3) 未实现能力 MUST 使用专用退出语义（`NOT_IMPLEMENTED`），不得与内部异常混淆。
- **FR-008**: (NS-3) 核心协议字段 MUST 禁止项目语义词汇；项目策略仅允许进入 `ext.*` 命名空间。
- **FR-009**: (NS-8) 系统 MUST 提供 Extension Host Runtime，支持 manifest 校验、hook 生命周期、状态持久化、热重载、回滚。
- **FR-010**: (NS-10) 扩展执行 MUST 在能力白名单与隔离边界内运行，禁止直接访问 internal 模块。
- **FR-011**: (NS-8) 系统 MUST 提供 verify-loop 入口，支持机器可执行 **runtime gate**（`gate:type/gate:lint/gate:test/gate:control-surface-artifact/gate:diagnostics-protocol`）与结构化 verdict。
- **FR-012**: (NS-10) verify-loop MUST 支持重试预算与 no-progress 判定，避免无限循环。
- **FR-013**: (NS-3) `describe --json` MUST 返回机器可读能力快照（命令、协议版本、可用性、扩展能力）。
- **FR-014**: (NS-3) 系统 MUST 提供 forward-only 迁移包（映射表、迁移步骤、失败指引），不保留兼容层。
- **FR-015**: (NS-8) CLI MUST 明确非目标：不内置 agent loop/memory/policy/runtime；`bootstrap-loop` 仅作为外部编排脚本示例，不属于 CLI 发布物与命令集。
- **FR-016**: (NS-3) CLI MUST 实施统一五段式控制流水线（`parse -> normalize -> validate -> execute -> emit`），并在轨迹中保留阶段结果。
- **FR-017**: (NS-3) CLI MUST 输出配置优先级覆盖链（defaults/profile/env/argv）与最终生效值来源，禁止隐式覆盖。
- **FR-018**: (NS-10) 当运行在非 TTY 环境且涉及危险写操作时，系统 MUST 默认拒绝并返回结构化拒绝原因。
- **FR-019**: (NS-8) 系统 MUST 对瞬态执行错误进行分类，并映射到 `RETRYABLE` 退出语义（而非统一 ERROR）。
- **FR-020**: (NS-10) 扩展热重载在 `atomic swap` 前 MUST 进行二次策略校验，防止策略漂移导致错误提交。
- **FR-021**: (NS-8) verify-loop MUST 产出 `verify-loop.report.json`，并通过 `contracts/schemas/verify-loop.report.v1.schema.json` 校验。
- **FR-022**: (NS-3) 系统 MUST 将门禁分层为 runtime 与 governance：runtime 用于每轮 verify-loop 收敛；governance 用于 CI 治理阻断（`gate:migration-forward-only/gate:ssot-drift/gate:perf-hard`）。
- **FR-023**: (NS-8) verify-loop MUST 提供 run/resume 契约与输入 schema（`contracts/schemas/verify-loop.input.v1.schema.json`），后续轮次必须可用稳定标识链关联到同一闭环任务。
- **FR-024**: (NS-3) verify-loop report MUST 声明 `gateScope(runtime|governance)`，并由 schema 强约束 `gateResults.gate` 只能来自对应分层集合。
- **FR-025**: (NS-3) `describe` MUST 基于运行时可执行真相投影命令能力；禁止“可见但不可执行”的幽灵命令（ghost commands）。
- **FR-026**: (NS-8) `trialrun` MUST 从 `NOT_IMPLEMENTED` 升级为可执行命令，并输出可复放的 `trialrun.report`（含稳定标识链）。
- **FR-027**: (NS-3) `contract-suite.run` MUST 合并为 `ir validate --profile contract`；旧命令入口必须返回结构化迁移错误（`E_CLI_COMMAND_MERGED`）与下一步动作。
- **FR-028**: (NS-8) `spy.evidence` MUST 合并为 `trialrun --emit evidence`；旧命令入口必须返回结构化迁移错误（`E_CLI_COMMAND_MERGED`）。
- **FR-029**: (NS-3) `anchor.index` MUST 合并为 `ir export --with-anchors`；旧命令入口必须返回结构化迁移错误（`E_CLI_COMMAND_MERGED`）。
- **FR-030**: (NS-8) `transform.module` MUST 提供最小可执行实现（`insert/remove/replace`）并保持 report-first（`--mode report` 默认）。
- **FR-031**: (NS-8) examples 门禁 MUST 升级为自治闭环链：`gate_static -> gate_dynamic -> gate_contract -> gate_decision -> gate_verdict`，并产出统一裁决工件 `verdict.json`。
- **FR-032**: (NS-10) 自治闭环裁决 MUST 使用结构化失败语义：`PASS/FAIL_HARD/FAIL_SOFT/BLOCKED/INFRA_FLAKY`，并绑定机读错误码与证据引用。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10) `logix --help` 与纯元信息命令冷启动预算 MUST 满足 p95 `< 500ms`。
- **NFR-002**: (NS-10) 诊断必须分级 `off/light/full`，并提供成本预算；`off` 模式下额外开销目标 p95 `<= +5%`。
- **NFR-003**: (NS-10) 诊断事件 MUST Slim 且 JSON 可序列化；不允许不可序列化对象进入协议输出。
- **NFR-004**: (NS-10) 标识必须确定性可重放，不允许随机值或时间戳作为主键来源。
- **NFR-005**: (NS-3) 事务窗口 MUST 禁止 IO/async 逃逸；违规必须被诊断并阻断。并维护明确事务边界：`normalize/validate/execute.plan` 在 txn 内；`parse/preflight/execute.effect/emit/verify-loop gate-run` 在 txn 外。
- **NFR-006**: (NS-3) 协议解析 MUST fail-fast：未知字段、未知命令、未知 reason code 必须明确失败；`command-result.v2`、`extension-manifest.v1`、`verify-loop.report.v1` 三个 schema 根对象必须 `additionalProperties: false`（扩展数据仅允许进入 `ext`）。
- **NFR-007**: (NS-10) 扩展 hook 必须有超时与资源预算（CPU/内存/队列上限），超限时可回退且不拖垮宿主。
- **NFR-008**: (NS-3) 触及核心路径的变更必须附可比较性能证据（before/after 同环境同 profile）。
- **NFR-009**: (NS-3) 所有 breaking 变更必须附迁移说明；不允许兼容层与弃用期双轨。
- **NFR-010**: (NS-3) 公开命令路径（`describe/ir export/ir validate/ir diff/trialrun/transform.module`）`CLI_NOT_IMPLEMENTED` 暴露率 MUST 为 0。
- **NFR-011**: (NS-10) 同输入重复运行 `trialrun` 两次时，稳定标识链（`instanceId/txnSeq/opSeq`）一致率 MUST 为 100%。
- **NFR-012**: (NS-10) 自治闭环门禁产物 MUST 包含最小证据包与校验清单：`trialrun.report.json`、`trace.slim.json`、`evidence.json`、`verdict.json`、`checksums.sha256`。

### Key Entities _(include if feature involves data)_

- **ControlCommand**: 一次控制平面调用输入，包含命令、执行约束与稳定引用。
- **ControlEvent**: 执行过程中的最小事件记录，承载状态迁移证据。
- **ControlState**: 可重放状态快照，描述当前生命周期位置与计数器。
- **CommandResultV2**: 标准执行结果 envelope，供外部 Agent/CI 机读。
- **ExtensionManifestV1**: 扩展能力声明、hooks、限制与版本协商入口。
- **ExtensionStateV1**: 扩展运行态与持久态描述，支持迁移与回滚。
- **VerifyLoopReport**: verify-loop 的门禁执行报告、收敛判定与下一步建议。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-8) `logix-cli` 100% 命令输出 `CommandResult@v2`，并通过 schema 校验。
- **SC-002**: (NS-10) 同一语义输入重复运行时，除显式允许字段外结果字节稳定率达到 100%。
- **SC-003**: (NS-3) 核心协议字段中 `feature/milestone/epic` 语义泄漏为 0（通过 lint/contract 检查）。
- **SC-004**: (NS-8) verify-loop 在标准回归样本中自动收敛通过率 >= 80%，且无无限循环案例。
- **SC-005**: (NS-10) diagnostics=off 情况下关键命令 p95 回归不超过 +5%。
- **SC-006**: (NS-3) 每个 breaking 变更均有 migration 文档与 CI 迁移检查，覆盖率 100%。
- **SC-007**: (NS-8) 扩展热重载失败回滚成功率 100%，且无宿主进程崩溃。
- **SC-008**: (NS-3) “测试通过但 CLI Gate 失败”的样本可被稳定阻断，误放行率 0。
- **SC-009**: (NS-3) 配置覆盖链可解释率 100%（每个最终值可追溯到唯一来源）。
- **SC-010**: (NS-10) 非 TTY 危险写操作默认拒绝准确率 100%，且均返回结构化 reason code。
- **SC-011**: (NS-8) 瞬态错误分类到 `RETRYABLE` 的回归样本命中率 >= 95%。
- **SC-012**: (NS-8) `verify-loop.report.json` schema 校验通过率 100%。
- **SC-013**: (NS-3) 对三类 schema 注入未知字段时阻断率 100%（误放行率 0）。
- **SC-014**: (NS-8) 闭环 run/resume 关联准确率 100%（同任务多轮 attempt 可无歧义回放）。
- **SC-015**: (NS-8) `verdict <-> exitCode` 非法组合阻断率 100%（不得出现 `PASS+非0`、`VIOLATION+非2` 等）。
- **SC-016**: (NS-3) 公开命令路径 `CLI_NOT_IMPLEMENTED` 计数为 0（旧入口仅允许返回 `E_CLI_COMMAND_MERGED`）。
- **SC-017**: (NS-10) `trialrun` 同输入双次重跑关键标识链一致率 100%，并生成可比较 `trialrun.report.json`。
- **SC-018**: (NS-3) 三个合并命令（`contract-suite.run/spy.evidence/anchor.index`）迁移提示覆盖率 100%（reason code + nextActions + 文档指针）。
- **SC-019**: (NS-8) examples 自治闭环门禁在 CI 回归样本通过率 >= 90%，且每次执行均产出 `verdict.json` 与 `checksums.sha256`。
- **SC-020**: (NS-8) `transform.module --mode report` 可解释报告覆盖率 100%（每个操作均包含目标、变更类型与结果）。
