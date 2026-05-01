# Feature Specification: Runtime Final Cutover

**Feature Branch**: `130-runtime-final-cutover`
**Created**: 2026-04-07
**Status**: Planned
**Input**: User description: "围绕 core 与 kernel 按 docs 未来规划做最彻底、最激进的最终收口，清掉剩余 shell、旧语义和未落地控制面，把 runtime 主线彻底压成单一 kernel 与最小公开面。"

## Context

`122-runtime-public-authoring-convergence`、`123-runtime-kernel-hotpath-convergence`、`124-runtime-control-plane-verification-convergence` 已分别收口了公开主链、kernel hot path 与 verification control plane 的第二波方向，但当前仓内仍残留三类“未终局”状态：

- canonical docs 已领先代码，仍有少量 capability / control plane / shell 处于半落地状态
- runtime core 已集中到单一主线，但外层 forwarding shell、旧语义残影与未完全 cutover 的专家入口仍在拖慢最终收口
- control plane contract 已形成，但公开一级入口、运行时默认心智与各包消费路径还没有完全压到同一条最终主线

这份 spec 的目标不是做第三轮温和修补，而是定义一轮 forward-only 的最终 cutover：凡是不能证明自己必须继续存在的过渡层、旧语义、双重命名和 limbo capability，都在本轮被解决，而不是继续保留到“以后再说”。

## Scope

### In Scope

- `packages/logix-core/**` 中与 runtime final cutover 直接相关的公开面、runtime shell、runtime core 与 control plane 入口
- `packages/logix-react/**` 中与 host projection 边界和 runtime 主线直接相关的 package-local 消费面
- `packages/logix-devtools-react/**` 中与 diagnostics / host projection / control plane 边界直接相关的 package-local 消费面
- `packages/logix-core/test/observability/**`、`packages/logix-test/test/**`、`packages/logix-sandbox/src/{Client.ts,Service.ts}`、`packages/logix-sandbox/test/browser/**` 中直接消费旧入口的验证与宿主路径
- `docs/ssot/runtime/**`、`docs/ssot/platform/**`、`docs/adr/**`、`docs/standards/**` 中与 final cutover 直接相关的事实源
- `examples/logix/**` 中 canonical runtime examples
- `@logixjs/cli`、`@logixjs/test`、`@logixjs/sandbox` 与 runtime control plane 主入口的直接对齐面

### Out of Scope

- 不在本轮扩写新的 domain package 产品能力
- 不在本轮处理与 runtime final cutover 无直接关系的 UI 视觉层重构
- 不在本轮引入新的平台叙事或额外静态模型

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者看到唯一 runtime 主线 (Priority: P1)

作为维护者，我需要看到一条没有壳层歧义、没有双重入口、没有 limbo capability 的 runtime 主线，这样我才能继续在 core 上做演进，而不会被旧过渡层拖回去。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: 如果 runtime 主线还留着“半收口”状态，后续每一刀都会继续被旧壳层、旧语义和局部例外反向污染。

**Independent Test**: 抽取任意一个 runtime 相关改动点，维护者可以在 5 分钟内判断它属于 canonical public surface、expert kernel、runtime core、runtime control plane 或 UI projection，并且不存在“同时属于两层”的灰区。

**Acceptance Scenarios**:

1. **Given** 一个新的 runtime 入口提议， **When** reviewer 对照本 spec 检查， **Then** 它要么被并入唯一公开主链，要么被降到 expert / package-local 路径，不允许新增并列主入口。
2. **Given** 一个现有 forwarding shell 或旧 carry-over 包装， **When** 维护者对照本 spec 检查， **Then** 它要么被删除，要么进入显式 allowlist，并附带 owner 与保留理由。

---

### User Story 2 - Agent 只面对一套可验证的 control plane (Priority: P2)

作为 Agent，我需要一套最终确定的 runtime control plane，知道默认验证、升级验证和证据比较都只走同一条入口，不需要在 `Observability`、`Reflection` 和 host-specific 路径之间自己猜。

**Traceability**: NS-8, NS-10

**Why this priority**: 当前 contract 已存在，但公开主入口和默认消费心智还没完全定死，这会继续制造自动化验证分叉。

**Independent Test**: 给定一个验证意图，Agent 能在 5 分钟内把它路由到唯一的一级入口和对应 stage/mode，不需要借助旧命名或并列入口。

