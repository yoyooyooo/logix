---
title: Form Bridge And Receipt Residual Cut
status: consumed
owner: form-residual-cut
target-candidates:
  - docs/ssot/form/07-kernel-upgrade-opportunities.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
  - packages/logix-form/src/index.ts
  - packages/logix-form/package.json
last-updated: 2026-04-15
---

# Form Bridge And Receipt Residual Cut

## 目标

把 exact surface writeback 之后还剩的两条 residual 按不同证据门槛拆开收口：

1. `commands` 的 root authority closure
2. kernel grammar challenger 是否满足 strict dominance gate

## 角色

- 本页是 residual cut proposal，不是权威事实源
- 它只服务 exact surface writeback 后剩余的两个 reopen 面
- 这两个 reopen 面不再共享同一 success bar
- 一旦收口，回写面优先是：
  - [07-kernel-upgrade-opportunities.md](../ssot/form/07-kernel-upgrade-opportunities.md)
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)

## 当前基线

exact surface 已冻结到：

- `Form.make(..., { logic: ($) => { ... } })`
- `form.submit(options?)`
- `form.view()`
- `@logixjs/form/react` 只作为 host manifestation
- `Form.commands` 只剩 unnamed bridge residue

当前仍保留的 residual risk：

- `commands` 是否最终完全退出 root value surface
- grammar challenger 是否真的支配当前 07

## dual gate

### Gate A. `commands` root closure

这是 public surface 去歧义问题。
它只需要回答：

- root barrel 是否还导出 `commands`
- 12、13、runtime-06 三页是否只留一份 packaging authority 解释

它不应该被 grammar 证明链拖住。

### Gate B. grammar challenger gate

这是 07 reopen gate 问题。
它只需要回答：

- challenger 是否真的删掉了现有 assumption
- 是否压掉了当前 shared output law 或 public boundary
- 是否交付了更强的 evidence / proof

若答不出来，默认保持 07 现状，不进入 rename。

## current problem statement

### Gate A problem statement: `commands`

当前 root barrel 仍导出：

- `commands`

这和 exact surface 的现状有张力：

- exact user contract 已经不再把它当作 canonical user noun
- export manifest 仍把它记成 root drift

当前默认候选改成：

- `commands` 退出 root barrel
- `commands` 若仍需存在，只允许停在 module / handle residue 或 internal seam
- 若未来还能点名 surviving consumer，再 reopen 它是否应以 packaging exception 存活

### Gate B problem statement: kernel grammar

当前 SSoT 里的 kernel grammar 仍是：

- `participation-delta kernel`
- `settlement-task kernel`
- shared `canonical evidence envelope`

而 exact surface review 曾提出一条更小比较方向：

- `shape executor`
- `task executor`
- shared `receipt format`

当前默认候选改成：

- 不直接推进 rename
- 先要求 challenger 提交 strict dominance matrix
- 若无法明确删掉一条现有 assumption、压掉一条 public boundary、并保持 shared law 的单点 authority，默认关闭此 residual
- 就算 challenger 成立，grammar 命名也只在 07 裁决；03/08/runtime-06 只回链 07，不单独重复 triad

## Gate A success bar

- root barrel 不再导出 `commands`
- 12 与 13 对 `commands` 的口径一致
- runtime-06 只保留一处 bridge / residue 说明，不再与 12/13 并列重复
- `package.json` 不被误当成 symbol-level authority

## Gate B success bar

- challenger 若要成立，必须提交 strict dominance matrix
- matrix 必须显式覆盖：
  - 当前删掉哪条 assumption
  - 当前压掉哪条 public boundary 或 shared law 对象
  - 当前交付哪份更强 evidence / verification proof
- 若做不到，07 保持现状，并把 grammar residual 关闭

## preferred candidate

### C1. `commands` root-zero-bridge-noun

- `commands` 从 `@logixjs/form` root value surface 删除
- root barrel 不再导出 `commands`
- 12 不再把 `commands` 记成长期 drift 行
- 13 继续只写 `commands` out of exact surface，不再承担 packaging 例外的长期解释
- 若确有 surviving consumer，后续单独以 packaging exception reopen

### C2. grammar proof-first close

- 关闭“executor / receipt 命名 cut”这个 residual
- 继续以 07 的 `two primitives + shared output law` 作为唯一 grammar authority
- 只有当 challenger 满足 strict dominance matrix 时，才重新开启 grammar rename review

## 去向

- 2026-04-15 已消化到：
  - [07-kernel-upgrade-opportunities.md](../ssot/form/07-kernel-upgrade-opportunities.md)
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
