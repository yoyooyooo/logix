# Feature Specification: Packages 对外子模块裁决与结构治理

**Feature Branch**: `[030-packages-public-submodules]`  
**Created**: 2025-12-24  
**Status**: Complete  
**Input**: User description: "希望所有子包的 src 根目录只承载对外子模块入口；子模块文件名用大写（PascalCase）并与核心概念同名/同前缀；非子模块实现下沉到 src/internal；同时对 packages/* 做一次全面梳理，抽取各包核心链路并裁决真正的对外子模块/概念。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 全仓对外子模块裁决清单（Priority: P1）

作为仓库维护者/领域包作者，我需要一份覆盖 `packages/*` 的“对外子模块/概念裁决清单”（单一事实源），用来回答：每个包究竟对外暴露哪些稳定概念、推荐如何 import、哪些内容必须视为内部实现不可依赖，从而避免 API 漂移与“内部泄漏”。

**Why this priority**: 没有统一裁决时，`package.json exports`、`src` 目录与文档/示例会各自演进，导致用户不知道“哪些是稳定入口”、新贡献者也无法安全重构。

**Independent Test**: 仅通过阅读该清单即可验收：能在不读实现细节的前提下，为任意一个包给出“对外概念列表 + 推荐 import 形态 + 内部边界说明”。

**Acceptance Scenarios**:

1. **Given** 仓库存在多个子包（`packages/*`），**When** 阅读裁决清单，**Then** 每个子包都有明确的对外概念/子模块列表（无 TBD/未覆盖）。
2. **Given** 任意一个核心概念名（例如“Runtime / Query Engine / Sandbox Client”），**When** 在清单中检索，**Then** 能定位到唯一的归属包与推荐 import 形态，并能区分“稳定入口”与“内部实现”。

---

### User Story 2 - 统一的结构与命名规则（Priority: P2）

作为贡献者，我希望有一套可执行的结构治理规则：哪些文件/目录可以出现在 `src` 根目录、什么才算“对外子模块”、命名如何与核心概念对齐、哪些例外被允许且必须显式登记。这样我在新增/重构时不会意外扩大 public surface。

**Why this priority**: 缺少结构规则时，`./*` 这类导出形态会把“临时 helper/回归 typecheck”等内容变成事实上的 public API，造成后续演进成本飙升。

**Independent Test**: 给出任意一个新增文件（例如 helper、回归 typecheck、薄适配层、UI hooks），评审能仅根据规则判断其归类（public submodule vs internal）与应落位置，并能指出是否需要登记例外。

**Acceptance Scenarios**:

1. **Given** 需要新增一个“非核心概念、仅为实现服务”的文件，**When** 按规则归类并放置，**Then** 该文件不会被视为对外子模块，且不会成为推荐 import 入口。
2. **Given** 需要新增一个“对外稳定概念”（子模块），**When** 按规则命名与放置，**Then** 子模块命名与概念对齐且可被清单收录，避免出现多个同义入口。

---

### User Story 3 - 可交接的重构路线图（Priority: P3）

作为维护者，我希望在裁决清单之外，还能拿到一份“从现状到目标结构”的分阶段路线图：每个包当前有哪些漂移点（哪些东西应成为子模块/应下沉 internal/应作为例外单独入口），以及推荐的迁移顺序与风险提示，便于后续按阶段推进而不迷失。

**Why this priority**: 仅有终态规则没有迁移路线，会导致重构时反复打断、不同人各做各的“局部修复”，最终仍无法收敛为单一事实源。

**Independent Test**: 路线图应能被另一位维护者接手执行：按包拆分、按阶段推进，并能清楚知道每一步要产出/验证什么。

**Acceptance Scenarios**:

1. **Given** 任意一个子包的当前目录结构与导出面，**When** 对照路线图，**Then** 能得到该包的漂移分类（A/B/C）与下一步行动建议（不依赖作者口头解释）。

---

### Edge Cases

