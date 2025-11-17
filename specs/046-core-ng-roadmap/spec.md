# Feature Specification: After 045 路线图（core-ng 长期演进与切换门槛）

**Feature Branch**: `046-core-ng-roadmap`
**Created**: 2025-12-27
**Status**: Done
**Input**: User description: "在 specs 侧把 after 045 的长期路线图固化为可验收的 spec，明确里程碑/门槛/039 去向，并回答 core-ng 是否必须依赖 Vite/AOT 等工程化手段才能进阶"

## Terminology

- **当前内核（core）**：当前 `@logix/*` 正式包所使用的默认内核实现。
- **下一代内核（core-ng）**：以 `@logix/core-ng` 为载体的下一代内核实现；与当前内核并行演进，最终可切换为默认实现。从 M2（trial-run/test/dev 渐进替换）起，core-ng 必须以独立包 `@logix/core-ng`（`packages/logix-core-ng/`）承载；内嵌在 `@logix/core` 的实现不计入 core-ng 证据与 Gate。
- **Kernel Contract**：上层（`@logix/react`/Devtools/Sandbox/平台）与内核之间的稳定契约边界；由 `specs/045-dual-kernel-contract/` 固化。
- **Sandbox kernel 资产（Browser kernel variant）**：`@logix/sandbox` Worker 使用的内核资产变体（`kernelId → kernelUrl`），用于 Browser trial-run/对照入口；相关选择/strict/fallback/错误摘要字段由 `specs/058-sandbox-multi-kernel/` 固化，并与 runtime 的 `KernelImplementationRef` 口径对齐。
- **证据门禁**：任何触及核心路径的改动必须以 `$logix-perf-evidence` 产出可复现的 Node + Browser before/after/diff，并用结构化证据阻断负优化；perf evidence 允许在 dev 工作区（git dirty）采集，但必须确保 `matrix/config/env` 一致，并在 diff 中保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时升级到 `profile=soak`）。
- **NG-first（compiler-first）**：在“当前无真实业务包袱”的前提下，路线图优先服务 NG 的理想形态：更强静态化、更少运行期魔法、更可证据化；允许大范围 breaking。
- **ReadQuery / SelectorSpec（状态读取查询）**：描述“读哪些状态/如何组合结果”的可编译协议；用于静态化与可解释性。注意：这不是领域层的 `@logix/query`（服务/缓存/请求）。
- **读状态车道（Read Lanes）**：三段式：AOT（可选编译插件）→ Runtime JIT（默认）→ Dynamic（兜底）。对外至少要可观测地区分 `static` 与 `dynamic`，并能解释降级原因。
- **Strict Gate**：在 CI / perf gate 等关键验证场景，可把 “dynamic 回退” 视为失败（避免误以为已静态化）。
- **Struct Memo（复用引用）**：对 `(s) => ({ a: s.a, b: s.b })` 这类 struct selector，字段未变则复用同一对象引用（默认不要求用户手写 shallow compare）。

## Related (read-only references)

- `specs/045-dual-kernel-contract/`（可替换内核契约与对照验证跑道）
- `specs/057-core-ng-static-deps-without-proxy/`（读状态车道：ReadQuery/SelectorSpec + SelectorGraph）
- `specs/039-trait-converge-int-exec-evidence/`（当前内核热路径整型化与证据达标）
- `specs/043-trait-converge-time-slicing/`（显式 opt-in 的语义改变：跨帧/降频）
- `specs/044-trait-converge-diagnostics-sampling/`（新观测口径：采样诊断）
- `specs/060-react-priority-scheduling/`（Txn Lanes：更新优先级 / 可解释调度）
- `docs/specs/drafts/topics/logix-ng-architecture/`（NG 架构探索草案：非裁决、供参考）

## Clarifications

### Session 2025-12-28

