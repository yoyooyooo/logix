# Form Cutover Roadmap Group Checklist

**Group**: `specs/140-form-cutover-roadmap`
**Derived From**: `registry`
**Members**: `specs/141-runtime-control-plane-report-shell-cutover`, `specs/142-form-validation-bridge-cutover`, `specs/143-form-canonical-error-carrier-cutover`, `specs/144-form-settlement-submit-cutover`, `specs/145-form-active-shape-locality-cutover`, `specs/146-form-host-examples-dogfooding-cutover`
**Created**: 2026-04-16

> 本文件是执行索引清单，只做跳转、gate 和收口状态，不复制成员 spec 的实现 tasks。

## Group Gates

- [x] `140/spec-registry.json` 与 `140/spec-registry.md` 已建立 group SSoT
- [x] 总控 spec 已写死零兼容、面向未来、单轨实施
- [x] 总控 spec 已写死 member planning 的 5 张表要求
- [x] 总控 spec 已写死 `$writing-plans` 作为 detailed implementation plan 载体
- [x] 新成员 spec `141` 到 `146` 已创建 `spec.md`
- [x] 新成员 spec `141` 到 `146` 已创建 `checklists/requirements.md`
- [x] 新成员 spec `141` 到 `146` 已创建 `plan.md / research.md / quickstart.md`
- [x] 新成员 spec `141` 到 `146` 已建立薄 `tasks.md` 索引

## Authority Baseline

- [x] `docs/ssot/form/02-gap-map-and-target-direction.md`
- [x] `docs/ssot/form/03-kernel-form-host-split.md`
- [x] `docs/ssot/form/06-capability-scenario-api-support-map.md`
- [x] `docs/ssot/runtime/09-verification-control-plane.md`
- [x] 相关 consumed proposal 已压成 freeze note

## New Member Entry Points

- [x] `141` runtime control plane report shell cutover
  入口：`specs/141-runtime-control-plane-report-shell-cutover/spec.md`
- [x] `142` form validation bridge cutover
  入口：`specs/142-form-validation-bridge-cutover/spec.md`
- [x] `143` form canonical error carrier cutover
  入口：`specs/143-form-canonical-error-carrier-cutover/spec.md`
- [x] `144` form settlement and submit cutover
  入口：`specs/144-form-settlement-submit-cutover/spec.md`
- [x] `145` form active-shape and locality cutover
  入口：`specs/145-form-active-shape-locality-cutover/spec.md`
- [x] `146` form host/examples/dogfooding cutover
  入口：`specs/146-form-host-examples-dogfooding-cutover/spec.md`

## Suggested Execution Order

- [x] 先推进 `141`
- [x] 再推进 `142`
- [x] 再推进 `143`
- [x] 然后推进 `144 / 145`
- [x] 最后推进 `146`

## Notes

- `140` 只保留调度、路由、gate 与 registry，不复制 member 的 detailed implementation steps
- `tasks.md` 在这类 cutover 工作里只保留薄索引与状态面
- `spec-group-checklist.sh` 当前仍有 shell 语法错误，本清单为手工回退产物