- **多入口子路径**：存在额外入口（例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`）时，如何裁决它们是“子模块”还是“独立入口”，以及是否允许继续新增。
- **UI 适配层形态差异**：当包需要对外暴露组件/Hooks 等 UI 适配能力时，如何保持“概念子模块化”而不把实现目录误当 public surface。
- **回归/类型断言文件**：如仅用于编译期回归或内部校验的文件（例如 typecheck/fixtures），如何避免出现在 public surface。
- **历史通配导出**：当包使用 `./*` 通配导出时，如何在迁移期避免“临时文件变 public”。
- **内部上下文泄漏**：适配层可能为了实现方便把内部 Context/缓存等对象导出（例如 ReactContext/ModuleCache 等）；如何防止这些实现细节变成用户依赖的稳定入口。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 产出覆盖 `packages/*` 的《对外子模块/概念裁决清单》，并对每个子包给出：包定位、核心链路摘要、对外子模块列表、推荐 import 形态、内部边界说明与已知例外入口。
- **FR-002**: 系统 MUST 定义仓库级“public submodule 结构治理规则”：`src` 根目录只承载对外子模块入口；子模块命名使用 PascalCase 且与核心概念同名/同前缀；非子模块实现应下沉到 `src/internal/**`；任何例外必须显式登记并说明理由。
- **FR-003**: 系统 MUST 为每个子包提供“漂移报告（Gap Report）”，将现状分类为：A) 已对齐；B) 明显属于对外概念但当前不满足规则；C) 当前暴露在根目录但应视为 internal。
- **FR-004**: 系统 MUST 给出可执行的迁移路线图（按包×按阶段），包含：优先级、预期影响面、回归/验收方式与必要的迁移说明（允许 breaking，但必须可交接）。
- **FR-005**: 系统 MUST 定义一种可验证的质量门：能在实现阶段阻止“非子模块文件进入 src 根目录”以及“internal 路径被当作 public 入口依赖”的回归。
- **FR-006**: 系统 MUST 在裁决清单中对“易混淆/潜在泄漏”的入口做显式裁决与归类（public vs internal vs 独立入口），并给出理由与迁移影响说明；不得保留为灰区。
- **FR-007**: 系统 MUST 明确“适配层/工具层”的最小对外表面积：对外只暴露概念级入口（如 Provider/Hooks/Platform、Devtools UI、Sandbox Client/Protocol/Types 等），实现目录（如 `ui/**`、`state/**`、`worker/**`、`compiler/**`、`components/**`、`hooks/**`）不得直接成为推荐 import 入口，除非登记为例外。
- **FR-008**: 系统 MUST 规定子路径入口（subpath exports）的准入条件：只有当该入口代表一个稳定概念且具备独立价值时才允许存在；空壳/占位入口（无稳定契约、无可用能力）不得保留。

### Scope & Assumptions

- **In Scope**:
  - 覆盖 `packages/*` 下所有子包的对外子模块/概念裁决（含明确的例外入口）。
  - 产出可交接的规则与路线图，支撑后续按阶段收敛目录结构与 public surface（允许 breaking）。
  - 需要时同步更新仓库内的调用方（示例/文档/脚本）以对齐新的对外入口。
- **Out of Scope**:
  - 不新增新的运行时语义或新的业务能力；本特性只收敛结构与对外边界。
- **Assumptions**:
  - 本仓允许不向后兼容（以“收敛事实源/治理一致性”为优先）。
  - `package.json exports` 是对外边界的权威入口；`src/internal/**`（或等价内部目录）不得作为 public surface 暴露。
- **Dependencies**:
  - 需要对齐现有的结构/导出约束与规范文档，避免出现多个相互矛盾的“事实源”。
  - 需要同步校准仓库内的示例/文档/脚手架对各包的推荐 import 形态（以裁决清单为准）。

### Definitions

- **Public Submodule**：对外稳定概念的入口；命名需与核心概念对齐（PascalCase），并且在清单中有明确的职责边界与推荐 import 形态。
- **Independent Entry Point（子路径入口）**：例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`；它不是“随意拆分的目录”，而是一个需要被当作对外契约管理的稳定概念入口。
- **Internal Implementation**：为实现服务的文件/目录；可以自由重构，不得被当作 public surface 依赖（默认在 `src/internal/**`）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 若迁移涉及 Logix Runtime 核心路径（例如 `@logixjs/core`），系统 MUST 在实现前记录可复现的性能基线，并在实现后证明无可观测回归。
- **NFR-002**: 系统 MUST 保持可诊断性：对外概念的裁决应与 Devtools/诊断事件的解释链路一致，且在诊断关闭时保持近零额外开销。
- **NFR-003**: 系统 MUST 继续使用确定性标识（instanceId/txnSeq/opSeq 等）支撑可回放与可解释链路，不引入随机/时间默认作为标识来源。
- **NFR-004**: 系统 MUST 保持事务窗口边界：事务内禁止 IO/异步，禁止绕过事务边界的写逃逸口（实现期若触及相关代码，必须同步回归验证）。
- **NFR-005**: 若该治理导致用户心智模型变化（例如 import 形态或概念命名收口），项目 MUST 同步更新用户文档/示例以给出稳定词汇表（≤5 个关键词）与迁移说明。
- **NFR-006**: 若迁移涉及跨包协作协议或内部 hook，系统 MUST 将其收口为显式可注入契约（Runtime Services），并支持在不同实例/会话级别被替换与 mock。

### Key Entities *(include if feature involves data)*

- **Public Submodule Map**: 覆盖 `packages/*` 的对外子模块清单（按包列出稳定概念、推荐 import、边界与例外）。
- **Gap Report**: 描述“现状 vs 目标规则”的差异分类（A/B/C）与原因。
- **Exception Registry**: 对允许存在的额外入口/非典型结构做显式登记与解释（例如 `.../react`、`.../vite`）。
- **Migration Notes**: 分阶段迁移说明与风险提示（允许 breaking，但必须可交接）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `packages/*` 现存子包 100% 被纳入裁决清单（零遗漏）。
- **SC-002**: 每个子包的对外子模块列表“零歧义”：不存在同义重复入口、也不存在未裁决的灰区（零 TBD/占位符）。
- **SC-003**: 新贡献者在不阅读实现细节的情况下，可以用该清单在 5 分钟内回答：某概念属于哪个包、推荐如何 import、哪些路径禁止依赖。
- **SC-004**: 迁移路线图可交接：另一位维护者按路线图推进时，不需要额外口头补充即可开始执行与验收。
- **SC-005**: 若实现涉及 Runtime 核心路径，则性能基线与回归证据齐备，且无可观测退化。
