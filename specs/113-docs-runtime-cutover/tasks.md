# Tasks: Docs Runtime Cutover

**Input**: Design documents from `/specs/113-docs-runtime-cutover/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: 以 `rg` 路由检查、职责术语检查、只读 `git status` 范围核对作为本特性的验证任务。
**Organization**: 按 user story 分组，先收紧治理与路由基础，再分别完成“真相源可达”和“结构与命名分离”。

## Phase 1: Setup (Execution Inputs)

**Purpose**: 建立本轮 docs 收口所需的审计台账与检查落点

- [x] T001 Create root routing audit ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/inventory/root-routing-audit.md`
- [x] T002 [P] Create runtime responsibility matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/inventory/runtime-page-responsibility.md`
- [x] T003 [P] Create promotion and naming boundary ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/inventory/promotion-and-naming.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先固定 docs 单一权威和承接车道，阻止后续页面继续漂移

- [x] T004 Normalize single-authority governance rules in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/docs-governance.md`
- [x] T005 [P] Align root README mesh in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/README.md`
- [x] T006 [P] Align subtree README guidance in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/README.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/README.md`
- [x] T007 Establish promotion lane bucket in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/2026-04-05-runtime-docs-followups.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/README.md`

**Checkpoint**: governance、根入口和 `docs/next` 承接桶已具备，后续页面可以按统一协议收口

---

## Phase 3: User Story 1 - 能快速找到真相源 (Priority: P1) 🎯 MVP

**Goal**: 让维护者从 docs 根入口稳定到达正确的 runtime / platform 事实源

**Independent Test**: 从 `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/README.md` 出发，能在 2 分钟内定位 governance、runtime 主链、platform 边界和 promotion lane

- [x] T008 [US1] Align proposal and promotion routing copy in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/docs-governance.md`
- [x] T009 [P] [US1] Refine runtime core page responsibilities in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/01-public-api-spine.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/02-hot-path-direction.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/03-canonical-authoring.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/05-logic-composition-and-override.md`
- [x] T010 [P] [US1] Sync core supporting references in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/logix-api-next-guardrails.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/effect-v4-baseline.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/2026-04-04-logix-api-next-charter.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- [x] T011 [US1] Run root-route and core-pack audits from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/quickstart.md` and record results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/inventory/root-routing-audit.md`

**Checkpoint**: 根入口、promotion lane、runtime core pack 已形成稳定真相源导航

---

## Phase 4: User Story 2 - 结构与命名分开管理 (Priority: P2)

**Goal**: 把结构结论固定在 SSoT / standards，把命名后置集中到单一桶

**Independent Test**: 阅读 runtime 06-09、platform 01-02 和 naming 延后桶时，能区分结构已定部分和命名后置部分

- [x] T012 [P] [US2] Refine form and scenario boundary pages in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/07-standardized-scenario-patterns.md`
- [x] T013 [P] [US2] Refine domain and verification boundary pages in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/09-verification-control-plane.md`
- [x] T014 [US2] Converge platform boundary and naming deferral in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/01-layered-map.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/02-anchor-profile-and-instantiation.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/logix-api-next-postponed-naming-items.md`
- [x] T015 [US2] Verify structure-vs-naming split and promotion sinks in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/inventory/runtime-page-responsibility.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/inventory/promotion-and-naming.md`

**Checkpoint**: 结构结论与命名后置桶已经解耦，reviewer 可独立判定页面职责

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 完成最终核对与 spec 侧回写

- [x] T016 [P] Refresh execution notes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/research.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/quickstart.md` if the final docs route changes
- [x] T017 Run final route, terminology, and scope checks from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/plan.md` against `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/*.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/*.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/*.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/*.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/*.md`

---

## Dependencies & Execution Order

- Setup 完成后，先做 Foundational。
- Foundational 完成后，US1 与 US2 可以分波次推进。
- `T009` 与 `T010` 可并行。
- `T012` 与 `T013` 可并行。
- 最终核对 `T017` 依赖全部目标文档落盘完成。

## Parallel Example

```bash
Task: "Refine runtime core page responsibilities in docs/ssot/runtime/01-public-api-spine.md ... 05-logic-composition-and-override.md"
Task: "Sync core supporting references in docs/standards/logix-api-next-guardrails.md docs/standards/effect-v4-baseline.md docs/adr/2026-04-04-logix-api-next-charter.md docs/adr/2026-04-05-ai-native-runtime-first-charter.md"
```

```bash
Task: "Refine form and scenario boundary pages in docs/ssot/runtime/06-form-field-kernel-boundary.md and docs/ssot/runtime/07-standardized-scenario-patterns.md"
Task: "Refine domain and verification boundary pages in docs/ssot/runtime/08-domain-packages.md and docs/ssot/runtime/09-verification-control-plane.md"
```

## Implementation Strategy

1. 先把 governance 和 README mesh 固定，避免后续正文继续漂移。
2. 先完成 US1，建立稳定可达的真相源入口。
3. 再完成 US2，收紧结构与命名边界。
4. 最后做统一核对和 spec 回写。