**Acceptance Scenarios**:

1. **Given** 一个 startup 自证需求， **When** Agent 查阅本 spec， **Then** 它只会选择 `runtime.check / runtime.trial / runtime.compare` 主线中的正确入口。
2. **Given** 一个历史 trial/evidence 入口， **When** reviewer 对照本 spec 检查， **Then** 它会被判定为 canonical、expert alias 或待删除残留之一，而不是继续处于未定状态。

---

### User Story 3 - reviewer 能拒绝任何第二真相源或旧心智回流 (Priority: P3)

作为 reviewer，我需要一套明确、强硬的最终收口规则，能拒绝任何第二套 runtime、第二套 control plane、第二套 diagnostics truth source，或者任何把代码重新拉回 v3 / platform-first 心智的提议。

**Traceability**: NS-4, KF-9

**Why this priority**: 真正的 final cutover 不只是“把代码调通”，还要把未来所有回流路径在规则层堵死。

**Independent Test**: reviewer 能据此对一个改动给出明确结论：保留、下沉、删除、延期，但不能出现“先留着过渡”这种没有 owner 的模糊状态。

**Acceptance Scenarios**:

1. **Given** 一个新能力想走第二套 runtime 或第二套 verification DSL， **When** reviewer 对照本 spec， **Then** 必须直接拒绝。
2. **Given** 一个 docs/example/export 与最终主线口径不一致， **When** 维护者对照本 spec， **Then** 必须在同一波 cutover 内完成回写，不能留作隐性漂移。

### Edge Cases

