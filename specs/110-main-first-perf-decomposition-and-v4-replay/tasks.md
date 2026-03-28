# Tasks: Main-first 性能控制线与 v4 replay 主路线

**Input**: Design documents from `/specs/110-main-first-perf-decomposition-and-v4-replay/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Master-Control Hardening

目标：先让 `110` 成为唯一总控事实源，再继续主线 perf 收口。

- [x] T001 新建 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md`
- [x] T002 新建 `specs/110-main-first-perf-decomposition-and-v4-replay/plan.md`
- [x] T003 新建 `specs/110-main-first-perf-decomposition-and-v4-replay/tasks.md`
- [x] T004 把 `110` 补成主控规格：增加 Current Progress Snapshot / Branch Ledger / Decision Record Format
- [x] T005 把 `110` 再补成可独立恢复现状：增加 Current Evidence Anchors / Route Exit Criteria / Update Protocol
- [x] T006 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 中统一主裁决词汇，拆开 `decision / evidenceTier / replayReadiness / fullStatus / residualCategory`
- [x] T007 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 中补齐 accepted / provisional / discarded ledger、Residual Pool Latest、Current Next Actions
- [x] T008 在 `specs/110-main-first-perf-decomposition-and-v4-replay/plan.md` 中写死 `cheap local -> focused local -> heavier local -> PR/CI last` promotion 协议
- [x] T009 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 与 `plan.md` 中补齐 `110 -> 111` handoff gate、禁止动作、必需输入工件

## Phase 2: Governance Artifacts

目标：让每条 cut、每个 residual、每次 promotion 都有唯一落点。

- [x] T101 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 中为 replay7 / replay8 / replay9 seed 首批 ledger 记录
- [x] T102 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 中定义 replay checklist 与 residual checklist 的最小门
- [x] T103 在 `specs/110-main-first-perf-decomposition-and-v4-replay/plan.md` 中声明 spec / plan / tasks 的 source-of-truth 分工
- [x] T104 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 与 `plan.md` 中建立 residual latest 与 current next actions 的维护协议
- [x] T105 在 `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md` 与 `plan.md` 中把 Current Evidence Anchors 收敛为 latest pointer / stable pointer 协议

## Phase 3: Cross-Spec Alignment

目标：让后续 `111` 与其他主线规格默认复用 `110`，不再各自解释路线。

- [x] T201 在 `specs/111-adaptive-auto-converge-controller/spec.md`、`plan.md`、`tasks.md` 中回写 `110` 作为总控与 `013` 作为契约 baseline
- [x] T202 在后续相关主线 spec / notes 中补对 `110/111` 的交叉引用
- [x] T203 把当前长期义务收敛成 maintenance protocol，避免主 tasks 永久不闭合

## Phase 4: Ongoing Maintenance

目标：后续每轮 perf 会话都沿用同一主控协议。

- [ ] T301 后续 accepted cut 先登记到 `110` ledger
- [ ] T302 每次当前最强候选变化时同步更新 `110` 的 latest ledger、residual latest、next actions
- [ ] T303 每次 fresh baseline 替换后同步更新 `110` 的 evidence anchors / stable pointer
- [ ] T304 每次 `111` 的进入门变化时同步更新 `110 -> 111` handoff contract
