# Feature Specification: Docs Full Coverage Roadmap

**Feature Branch**: `120-docs-full-coverage-roadmap`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "把 docs 主体规划拆解为对应的 spec 需求，并完整覆盖 docs/README、adr、standards、ssot、next、proposals README，排除 archive/assets/superpowers。"

## Context

当前 `docs/` 新树已经把下一阶段目标写成了默认口径，但 specs 侧只有一部分被显式拆成可执行路线。

已有的 `103 / 113 / 115 / 116 / 117 / 118 / 119` 解决了 Effect V4、docs cutover 第一波、runtime package cutover 第一波、host/domain/CLI/examples 第一波收口；整套 docs 仍然缺一份“从 docs 页面反查 spec owner”的总控入口，也缺几组第二波 spec 来承接 platform、authoring、verification、form 和 host scenario 的剩余目标。

这份总控 spec 的职责，是把 docs 主体页面全部映射到现有 spec 或新 spec，让后续所有实现和回写都能从一个入口路由。

## Scope

### In Scope

- 为以下 docs 页面建立完整 spec 覆盖映射：
  - `docs/README.md`
  - `docs/adr/**`
  - `docs/standards/**`
  - `docs/ssot/**`
  - `docs/next/**`
  - `docs/proposals/README.md`
- 复用已有 spec：`103 / 113 / 115 / 116 / 117 / 118 / 119`
- 创建新成员 spec：`121` 到 `129`
- 为每个 docs 页面指定 primary owner spec，并给出相关依赖 spec
- 维护 group registry，避免 docs 规划出现未归属页面

### Out of Scope

- 不在本 spec 内直接改 runtime、React、sandbox 或 CLI 代码
- 不覆盖 `docs/archive/**`
- 不覆盖 `docs/assets/**`
- 不覆盖 `docs/superpowers/**`
- 不复制成员 spec 的实现任务

## Existing And New Members

### Existing Dependency Specs

- `103-effect-v4-forward-cutover`
- `113-docs-runtime-cutover`
- `115-core-kernel-extraction`
- `116-host-runtime-rebootstrap`
- `117-domain-package-rebootstrap`
- `118-cli-rebootstrap`
- `119-examples-verification-alignment`

### New Member Specs

- `121-docs-foundation-governance-convergence`
- `122-runtime-public-authoring-convergence`
- `123-runtime-kernel-hotpath-convergence`
- `124-runtime-control-plane-verification-convergence`
- `125-form-field-kernel-second-wave`
- `126-host-scenario-patterns-convergence`
- `127-domain-packages-second-wave`
- `128-platform-layered-map-convergence`
- `129-anchor-profile-static-governance`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 从任意 docs 页面反查 owner spec (Priority: P1)

作为维护者，我希望从任意一个 active docs 页面直接找到它对应的 spec owner，知道它已被哪个 spec 承接，哪些页面还需要第二波 spec 收口。

**Why this priority**: docs 已经成为下一阶段默认口径。若页面没有 owner spec，后续实现会持续失去落点。

**Independent Test**: 打开 `120/spec-registry.md`，对照纳入范围内的每个 docs 页面，都能在 3 分钟内找到 primary owner spec 和相关依赖 spec。

**Acceptance Scenarios**:

1. **Given** 我从 `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` 开始，**When** 我查询 `120` 的 registry，**Then** 我能定位到 `124` 作为 primary owner，并看到 `118/119` 作为已存在依赖。
2. **Given** 我从 `docs/standards/effect-v4-baseline.md` 开始，**When** 我查询 `120` 的 registry，**Then** 我能定位到 `103` 作为已存在 owner spec，而不需要新建重复 spec。

---

### User Story 2 - 区分“已有覆盖”和“新增拆分” (Priority: P2)

作为 spec 规划者，我希望明确哪些 docs 目标已经有 spec 在承接，哪些只是写在 docs 里、还缺对应 spec。

**Why this priority**: 若不先区分覆盖状态，就会重复开 spec，或者误以为 docs 口径已经有执行入口。