- Q: 这里的 ReadQuery/SelectorSpec 是否等同于领域层 `@logix/query`？ → A: 不等同。ReadQuery 只描述“读状态依赖与投影”，用于渲染/派生/订阅的静态化与可解释性；领域 Query 仍负责“服务调用/缓存/请求”等。
- Q: 不安装任何编译插件时是否仍可用？ → A: 必须可用。默认走 Runtime JIT；无法静态化时可回退到 Dynamic，但回退必须可观测/可审计，并在 Strict Gate 下可变为失败。
- Q: `$logix-perf-evidence` 的采集隔离要求怎么定？ → A: 允许在 dev 工作区采集（可为 git dirty），但必须确保 `matrix/config/env` 一致，并保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时 `profile=soak`）。
- Q: perf evidence 的 suites/budgets 的单一事实源（SSoT）怎么定？ → A: 统一以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT（至少覆盖 `priority=P1`），并以 `matrixId+matrixHash` 保证可比性；硬结论至少 `profile=default`。
- Q: 047 Full Cutover Gate 的 coverage matrix（必选 serviceId 列表）SSoT 落点？ → A: 以代码为 SSoT：在 `@logix/core`（优先 `packages/logix-core/src/Kernel.ts`）导出读取入口；测试/CI/harness 只读此处；spec/docs 仅解释口径。
- Q: 从哪个里程碑开始强制要求以独立包 `@logix/core-ng` 承载 core-ng？ → A: M2 起强制（进入 trial-run/test/dev 渐进替换就必须是独立包；否则不计入 core-ng 证据与 Gate）。
- Q: 047 Full Cutover Gate 的 coverage 是否要求全覆盖 Kernel Contract 的可替换 services？ → A: 要求全覆盖：coverage 必须等于 Kernel Contract 当前所有可替换 `serviceId`；新增 `serviceId` 必须同步纳入，否则视为 Gate 失真。
- Q: 047 Gate 失败输出的最小可序列化证据锚点必须包含哪些字段？ → A: `kernelId + missingServiceIds + moduleId/instanceId/txnSeq`（完整 runtimeServicesEvidence 仅 light/full）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 做完 045 后“下一步干什么”一眼可见 (Priority: P1)

作为仓库维护者，我希望在 `specs/` 里有一份正式的“After 045 路线图”，让我做完 045 之后能立刻知道下一步的优先级、里程碑与门槛，而不是依赖草案或脑内记忆。

**Why this priority**: 045 是分支点；如果后续目标不清晰，容易出现“做完 045 反而不知道往哪走”的停滞，或把探索性想法误当成裁决推进。

**Independent Test**: 只阅读本 spec（不看代码/草案），读者能在 5 分钟内明确：下一步的 3 个里程碑、每个里程碑的达标门槛、以及哪些内容明确不做/另立 spec。

**Acceptance Scenarios**:

1. **Given** 读者刚完成 `specs/045-dual-kernel-contract/` 的实现，**When** 打开本 spec，**Then** 能明确下一阶段是“当前内核加固（039）/core-ng 并行演进/显式语义探索”中哪些优先，且每条路线都有明确退出条件。
2. **Given** 读者想判断某个改动是否属于“纯优化不改语义”，**When** 对照本 spec 的边界说明，**Then** 能判断该改动应落到 039、045 后续、还是另立 spec（如 043/044）。

---

### User Story 2 - 让平台/上层建设可以放心并行 (Priority: P1)

作为平台与上层生态建设者，我希望路线图明确“哪些契约点会稳定下来、哪些允许轻量迁移、哪些必须证据拦截”，从而我可以在不等待内核完全重写的情况下推进平台/Devtools/Sandbox，而不会担心地基反复动导致路径过长。

**Why this priority**: 上层生态的建设成本更高、周期更长；需要明确“稳定面”与“变动面”以避免并行开发互相打断。

**Independent Test**: 读者能从路线图中找到：上层只依赖的稳定边界（Kernel Contract/统一最小 IR/稳定锚点），以及“切换默认内核”的硬门槛。

**Acceptance Scenarios**:

1. **Given** 上层（react/devtools/sandbox）只依赖 `@logix/core`，**When** core-ng 并行演进，**Then** 路线图明确上层不需要直接依赖 core-ng，切换发生在 runtime 装配阶段，且必须可证据化。

---

### User Story 3 - core-ng 进阶不被工具链绑死 (Priority: P2)

作为运行时维护者，我希望路线图明确：core-ng 的能力进阶并不强依赖 Vite/AOT 等工程化手段；同时也能清晰说明在什么条件下才值得引入编译工具链，以及它应如何与统一最小 IR/证据门禁对齐，避免“为了极致而引入长期税”。

**Why this priority**: 工具链（AOT/插件）一旦引入就是长期维护成本；需要明确它是“可选加速器”而不是“必须前置条件”。

**Independent Test**: 路线图能回答两个问题：1) 不引入 Vite/AOT，core-ng 还能通过哪些路线达成关键收益与达标门槛；2) 引入 Vite/AOT 的触发条件与失败/降级策略是什么。

**Acceptance Scenarios**:

1. **Given** 仅使用运行时层面的契约注入与整型化/零分配策略，**When** 推进 core-ng，**Then** 路线图给出可达成的里程碑与门槛，不要求先引入编译工具链。
2. **Given** 决定引入 AOT/编译工具链，**When** 对照路线图的触发条件与 guardrails，**Then** 能明确它必须另立 spec 且必须产出 Node+Browser 证据与可解释降级口径。

