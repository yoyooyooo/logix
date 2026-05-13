# Form Spec Hub

> Stop Marker: 2026-04-22 起，本 checklist 停止作为 active members 派发视图使用。后续 Form API 主线转入 [../155-form-api-shape](../../155-form-api-shape/spec.md)，迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../../155-form-api-shape/proposal-149-154-carryover.md)。

**Group**: `specs/150-form-semantic-closure-group`
**Derived From**: `registry(member entries only; stopped route)`
**Stopped Members**: `specs/149-list-row-identity-public-projection`, `specs/151-form-active-set-cleanup`, `specs/154-form-resource-source-boundary`, `specs/152-form-settlement-contributor`, `specs/153-form-reason-projection`
**Created**: 2026-04-21

> 本文件是“派生执行索引”：只做 member 跳转与入口归纳，不复制成员实现细节，也不承接 stage truth。
> 这里的勾选只表示“派生入口与 registry 一致”，不表示 member 已完成实现。

## Stopped Members

- [x] `149-list-row-identity-public-projection` 当前入口固定为 `spec.md / plan.md / discussion.md / checklists/requirements.md`；registry status 为 `stopped`
- [x] `151-form-active-set-cleanup` 当前入口固定为 `spec.md / plan.md / discussion.md`；registry status 为 `stopped`
- [x] `154-form-resource-source-boundary` 当前入口固定为 `spec.md / plan.md / discussion.md`；registry status 为 `stopped`
- [x] `152-form-settlement-contributor` 当前入口固定为 `spec.md / plan.md / discussion.md`；registry status 为 `stopped`
- [x] `153-form-reason-projection` 当前入口固定为 `spec.md / plan.md / discussion.md`；registry status 为 `stopped`

## Notes

- `143 / 144 / 145` 属于 imported predecessors，不在此 checklist 跟踪。
- `02 / 06 / p0-next` 属于 external route entries，不在此 checklist 跟踪。
- 历史 stage truth 继续看 member 自己的 `spec.md / plan.md / discussion.md`；当前 Form API 主线改看 `155`。
- 若需要跨 spec 联合验收：优先用 `$speckit acceptance <member...>`（multi-spec mode）。
- 若需要查看成员 tasks 进度汇总：仅对存在 `tasks.md` 的成员使用 `extract-tasks.sh --json --feature ...`。