**Independent Test**: 查看 `120/spec-registry.json` 与 `120/spec-registry.md`，能区分 done 依赖 spec 与 draft 新 spec，并能看出依赖顺序。

**Acceptance Scenarios**:

1. **Given** 某个 docs 页面已有第一波 spec，**When** 我查看 `120` registry，**Then** 我能看到它被标记为 existing dependency coverage。
2. **Given** 某个 docs 页面还缺第二波实现 spec，**When** 我查看 `120` registry，**Then** 我能看到它被分配到新的 member spec。

---

### User Story 3 - 以后新增 docs 页面时，不再出现无主状态 (Priority: P3)

作为 reviewer，我希望后续 docs 页面新增或重组时，能够立刻判断是否需要补 spec owner，防止 docs 与 specs 再次分叉。

**Why this priority**: 这轮拆解的价值，在于把 docs 变成能稳定驱动 spec 的入口，而不是一次性整理。

**Independent Test**: 根据 `120` 的 requirements，可以明确判断“新增页面必须回写 registry”，并知道如何为其选择 existing 或 new owner spec。

**Acceptance Scenarios**:

1. **Given** 新增一个 active docs 页面，**When** 我按 `120` 的流程检查，**Then** 我知道必须先为它分配 primary owner spec，才能继续扩写。

### Edge Cases

- 某个 docs 页面是 cross-cutting charter 或 guardrail，可能同时影响多个成员 spec；此时必须记录 primary owner 与 related owners，禁止写成“人人都负责”。
- 某个 docs 页面已被 existing spec 部分覆盖，但 docs 目标已经超出第一波实现范围；此时必须拆成“existing dependency + second-wave owner”。
- 某个 docs 页面主要承担路由或治理职责，不直接对应代码模块；此时仍需有 spec owner，不能因为“没有代码目录”而悬空。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为纳入范围内的每个 active docs 页面建立 primary owner spec 映射。
- **FR-002**: 系统 MUST 复用已有的 `103 / 113 / 115 / 116 / 117 / 118 / 119`，并明确它们在 docs 覆盖中的角色。
- **FR-003**: 系统 MUST 新建 `121` 到 `129` 作为第二波 member specs，承接 docs 中尚未被显式规格化的目标。
- **FR-004**: 系统 MUST 在 `120` 下维护 `spec-registry.json` 与 `spec-registry.md`，作为 docs coverage 的 group SSoT。
- **FR-005**: 系统 MUST 在人读 registry 中提供 docs page coverage matrix，明确页面、primary owner spec、related specs 与 coverage note。
- **FR-006**: 系统 MUST 为每个新成员 spec 指定互斥 primary docs cluster，减少语义重叠。
- **FR-007**: 系统 MUST 规定后续 docs 页面新增、重命名或合并时的 owner spec 回写要求。

### Key Entities _(include if feature involves data)_

- **Docs Coverage Record**: 记录 docs 页面路径、primary owner spec、related specs、coverage note 与当前状态。
- **Spec Group Entry**: 记录 group member 的 spec id、目录、状态、依赖和职责范围。

### Non-Functional Requirements (Governance & Coverage)

- **NFR-001**: `120` 只承接 coverage routing、依赖顺序与 group governance，不复制 member 的实现 tasks。
- **NFR-002**: docs coverage mapping 必须达到全量覆盖，不能保留“待以后再看”的无主页面。
- **NFR-003**: cross-cutting charter 和 standards 条目必须有明确的主协调 spec，避免多头解释。
- **NFR-004**: 任何新 member spec 的范围都必须能用 docs 页面边界解释，避免凭目录名随意拆分。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 纳入范围内的 active docs 页面 100% 出现在 `120/spec-registry.md` 的 coverage matrix 中。
- **SC-002**: 任意维护者可以在 3 分钟内从 docs 页面定位到 primary owner spec。
- **SC-003**: 新增 `121` 到 `129` 后，docs 主体规划不存在未被 spec 显式承接的主题空洞。
- **SC-004**: 后续若 docs 页面发生变化，只需更新 `120` registry 与对应 owner spec，就能维持单一真相源。