---

### User Story 4 - 046 作为 NG 路线“总控 spec”（调度其它 specs）(Priority: P1)

作为仓库维护者，我希望 046 不只是“里程碑一页纸”，而是 core-ng 路线的**总控/调度 spec**：集中列出未来 NG 相关 specs（含纯优化/语义改变/工具链/wasm 等），并明确每个 spec 的依赖、证据门禁与 kernel 支持矩阵要求，使并行推进不跑偏。

**Why this priority**: 你希望 046 成为分支点后的长期支点；如果没有“登记与调度”机制，NG 路线会再次退化为草案碎片与口头共识。

**Independent Test**: 只阅读 `specs/046-core-ng-roadmap/`，读者能在 10 分钟内回答：下一步要新建哪些 specs、它们之间的依赖顺序、哪些属于语义改变必须单独推进、以及每个 spec 的证据门禁是什么。

**Acceptance Scenarios**:

1. **Given** 有一个新想法（例如 AOT/wasm/flat store），**When** 对照 046 的 spec registry，**Then** 能明确它应落到哪个新 spec，并带上证据门禁与 kernel 支持矩阵约束。
2. **Given** 多条路线并行推进，**When** 只看 046 的 registry 状态，**Then** 能看出哪些是 P0/P1 必做、哪些是 idea/backlog，且不会把语义改变混入纯优化链路。
3. **Given** registry 发生变更，**When** 按 `specs/046-core-ng-roadmap/checklists/registry.md` 做人工验收，**Then** 能确认条目必填信息与 roadmap 一致性未退化（SC-005）。

### Edge Cases

- 如果 045 尚未实现完成：路线图如何定义“起跑线”（哪些里程碑不应启动）？
  - 裁决：M0 未达标前，只允许维护 046 的 roadmap/registry/清单与新建 specs；禁止宣称进入 M2/M3/M4 等“切换/试跑”里程碑。达标判定与执行入口以 `specs/046-core-ng-roadmap/checklists/m0-m1.md` 为准。
- 如果 039 因为实现风险或优先级被推迟：core-ng 的推进是否允许先行、但如何防止“默认路径回归”？
- 如果 core-ng 处于渐进替换阶段（trial-run/test/dev 混用）：如何避免被误当成“已可切默认”？
- 如果引入 build-time 工具链导致调试体验/可解释性退化：如何定义必须满足的最小可解释锚点与回退策略？
- 如果 NG 路线同时存在“纯优化/语义改变/工具链探索”：如何避免并行真相源与口径漂移？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 路线图 MUST 固化为 `specs/` 下的正式交付物，并以“里程碑 + 门槛 + 边界”的形式表达，使读者不依赖草案也能做决策。
- **FR-002**: 路线图 MUST 明确 045 的分支点作用：稳定 Kernel Contract，并定义“切换默认内核到 core-ng”的硬门槛（契约一致性验证 + 证据门禁 + 无 fallback/可解释）；其中 047 Full Cutover Gate 的 coverage matrix 必须以代码为单一事实源（`@logix/core` 导出，优先落点：`packages/logix-core/src/Kernel.ts`）。
- **FR-002 (clarified)**: 路线图 MUST 明确：从 M2（trial-run/test/dev 渐进替换）起，core-ng 必须是独立包 `@logix/core-ng`（`packages/logix-core-ng/`）；否则不得将其作为 core-ng 证据或用于宣称 Gate PASS。
- **FR-002 (clarified-2)**: 路线图 MUST 明确：047 Full Cutover Gate 的 coverage 必须全覆盖 Kernel Contract 当前所有可替换 `serviceId`；任何新增可替换 serviceId 必须同步纳入 coverage matrix（否则 Gate 语义失真）。
- **FR-002 (clarified-3)**: 路线图 MUST 明确：047 Gate FAIL 时必须输出 Slim、可序列化的失败证据锚点，至少包含 `kernelId + missingServiceIds + moduleId/instanceId/txnSeq`；完整 `runtimeServicesEvidence` 只允许在 diagnostics=light/full 下输出。
- **FR-003**: 路线图 MUST 给出 `specs/039-trait-converge-int-exec-evidence/` 的后续处置策略：它在“当前内核加固/NG 原则验证/core-ng 风险拦截”中的定位、以及何时可视为完成/冻结。
- **FR-004**: 路线图 MUST 回答工具链问题：core-ng 的进阶不以 Vite/AOT 为前置条件；若未来引入 AOT/编译工具链，必须明确触发条件、失败回退口径与证据门禁，并要求另立 feature spec 承载。
- **FR-005**: 路线图 MUST 明确哪些探索属于“语义改变/新口径”（例如 time-slicing、采样诊断）并指向独立 spec（避免混入纯优化链路）。
- **FR-006**: 路线图 MUST 明确“编译友好（AOT-ready）但不绑定工具链”的底层目标：底层契约与 IR 形态应允许未来把“构造期预编译”前移到构建阶段作为可选优化（视为同一套工件/证据的另一种生产方式），但不得让上层生态或默认运行路径被工具链绑死。
- **FR-007**: 046 MUST 作为 core-ng 路线的总控 spec：维护一个“spec registry（已存在/待新建）”，并对每个 NG 相关 spec 明确：类型（纯优化/语义改变/工具链等）、依赖关系、证据门禁（`$logix-perf-evidence`）、以及 kernel support matrix 要求。
- **FR-008**: 路线图 MUST 将“读状态（selector）协议化/车道化”纳入 NG 路线：允许用户继续写 `useSelector(..., (s) => ...)` / `fromState((s) => ...)` 语法糖，但必须定义 ReadQuery/SelectorSpec 与 `lane/deps/fallbackReason/strict` 的最小口径，并在 registry 中登记为后续交付（不把动态兜底当成黑盒默认）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 路线图 MUST 与宪章对齐：触及核心路径的演进必须以 `$logix-perf-evidence` 的 Node+Browser before/after/diff 作为证据门禁；perf evidence 允许在 dev 工作区采集（可为 git dirty），但必须确保 `matrix/config/env` 一致，并保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时 `profile=soak`）。
- **NFR-002**: 路线图 MUST 强制“统一最小 IR（Static IR + Dynamic Trace）+ 稳定锚点（instanceId/txnSeq/opSeq）”作为跨内核对照与迁移的唯一事实源，禁止并行真相源。
- **NFR-003**: 路线图 MUST 保持诊断心智模型稳定：`diagnostics=off` 近零成本；若引入新的观测口径必须另立 spec，并提供可解释字段与迁移说明。
- **NFR-004**: 若路线图推进过程中引入“编译友好”能力（例如可消费预编译工件），系统 MUST 保持默认路径不回归：未提供预编译工件时，运行时不得承担额外常驻分配/分支成本（仍以 `$logix-perf-evidence` 裁决）。
- **NFR-005**: 路线图 MUST 强制 “dynamic 回退可见且可拦截”：当 selector/ReadQuery 无法进入静态车道时，必须能在统一最小 IR/Devtools 中解释 `lane` 与 `fallbackReason`，并允许在 Strict Gate 下把回退升级为失败（避免静默把动态成本带入默认路径）。

