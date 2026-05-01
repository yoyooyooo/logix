# Feature Specification: Core Spine Aggressive Cutover

**Feature Branch**: `133-core-spine-aggressive-cutover`
**Created**: 2026-04-09
**Status**: Planned
**Input**: User description: "把 core 的 authoring / assembly / verification 主脊柱一口气做透，允许推翻现有 docs 细节，只保留更小公式：Module 只负责定义，Program 负责复用与组合，Runtime 负责运行；公开面删除 implement 和其它 carry-over 入口。"

## Context

`130-runtime-final-cutover` 与 `132-verification-proof-kernel` 已把 runtime final cutover 与 verification proof-kernel 的大方向推到位，但当前仓内仍有一组会反复制造残留的结构性问题：

- docs 已经表达出 `Module / Logic / Program / Runtime` 主链，代码公开面却仍保留 `Module.implement(...)`、顶层 `imports`、`TrialRun*` 等 carry-over 入口
- `Program` 已被定义成装配期对象，但 imports 仍要求写 `.impl`，导致装配对象本身没有完全闭合
- `Logic` 的 SSoT 与真实代码签名仍不一致，作者面还没有收成单一公式
- 业务概念到 `Module / Logic / Program / Runtime` 的映射仍缺少统一、易消化的 SSoT 说明，导致 CRUD、页面级组合、domain kit 等场景容易再次回到 module-first 或“一个页面一个大模块”的旧心智

这份 spec 的目标，是做一轮更激进的主脊柱收口。判断标准不再是“是否与今天的 docs 完全一致”，而是“能否把公开公式压到更小、更稳定、更少分叉”。若现有 docs 的某些细节比最终公式更大、更绕或更容易误导，本轮允许直接推翻并改写。

## Scope

### In Scope

- `packages/logix-core/**` 中与 authoring、assembly、verification 主脊柱直接相关的公开面与壳层
- `packages/logix-react/**` 中与 `Module / Program` host projection 直接相关的 public mental model
- `examples/logix/**` 与 `packages/logix-react/README.md` 里的 canonical authoring / imports / CRUD-like 场景样例
- `docs/ssot/runtime/**`、`docs/adr/**`、`docs/standards/**` 中与主脊柱公式、业务映射、control plane 命名相关的事实源
- root barrel 与 expert surface 的最终定性

### Out of Scope

- 不新增新的 runtime 能力或 control plane 能力
- 不展开 `compare` 的第二波设计
- 不对 `FieldKernel / Process / Workflow` 做与主脊柱无关的语义重写
- 不在本轮扩写新的 domain package 产品能力，只处理它们的主输出形态与心智映射

## Assumptions & Dependencies

- 当前仓允许 docs 领先代码，也允许为了更优公式直接重写 docs
- forward-only 仍然成立，不保留兼容层、不保留弃用期
- `Program` 继续作为装配期对象，但其公开输入面允许进一步纯化
- `Module` 允许做定义期复用与组合，但不再承接 Program 式运行装配语义
- 任何业务映射文档必须回写到 SSoT，而不只是停留在对话结论里

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-8, KF-9

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者看到唯一且更小的主公式 (Priority: P1)

作为维护者，我需要看到一组没有双入口、没有双相位、没有 carry-over 影子的主公式，这样我才能继续推进 core，而不会每次都被历史壳层拖回去。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: 只要主公式没有收干净，后续任何重构和 feature 都会继续在旧入口与新入口之间摇摆。

**Independent Test**: reviewer 可以在 5 分钟内说明 `Module / Logic / Program / Runtime` 各自的职责，不需要引用 `.implement`、顶层 `imports`、`.impl` 或 `TrialRun*` 旧名词。

**Acceptance Scenarios**:

1. **Given** reviewer 审一个新的 authoring 方案， **When** 对照本 spec， **Then** 它只能落在 `Module / Logic / Program / Runtime` 四个对象中的一个明确边界内，不允许新开并列入口。
2. **Given** 维护者从 `Program.make(...)` 出发追踪 imports， **When** 对照本 spec， **Then** 它看到的公开组合对象是 `Program` 本身，而不是 `.impl` 这种内部蓝图。

---

### User Story 2 - 业务作者能把业务概念稳定映射到主链 (Priority: P2)

作为业务作者，我需要一份容易消化的 SSoT 映射，知道页面、列表、表单、详情、批量操作、页级协调分别该落在 `Module / Logic / Program / Runtime` 的哪一层。

**Traceability**: NS-4, NS-8, KF-9

**Why this priority**: 如果业务映射不稳定，domain kit、CRUD 页面和 examples 很容易重新长回 module-first 或巨型页面模块。

