# Research: Form Companion Formalization

## Decision 1

- Decision: `field(path).companion({ deps, lower })` 继续作为当前 no-better implementation baseline
- Rationale:
  - `155` 的 `AC3.3` 已把 owner split、slot inventory、carrier-neutral law 收口到这条 shape
  - 当前缺口在“未实现”，不在“需要再发明更大 authoring family”
  - 先把 baseline 落成代码，后续才有资格再谈 exact carrier reopen
- Alternatives considered:
  - `slot-explicit` 或 `method bag` carrier
  - 跳过 public authoring、只做 internal lowering

## Decision 2

- Decision: sanctioned read route 固定为 recipe-only `useModule + useSelector(handle, selectorFn)` proof；helper/public selector primitive 继续 reopen-gated
- Rationale:
  - `155` 已明确 canonical read route 继续只认 selector route
  - `157` 的最小目标是“canonical selector law 能承接 companion”，不是“再造一套 host API”
  - helper noun 一旦进入主线，就会同时放大 authority page、public surface 与 docs writeback
- Alternatives considered:
  - 新开 `useFieldCompanion(...)`
  - 公开新的 Form-owned selector primitive
  - 直接暴露 raw internal landing path 给用户代码

## Decision 3

- Decision: day-one slot 继续只认 `availability / candidates`，`field-only` scope 继续保持关闭外扩
- Rationale:
  - `155` 当前 promotion truth 就建立在这组 sealed slot law 与 `field-only` owner 上
  - 现有 row-heavy challenge 还没有给出必须重开 `list/root companion` 的 irreducible evidence
  - 正式实现阶段应优先验证 sufficiency，而不是提前扩大 scope
- Alternatives considered:
  - 同时实现 `list().companion`
  - 提前开放第三 slot

## Decision 4

- Decision: verification 以 runtime control plane 为主，package tests / browser evidence / examples 只作 supporting evidence 或 post-freeze alignment
- Rationale:
  - `09-verification-control-plane` 已把 `runtime.check / runtime.trial / runtime.compare` 定为第一版正式主干
  - companion 的 diagnostics、row-heavy 与 causal chain 需要一条单点 proof spine
  - examples 的角色是消费 frozen contract，不该先于 authority freeze
- Alternatives considered:
  - 只靠包内 targeted tests
  - 把 retained demo 直接升为主 closure gate