### Key Entities _(include if feature involves data)_

- **Roadmap**: 在 `specs/` 下固化的长期路线图工件，描述里程碑、门槛、边界与依赖关系。
- **Milestone**: 可验收的阶段目标，具备明确达标门槛与退出条件。
- **Gate**: 切换/合入/宣称达标的硬门槛（契约一致性、性能证据、可诊断性口径）。
- **Kernel Contract**: 上层稳定依赖边界（045）。
- **Perf Evidence**: `$logix-perf-evidence` 输出的 before/after/diff（Node + ≥1 条 headless browser）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 路线图在 `specs/046-core-ng-roadmap/` 下可被独立阅读与使用：无 `[NEEDS CLARIFICATION]` 占位，且能清晰回答“045 之后做什么/为什么/到什么程度算达标”。
- **SC-002**: 路线图明确“切默认到 core-ng”的硬门槛，并将“trial-run/test/dev 渐进替换”与“宣称可切默认”严格区分（避免半成品态误判）。
- **SC-003**: 路线图明确 039 的定位与去向（继续推进/达标冻结/作为证据跑道复用），并写清它与 core-ng 的关系（避免漂移与重复投入）。
- **SC-004**: 路线图对工具链给出可执行裁决：不引入 Vite/AOT 也能推进 core-ng 的关键里程碑；引入 AOT 必须满足明确触发条件并另立 spec，且必须经 Node+Browser 证据门禁。
- **SC-005**: registry 工件存在且可用：关系 SSoT=`specs/046-core-ng-roadmap/spec-registry.json`（依赖/状态/成员）；人读阐述=`specs/046-core-ng-roadmap/spec-registry.md`（证据门禁与 kernel matrix 口径）；验收方式：人工 review（`specs/046-core-ng-roadmap/checklists/registry.md`）。
- **SC-006**: 路线图明确“读状态车道”策略：无插件仍可用（JIT 默认），dynamic 回退可观测且可在 Strict Gate 下失败；相应 spec 在 registry 中可被明确定位（避免口径只存在于草案/脑内）。
