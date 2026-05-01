---
title: Form Field UI Projection Contract
status: consumed
owner: form-field-ui-projection
target-candidates:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/proposals/form-react-sugar-factory-api-candidate.md
last-updated: 2026-04-17
---

# Form Field UI Projection Contract

## 目标

冻结一个更小的结论：

- field-ui projection 当前先冻结 boundary，不冻结 exact leaf shape

这份 proposal 当前只回答：

1. field-ui 是否是合法 companion boundary
2. owner 如何闭合
3. 当前显式不冻结什么

## 已冻结前提

这份 proposal 只能建立在下面这些约束上：

1. Form canonical state truth 仍然只冻结 `ui: unknown`
2. host helper 当前拒绝 field-ui meta builder
3. field-ui 不能长成第二套 projection truth
4. example 与 reducer 现状不自动等于 public truth

## 当前 adopted candidate

当前采用一个单一候选：

1. field-ui 是合法的 companion boundary
2. 当前 authority 继续维持 `ui: unknown`
3. field-ui leaf truth 继续归 Form canonical state truth
4. 若未来存在 helper，它只能是 core-owned optional host helper 的 consumer，不能定义、补完或改写 leaf shape
5. 当前明确不冻结 exact leaf shape
6. 当前 `touched / dirty` 只算现有实现与 example 的观察值，不构成 exact public leaf

## 当前 boundary contract

### owner

当前 owner 写成双层闭合合同：

1. field-ui leaf truth 归 Form canonical state truth
2. 未来 projection helper 若出现，只能消费已冻结合同，不能反向定义 leaf semantics

### 当前不冻结

当前明确不冻结：

- ``ui.<path>``
- field leaf object 的存在方式
- `touched`
- `dirty`
- 任何 field-ui helper exact noun

### 当前显式负约束

当前明确禁止：

- 把 example-local `touched / dirty` 观察值写成 exact public leaf
- 让 core host helper 抢走 field-ui owner
- 让 optional helper 用 field-ui 推回第二套 projection truth

## 为什么收成这样

### 1. 不再保留活候选

这轮是 `zero-unresolved`。
所以不再保留：

- `freeze exact leaf shape`
- `keep fully unknown`

两条活正文。

### 2. 不再把 `touched / dirty` 放在正文中心

它们当前最多只能算：

- example proof
- reducer proof

还不够升成 public exact leaf。

### 3. 不再发明新 owner 术语

当前不再使用额外的新名词桶。
只依赖两处既有 authority：

- Form canonical state truth
- core host law

## evidence status

当前已有的只是实现与 example 证据：

- reducer 当前会写入某些 field-local ui bit
- example 当前会读到某些 `touched / dirty` 观察值

这些证据只能说明：

- field-ui 值得被视为一个 companion boundary

这些证据还不能说明：

- field-ui exact leaf shape 已经稳定

## sugar-factory 关系

当前 [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md) 里已经把 field-ui 视为 companion prerequisite。

这页若通过，意味着：

- sugar helper 继续不能消费 field-ui
- 直到这块单独 reopen 并通过

## 去向候选

若 converge 通过，回写面建议是：

- [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
- [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
- [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md)

## reopen gate

后续只有在同时满足下面条件时，才允许重开 exact leaf：

1. 有多 consumer 证据
2. 不是只靠 example-local 观察
3. helper 不新增 owner
4. leaf shape 比 `ui: unknown` 给出显著更强的 proof
5. 不会引入第二 projection truth

## 当前一句话结论

当前最小可证明的 field-ui 合同是：它先作为 Form canonical state truth 下的 companion boundary 被承认；exact leaf shape 继续后置，`touched / dirty` 只算现有实现与 example 的观察值。

## 去向

- 2026-04-17 已消化到：
  - [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
  - [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md)