- 某个 host-specific 行为对宿主确实必要，但它只允许停在 package-local host projection 或 expert 升级层，不能继续混入 canonical runtime 主线。
- 某个 capability 名字已经进入 docs，但语义尚未稳定时，本轮必须二选一：落地稳定语义，或者退出 canonical surface；不允许继续处于 limbo。
- 某个旧入口仍被测试或 examples 使用时，本轮必须同时改测试、examples 与 docs，不能靠“先兼容一下”拖延。
- 某个旧入口若仍被 test harness、browser sandbox worker 或 observability contract tests 当默认路径使用，本轮也必须视为 first-class consumer 收口面，不能用“只是测试代码”延期。
- 某个 direct consumer 仍从 canonical root export 读取 legacy 或 allowlist surface 时，本轮必须同时改 exports、consumer 与 migration ledger，不能只在 docs 里降级叙事。
- 某个 hot-path 优化若只能靠额外壳层或第二模型成立，本轮优先保持主线简洁，必要时把该优化后置。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8, NS-10) 系统 MUST 把公开 runtime 主链固定为 `Module / Logic / Program / Runtime`，不再保留任何并列公开装配入口、并列公开运行入口或并列公开验证入口。
- **FR-002**: 系统 MUST 要求所有 surviving surface 明确归属到唯一层级：canonical public surface、expert kernel、runtime core、runtime control plane、UI projection；不允许一个入口同时承担多层角色。
- **FR-003**: (NS-8, KF-8) 系统 MUST 把 runtime control plane 的一级入口最终收口到 `runtime.check / runtime.trial / runtime.compare`，并要求旧 trial/evidence 入口退出 canonical 主叙事。
- **FR-004**: 系统 MUST 删除或显式 allowlist 所有剩余 runtime forwarding shell、过渡层 re-export 和 carry-over 包装；allowlist 默认预算为 0，任何保留项都必须带 owner、保留理由、退出条件与必要性证明。
- **FR-005**: 系统 MUST 规定 `Kernel` 只作为 expert 升级层存在，不得重新长成并列 authoring mainline 或并列 control plane mainline。
- **FR-006**: 系统 MUST 解决所有 canonical capability 的 limbo 状态；任何仍写在 canonical docs 的 capability，必须在本轮被实现为稳定语义，或从 canonical docs/examples/contracts 中删除。
- **FR-007**: 系统 MUST 清除 canonical code/docs/examples/tests/public exports 中残留的旧心智标记，包括旧 facade 叙事、v3/platform-first 残影和“为了过渡先留着”的模糊表述。
- **FR-008**: 系统 MUST 保证 runtime core 不感知 surface 来源；domain package、host adapter、CLI、sandbox、test 都只能消费同一个 runtime 主线与 control plane contract。
- **FR-009**: 系统 MUST 让 docs、spec、examples、tests、public exports 在同一波 cutover 内完成交叉回写，不允许继续依赖“文档领先代码但不收口”的长期状态。
- **FR-010**: 系统 MUST 审计并收口 direct consumers 的默认路径，至少覆盖 `packages/logix-cli/**`、`packages/logix-test/**`、`packages/logix-sandbox/**`、`packages/logix-react/**`、`examples/logix/**` 与 `packages/logix-core/test/{Contracts,Runtime,observability,Reflection,TrialRunArtifacts}/**`，不得把任何旧入口留成默认写法。
- **FR-011**: 系统 MUST 对 `Module.implement(...)`、`Runtime.trial(...)`、`Runtime.trial(...)`、`Reflection.verify*` 这类历史路径给出最终命运：canonical 删除、expert alias、backing-only 或 allowlist；禁止继续处于“既不删除也不定性”的状态。
- **FR-012**: 系统 MUST 迁移或显式降级所有仍把 `Runtime.trial*`、`Reflection` 直接校验入口或同类旧 facade 当默认路径的 direct consumers，包括 core 自身测试、CLI、sandbox、test harness 与 canonical examples。
- **FR-013**: 系统 MUST 把 owner docs 一并收口到同一事实源，至少覆盖 `runtime/01`、`runtime/03`、`runtime/04`、`runtime/05`、`runtime/07`、`runtime/09`、`platform/01`、`platform/02` 与 `runtime/README.md`。
- **FR-014**: 系统 MUST 把所有 control-plane-adjacent surface 明确定性为 `canonical facade`、`expert alias`、`backing-only` 或 `remove`，至少覆盖 `ControlPlane`、`Observability`、`Reflection`、sandbox client/service、CLI command adapters 与 root barrel 导出，不允许保留未定性状态。
- **FR-015**: 系统 MUST 全量枚举并裁决受影响 package 的 root export 与 subpath export，至少覆盖 `packages/logix-core`、`packages/logix-cli`、`packages/logix-test`、`packages/logix-sandbox`；任一未分类导出、legacy re-export 或 allowlist 项泄露到 canonical root export，均视为失败。
- **FR-016**: 系统 MUST 在开始任何 breaking cutover 之前登记 migration ledger；每个 remove / rename / expert-only / internal-backing-only 迁移都必须记录 old path、replacement 或 no replacement、受影响 consumers 与 docs/examples 清零状态。
- **FR-017**: 系统 MUST 把 CLI trial stub、sandbox `trialRunModule` 默认路径、`@logixjs/test` 默认 `.implement()` 心智，以及 `packages/logix-core/test/**`、`packages/logix-sandbox/test/**` 中的旧默认路径视为 first-class final cutover 阻断项；未完成迁移或显式 allowlist 前不得宣称 runtime/control plane 已收口。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) 系统 MUST 为本轮命中的 steady-state hot paths 提供可比 baseline / diff 证据，并明确任何 shell 删除或内核收敛不会引入未解释的性能回退。
- **NFR-002**: 系统 MUST 保持 diagnostics=off 时的默认 steady-state 成本接近零附加开销，且这条口径在 docs、evidence 和运行时诊断字段中保持一致。
- **NFR-003**: 系统 MUST 让每个 steady-state runtime responsibility 都有明确 owner 落点，不依赖隐藏协调壳或多层同义桥接才能理解。
- **NFR-004**: 系统 MUST 延续 forward-only 演进规则；任何 breaking cutover 都提供迁移说明，但不得保留兼容层或弃用期。
- **NFR-005**: 系统 MUST 让控制面机器报告、诊断事件和证据摘要保持 slim、可序列化、可稳定比较，不能为了 final cutover 再长第二真相源。
- **NFR-006**: shell 删除、入口收口或命名收口本身不构成性能收益证据；若本轮宣称性能改善，必须附 comparable baseline / diff，若没有则只允许给结构收口结论，不给性能结论。
- **NFR-007**: 若 final cutover 命中 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`、`packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`、`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 之一，系统 MUST 先完成无损拆解简报与拆解落盘，再进行语义切换；未提供 comparable before/after evidence 时，不得给出性能改善结论。

### Key Entities _(include if feature involves data)_

