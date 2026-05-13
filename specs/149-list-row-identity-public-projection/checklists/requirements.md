# Specification Quality Checklist: List Row Identity Public Projection Contract

> Stop Marker: 2026-04-22 起，本 checklist 停止作为推进门禁使用。后续 Form API 主线转入 [../155-form-api-shape](../../155-form-api-shape/spec.md)，迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../../155-form-api-shape/proposal-149-154-carryover.md)。

**Purpose**: Validate proof-closure completeness before any landing work
**Created**: 2026-04-18
**Feature**: [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/149-list-row-identity-public-projection/spec.md)

## Contract Gates

- [x] Single-authority proof closure is held by `spec.md`
- [x] Proof selection dominance is explicit, including `row identity > field-ui`
- [x] Projection legality clearly separates lawful proof, residue fallback, and proof failure
- [x] Required proof set is explicit

## Scope Gates

- [x] Exact noun is deferred
- [x] Import shape is deferred
- [x] Full `useFormList` helper family is deferred
- [x] Field-ui reopen is out of scope

## Notes

- 当前 spec 只冻结 dominance basis、row roster projection theorem、projection legality、required proof set 与 non-goals。
- 当前 spec 不把 queue 排序写成 FR/SC authority；“当前下一条 proof route”继续由 gap map 与 ledger 维护。