**Independent Test**: 给定一个 CRUD 管理页，作者能在 5 分钟内画出 `List / Editor / Detail / BulkAction / PageCoordinator` 这些业务单元各自对应的 `Module / Logic / Program` 位置。

**Acceptance Scenarios**:

1. **Given** 一个典型 CRUD 管理页， **When** 作者查阅本 spec 和 SSoT， **Then** 能直接把列表、编辑器、详情、批量操作和页级协调映射成一棵 program tree，而不是默认写成单页面单模块。
2. **Given** 一个新的 domain kit 设计提案， **When** reviewer 对照本 spec， **Then** 能明确判断它应该是 definition-time 复用、program-first kit，还是 service-first 能力。

---

### User Story 3 - reviewer 能拒绝 `Module` 与 `Program` 边界回流 (Priority: P3)

作为 reviewer，我需要一套足够硬的边界规则，能拒绝任何把 `Module` 再次做成半可运行对象、或把 `Program` 再次做成不完整中间物的提议。

**Traceability**: NS-8, NS-10, KF-8, KF-9

**Why this priority**: 一旦 `Module` 与 `Program` 的边界再次混浊，主脊柱就会重新长出双公式和双心智。

**Independent Test**: reviewer 能在 5 分钟内判断一个新 API 是 definition-time 组合、assembly-time 组合还是 runtime control plane；如果不是三者之一，就直接判出界。

**Acceptance Scenarios**:

1. **Given** 一个提议让 `capabilities.imports` 同时接受 `Module` 和 `Program`， **When** reviewer 对照本 spec， **Then** 该提议会被直接拒绝，因为这会重新长出第二套组合规则。
2. **Given** 一个提议让 `Module` 拥有类似 `Program` 的 imports / runtime composition 能力， **When** reviewer 对照本 spec， **Then** 该提议会被直接拒绝，因为 `Module` 只允许定义期组合。

### Edge Cases

- 某个 helper 如果只是定义期生成或复用 `Module`，允许存在，但不得偷偷引入 runtime assembly 语义
- 某个 imports entry 若仍需要进入 runtime tree，公开面只能接受 `Program`；`internal ProgramRuntimeBlueprint` 只允许停在内部归一化层
- 某个旧例子或测试如果仍依赖 `.implement(...)`、`.impl` 或顶层 `imports`，本轮必须一起迁移或明确降到历史/内部区域
- 若 root barrel 的 expert exports 迁移超出本轮可控范围，可以拆 follow-up，但必须先把 allowlist、owner 和退出条件写死
- 若 `Logic` 结构化分区无法在本轮彻底落地，至少也必须先把公开签名、id 约束和内部 owner 收口成单一公式，不能继续维持双写法

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-8, NS-10, KF-8) 系统 MUST 把公开主脊柱固定为 `Module / Logic / Program / Runtime` 四个对象，且每个对象只承接一个明确阶段：定义、行为、装配、运行。
- **FR-002**: (NS-8, KF-8) `Module.logic` MUST 收口成单一公开公式 `Module.logic(id, build)`；公开面不得继续保留 build-only 旧签名。
- **FR-003**: (NS-8, KF-8) `Program.make(...)` MUST 是唯一公开装配入口；公开面不得继续保留 `Module.implement(...)`、`AnyModule`、`ModuleDef` 等 legacy authoring 入口或别名。
- **FR-004**: (NS-8, KF-8) `Program.capabilities.imports` MUST 在公开面只接受 `Program`，不得同时接受 `Module`，也不得要求用户显式写 `.impl`。
- **FR-005**: (NS-8, KF-9) `Module` MAY 做定义期复用与组合，但 MUST NOT 再拥有 Program 式的 imports、runtime tree、service wiring 或实例装配语义。
- **FR-006**: (NS-4, NS-8, KF-9) 系统 MUST 在 SSoT 中写清业务概念映射：页面级业务单元如何映射到 `Module / Logic / Program / Runtime`，并包含至少一个 CRUD 管理页的可直接消化的示例。
- **FR-007**: (NS-8, NS-10) `Runtime` 公开 control plane 命名 MUST 只保留 `trial`，不再通过 `TrialRun*` 旧命名泄露历史心智。
- **FR-008**: (NS-8, KF-8) root barrel MUST 建立显式 allowlist；任何不在 allowlist 中的 expert surface 都必须迁到更窄的 subpath import，或显式写入 allowlist ledger。
- **FR-009**: (NS-4, KF-9) docs、examples、README、tests 与 public exports MUST 在同一波 cutover 内交叉回写，不能只改 docs 或只改代码。
- **FR-010**: (NS-8, KF-8) examples 与 README 中 canonical imports 写法 MUST 统一为 `capabilities.imports: [ChildProgram]`，不得继续使用顶层 `imports` 或 `.impl` 作为主写法。
- **FR-011**: (NS-8, KF-9) `@logixjs/domain`、`@logixjs/query`、CRUD kit 等领域化输出 MUST 与本 spec 对齐为 `program-first` 或 `service-first`，不得重新长出 module-first 主叙事。
- **FR-012**: (NS-4, NS-8) 本轮 MUST 明确定义“页面、列表、编辑器、详情、批量操作、页级协调”这些常见业务单元分别推荐映射到哪一层，并把该映射写进 SSoT。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) 若本轮改动触及 runtime core 或 steady-state 行为边界，系统 MUST 提供可比 baseline / diff 证据，禁止无证据声称性能改善。
- **NFR-002**: (NS-10, KF-8) 本轮收口 MUST 不新增第二套 runtime、第二套 diagnostics truth source、第二套 verification truth source。
- **NFR-003**: (NS-10) diagnostics=off 时的默认 steady-state 心智与成本模型 MUST 保持一致，不因主脊柱收口重新变得更难解释。
- **NFR-004**: (NS-8, KF-9) 所有 breaking surface 继续遵守 forward-only 规则：必须有迁移说明，不保留兼容层与弃用期。
- **NFR-005**: (NS-8, KF-9) `Module.ts`、`Program.ts`、`Runtime.ts`、`index.ts` 若继续膨胀，系统 MUST 优先通过下沉到 `src/internal/authoring/**` 或其它互斥子模块来保持边界清晰。

