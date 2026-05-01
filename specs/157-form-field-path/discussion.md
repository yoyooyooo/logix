# Form Companion Formalization Discussion

**Purpose**: 只保留 `157` 当前仍未采纳的 reopen evidence。  
**Status**: Residual Reopen Only  
**Feature**: [spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md)

## Rules

- `spec.md` 继续持有 owner / boundary / closure gate
- `plan.md` 继续持有 adopted execution contract
- `tasks.md` 是唯一执行与 proof ledger
- 本文件不承接 implementation ledger、边界裁决或 pass/fail 结果
- 只有 reopen-gated 项目才保留在这里
- 某条 reopen 一旦关闭，必须回写到 `spec.md / plan.md / tasks.md`，再从本文件移除

## Residual Reopen Surfaces

- [ ] R004 nested row-owner chain beyond current `byRowId` primitive
  - 当前裁决：top-level row-owner sanctioned read story 已通过 `Form.Companion.byRowId(listPath, rowId, fieldPath)` 闭合
  - 当前未采纳对象：
    - nested parent-row aware companion selector primitive
    - second host family
  - reopen bar：
    - nested row-owner projection 无法在 canonical host gate 下闭合
    - 且 strict-dominance 证据表明需要比 current byRowId primitive 更强的 authority 对象
  - 触发后必须同步：
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `specs/157-form-field-path/spec.md`

## Closed In Current Freeze

- `field(path).companion({ deps, lower })` 继续作为 current no-better implementation baseline
- `field-only` owner scope 与 `availability / candidates` day-one slot law 不重开
- `157` 不自造新的 `W1..Wn` evidence 编号，只回链 `155` 的 `WF* / W*`
- examples 在 authority freeze 之后再对齐，不提前塑形 contract
- companion type-only public contract 已采纳：`SourceReceipt / AvailabilityFact / CandidateSet / CompanionBundle / CompanionLowerContext / CompanionDepsMap / CanonicalDepValue`
- `R001 companion read helper / selector primitive` 已关闭，采纳 `Form.Companion.field(path)`
- `R002 exact read carrier noun / exact ui landing path` 已关闭，当前 mainline 不再需要 reopen
- `R003 row-owner companion selector projection` 已关闭，采纳 `Form.Companion.byRowId(listPath, rowId, fieldPath)`
- `PF-08` startup-report exactness audit 已关闭，当前没有新增 `157` reopen；scenario carrier 继续留在 runtime verification lane
- `PF-04` rule-submit state evidence packet 已关闭，当前没有新增 `157` reopen；`SC-D` residual 只剩 `CAP-15` exact backlink
- `CAP-15` routing decision 已关闭，当前没有新增 `157` reopen；exact backlink 明确归 `VOB-01`
- `VOB-01` minimal packet 已关闭，当前没有新增 `157` reopen；剩余工作已进入 runtime-owned implementation probe
- `VOB-01` first feed contract 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到 runtime-owned producer wiring
- `VOB-01` runtime-owned producer helper 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到 real W5 extraction path
- `VOB-01` real W5 extraction probe 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到 staged narrowing with deferred bundlePatchRef
- `VOB-01` row-scoped narrowing probe 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到 Form-backed reasonSlotId extraction
- `VOB-01` Form-state reasonSlot probe 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到 runtime-owned bundlePatchRef extraction
- `VOB-01` bundlePatchRef blocker 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到 bundlePatchRef constructor/probe design
- `VOB-01` Form-artifact bundlePatchRef probe 已关闭，当前没有新增 `157` reopen；剩余工作已收窄到是否需要 promotion into reusable law

## Decision Backlinks

- `spec.md` `Context`
- `spec.md` `Scope`
- `spec.md` `Closure & Guardrails`
- `plan.md` `Classification Matrix`
- `plan.md` `Read Route Freeze`
- `plan.md` `Coverage Map`