- **Canonical Runtime Spine**: 指 `Module / Logic / Program / Runtime` 这条唯一公开主链，以及它在 docs、examples、exports 中的统一叙事。
- **Runtime Core Zone**: steady-state 热链路的主实现落点，只承接统一 runtime 语义，不承接 control plane 或宿主投影语义。
- **Expert Kernel Surface**: 允许存在但必须显式命名、显式边界化的升级层能力，例如 `Kernel` 家族。
- **Runtime Control Plane**: 承接 `check / trial / compare`、机器报告与证据比较的唯一控制面。
- **Transition Residue**: 指 forwarding shell、legacy wrapper、旧命名、旧注释、旧 examples 和任何 limbo capability。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-4, NS-8) 在 `/packages/logix-core /packages/logix-cli /packages/logix-test /packages/logix-sandbox /packages/logix-react /packages/logix-devtools-react /examples/logix /docs` 的约定扫描根内，对被判定退出 canonical surface 的字符串与入口执行全量扫描，`Module.implement(...)`、并列运行入口、并列验证入口和未解释的 carry-over 写法命中次数为 0；allowlist 命中必须全部落在 allowlist ledger 中。
- **SC-002**: 任意 runtime 相关改动点都能在 5 分钟内被归类到唯一层级，并且在审查样本中不出现“边界不清”结论。
- **SC-003**: 所有一级验证入口都统一到 `check / trial / compare` 命名与共享 report contract，旧 trial/evidence 名字不再出现在 canonical surface。
- **SC-004**: canonical capability surface 中不再存在 limbo 项；每个 capability 要么已稳定落地，要么明确退出 canonical docs/examples/contracts。
- **SC-005**: 对本轮命中的 steady-state hot paths，p95 latency / allocations / diagnostics-off 开销不出现未解释回退。
- **SC-006**: reviewer 能用本 spec 直接拒绝第二套 runtime、第二套 control plane、第二真相源或旧心智回流提议，且不依赖额外口头解释。
- **SC-007**: `packages/logix-cli`、`packages/logix-test`、`packages/logix-sandbox`、`packages/logix-react`、`examples/logix` 与 core contract/runtime/observability tests 中，不再存在未说明的 legacy default path。
- **SC-008**: `packages/logix-core/test/observability/**`、`packages/logix-core/test/Contracts/**`、`packages/logix-cli/**`、`packages/logix-sandbox/**` 与 `examples/logix/**` 中不再把旧 trial/evidence facade 当默认路径；剩余命中项都已被标记为 expert-only、backing-only 或 allowlist。
- **SC-009**: `packages/logix-core/src/index.ts` 的 root exports 只保留显式分类后的 canonical / expert / control-plane 命名，不再通过混合导出让使用方误判默认主路径。
- **SC-010**: allowlist 中不存在占位项、无 owner 项、无退出条件项；若 final gate 时 allowlist 非空，每一项都已附必要性证明与人类可读风险说明。
- **SC-011**: canonical code/docs/examples/exports 中 `v3:`、platform-first 残影与壳层保留性注释命中数为 0；剩余命中项只能存在于显式 allowlist 或 archive/history 区域。
- **SC-012**: 每个 breaking surface 都有 migration ledger 条目，并且 `docs-consumer-matrix` 中不存在未判定或未迁移完成的 direct consumer。
- **SC-013**: `packages/logix-cli`、`packages/logix-sandbox`、`packages/logix-test` 与 `packages/logix-core/test/**` 的默认入口中，`CLI_NOT_IMPLEMENTED`、`TRIAL_BACKEND_PENDING`、`trialRunModule` 默认路径、未经 allowlist 的 `.implement(` 命中次数为 0。
- **SC-014**: 所有命中 `ModuleRuntime.impl.ts`、`WorkflowRuntime.ts`、`StateTransaction.ts` 的改动都伴随 decomposition brief、before/after perf artifacts 和 diff verdict；没有“只做结构收口但顺带改语义”的未解释提交面。

## Clarifications

### Session 2026-04-07

- Q: 这份 spec 是否只做 `core` 目录内的局部清理？ → A: 否。它是 final cutover 总控 spec，要求 `core + docs + examples + 直接相关的 cli/test/sandbox 消费面` 一起收口。
- Q: 对 canonical capability 里的 limbo 项如何处理？ → A: 本轮必须二选一：落地稳定语义，或退出 canonical surface，不允许继续半保留。
- Q: 如果某个过渡层仍有用户价值，是否可以先留着？ → A: 只有进入显式 allowlist 并附带 owner、保留理由和退出条件时才允许保留；默认删除。