### Key Entities _(include if feature involves data)_

- **Module Definition**: 定义期业务单元，承接 state、actions、默认 reducers、定义期 pattern 组合。
- **Logic Unit**: 具名行为规则，绑定到单个 `Module`，表达事件响应、副作用和协调逻辑。
- **Program Assembly**: 已装配、可复用、可组合的业务实例单元，承接 `initial / capabilities / logics`。
- **Runtime Tree**: 运行容器与治理边界，承接实例、生命周期与 control plane。
- **Domain Program Kit**: 领域层对外输出的 program-first kit，用于 CRUD、query、form 等高复用业务模式。
- **Business Mapping Example**: 用于把 CRUD 管理页这类业务结构稳定映射到主脊柱的标准示例。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-8, KF-8) 在 `packages/logix-core packages/logix-react examples/logix docs/{adr,ssot,standards}` 范围内，对 `Module.implement`、`ChildProgram.impl`、顶层 `imports` canonical 写法、build-only `Module.logic(($)`、公开 `TrialRun` 命名执行约定扫描后，canonical 区域命中数为 0。
- **SC-002**: (NS-8, NS-10) reviewer 能在 5 分钟内从 public API 解释 `Module / Logic / Program / Runtime` 的阶段边界，不需要额外引用历史注释或内部蓝图概念。
- **SC-003**: (NS-4, KF-9) SSoT 中存在明确的业务概念映射与 CRUD 管理页示例，作者能据此把一个典型 CRUD 页拆成 program tree。
- **SC-004**: (NS-8, KF-8) `Program.capabilities.imports` 的 dts 合同与运行时合同都证明公开 imports 只接 `Program`，且无需用户写 `.impl`。
- **SC-005**: (NS-8, KF-8) repo 内所有仍依赖公开 `.implement(...)` 的代码调用点都被迁移或降级到内部/历史区域。
- **SC-006**: (NS-8, NS-10) `Runtime` 公开 contract 只保留 `trial` 命名；旧 `TrialRun*` 名称不再出现在当前事实源、README、examples 或公开 type 中。
- **SC-007**: (NS-8, KF-8) root barrel 的 allowlist 与 direct consumer 迁移完成后，不再存在“默认 root export 误导用户进入 expert path”的未解释项。
- **SC-008**: (NS-10, KF-8) 若本轮命中 runtime core 行为路径，`pnpm check:effect-v4-matrix`、`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` 全部通过，且没有未解释性能回退。

## Clarifications

### Session 2026-04-09

- Q: `capabilities.imports` 后续是只传 `Program`，还是也可以 `Module`？ → A: 只传 `Program`。`Module` 只承接定义期语义，不进入 imports 装配面。
- Q: `Module` 之间是否可以有类似 `Program` 的组合方式？ → A: 可以有定义期复用与组合，不允许 Program 式 runtime 装配组合。
- Q: 业务作者如何理解这些概念？ → A: SSoT 必须补一份业务映射，至少覆盖 CRUD 管理页的 `List / Editor / Detail / BulkAction / PageCoordinator` program tree 示例。
- Q: `tasks.md` 是否继续使用 speckit 默认 checklist 模板？ → A: 否。本 spec 的 `tasks.md` 直接采用详细 implementation plan 结构，作为默认执行入口。
