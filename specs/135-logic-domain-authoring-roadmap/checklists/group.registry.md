# Logic Domain Authoring Convergence Group Checklist

**Group**: `specs/135-logic-domain-authoring-roadmap`
**Derived From**: `registry`
**Members**: `specs/122-runtime-public-authoring-convergence`, `specs/125-form-field-kernel-second-wave`, `specs/127-domain-packages-second-wave`, `specs/129-anchor-profile-static-governance`, `specs/136-declare-run-phase-contract`, `specs/137-form-logic-authoring-cutover`, `specs/138-query-logic-contract-cutover`, `specs/139-i18n-logic-contract-cutover`
**Created**: 2026-04-10

> 本文件是执行索引清单，只做跳转、gate 和收口状态，不复制成员 spec 的实现 tasks。

## Group Gates

- [x] 既有依赖 spec `122 / 125 / 127 / 129` 已纳入 registry
- [x] 新成员 spec `136` 到 `139` 已创建 `spec.md`
- [x] 新成员 spec `136` 到 `139` 已创建 `checklists/requirements.md`
- [x] 新成员 spec `136` 到 `139` 已创建 `plan.md / research.md / data-model.md / contracts/README.md / quickstart.md`
- [x] `135/spec-registry.json` 与 `135/spec-registry.md` 已建立 group SSoT
- [x] 新成员 spec `136` 到 `139` 已创建 `tasks.md`

## Existing Coverage Baseline

- [x] `122` 承接 canonical authoring baseline
- [x] `125` 承接 Form / field-kernel 第二波 baseline
- [x] `127` 承接 domain packages baseline
- [x] `129` 承接 naming governance baseline

## New Member Entry Points

- [x] `136` declare-run phase contract
  入口：`specs/136-declare-run-phase-contract/spec.md`
  任务：`specs/136-declare-run-phase-contract/tasks.md`
- [x] `137` form logic authoring cutover
  入口：`specs/137-form-logic-authoring-cutover/spec.md`
  任务：`specs/137-form-logic-authoring-cutover/tasks.md`
- [x] `138` query logic contract cutover
  入口：`specs/138-query-logic-contract-cutover/spec.md`
  任务：`specs/138-query-logic-contract-cutover/tasks.md`
- [x] `139` i18n logic contract cutover
  入口：`specs/139-i18n-logic-contract-cutover/spec.md`
  任务：`specs/139-i18n-logic-contract-cutover/tasks.md`

## Suggested Execution Order

- [x] 先推进 `136`
- [x] 再推进 `137`
- [x] 然后并行推进 `138 / 139`

## Notes

- `135` 只保留调度型 tasks；成员实现任务全部留在各自 `tasks.md`
- `spec-group-checklist.sh` 目前仍有 shell 语法错误，本清单为手工回退产物
