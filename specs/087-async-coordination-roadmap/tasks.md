# Tasks: 087 Async Coordination Roadmap（总控调度型）

**Input**: `specs/087-async-coordination-roadmap/spec.md`, `specs/087-async-coordination-roadmap/plan.md`  
**Note**: 本 tasks 仅做“调度/索引/门槛回写”，严禁复制 member 的实现任务；实现请进入 member 的 `tasks.md`。

## Phase 1: Setup（总控产物齐全）

- [x] T001 [US1] 产出 group registry SSoT：`specs/087-async-coordination-roadmap/spec-registry.json`
- [x] T002 [US1] 产出 registry 人读阐述：`specs/087-async-coordination-roadmap/spec-registry.md`
- [x] T003 [US1] 产出本 spec 的 `plan.md/research.md/quickstart.md/tasks.md` 与 `checklists/requirements.md`

---

## Phase 2: Member 产物齐全门槛（实施前）

- [x] T004 [US2] 校验 088–092 均具备 `spec.md/plan.md/tasks.md/research.md/data-model.md/contracts/README.md/quickstart.md/checklists/requirements.md`（其中 `data-model.md`/`contracts/*` 允许 N/A，但必须有原因与替代门槛）（否则禁止进入 implementing）

---

## Phase 3: 执行顺序（建议）

- [ ] T010 [US1] 按 M0/M1/M2 顺序推进：先做 088（foundation）`specs/088-async-action-coordinator/tasks.md`
- [ ] T011 [P] [US1] 并行推进 089（optimistic）`specs/089-optimistic-protocol/tasks.md`
- [ ] T012 [P] [US1] 并行推进 090（resource/suspense）`specs/090-suspense-resource-query/tasks.md`
- [ ] T013 [P] [US1] 并行推进 091（busy policy）`specs/091-busy-indicator-policy/tasks.md`
- [ ] T014 [US1] 最后推进 092（E2E trace）`specs/092-e2e-latency-trace/tasks.md`

---

## Phase 4: Group Checklist & Review 例行维护

- [ ] T020 [US3] 变更 `spec-registry.json` 后刷新 group checklist：`specs/087-async-coordination-roadmap/checklists/group.registry.md`
- [ ] T021 [US2] 每个 member spec 达标后更新其 `status`（json SSoT），并在必要时补充 md 的阐述（不得新增关系信息）
