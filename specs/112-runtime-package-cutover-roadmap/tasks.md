# Tasks: Runtime Package Cutover Roadmap（总控调度型）

**Input**: `specs/112-runtime-package-cutover-roadmap/spec.md`, `plan.md`, `spec-registry.json`
**Note**: 本 tasks 只做调度、门禁、checklist 与状态回写，严禁复制 member 的实现任务。

## Phase 1: Setup（总控产物齐全）

- [x] T001 [US1] Maintain group registry SSoT in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/spec-registry.json`
- [x] T002 [US1] Maintain human-readable registry in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/spec-registry.md`
- [x] T003 [US1] Maintain group planning bundle in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/research.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/data-model.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/contracts/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/quickstart.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/tasks.md`
- [x] T004 [US1] Refresh group checklist in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/checklists/group.registry.md`

---

## Phase 2: Member Artifact Gates

- [x] T005 [US1] Verify `113` and `114` both have full planning artifacts before opening downstream execution using `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/tasks.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/tasks.md`
- [x] T006 [US2] Verify `115` has kernel boundary, support matrix, and reuse ledger before unlocking host/domain/CLI work using `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/tasks.md`
- [x] T007 [US2] Verify `116`, `117`, and `118` all have full planning artifacts before unlocking `119` using `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/tasks.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/tasks.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/tasks.md`

---

## Phase 3: Dispatch Order

- [x] T008 [US1] Route first-wave execution to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/113-docs-runtime-cutover/tasks.md`
- [x] T009 [US2] Route first-wave execution to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/114-package-reset-policy/tasks.md`
- [x] T010 [US2] Route second-wave execution to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/115-core-kernel-extraction/tasks.md`
- [x] T011 [P] [US2] Route parallel host execution to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/116-host-runtime-rebootstrap/tasks.md`
- [x] T012 [P] [US2] Route parallel domain execution to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/117-domain-package-rebootstrap/tasks.md`
- [x] T013 [P] [US2] Route parallel CLI execution to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/118-cli-rebootstrap/tasks.md`
- [x] T014 [US3] Route final examples/verification closure to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/119-examples-verification-alignment/tasks.md`

---

## Phase 4: Status And Writeback

- [x] T015 [US3] Keep member statuses aligned between `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/spec-registry.json` and member `spec.md` status lines
- [x] T016 [US3] Record milestone gate outcomes and evidence pointers in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/spec-registry.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/checklists/group.registry.md`
- [x] T017 [US3] Re-run group checklist refresh after member task changes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/112-runtime-package-cutover-roadmap/checklists/group.registry.md`
