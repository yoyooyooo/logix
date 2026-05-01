---
title: Form React Sugar Factory Boundary
status: consumed
owner: form-react-sugar-factory
target-candidates:
  - docs/ssot/form/05-public-api-families.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-17
---

# Form React Sugar Factory Boundary

## 目标

冻结一个最小裁决：

- 既然业务侧大概率会自己封装 `useFormField` 一类 sugar，官方是否允许提供可复用的 factory sugar

本页只裁决边界、owner 和 reopen gate。
本页不冻结具体实现，也不冻结 exact noun。

## 当前 adopted candidate

当前采用一个更小候选：

1. 允许官方提供 optional host sugar factory
2. owner 只认 core-owned optional helper layer
3. `@logixjs/form` 只允许输出 domain primitive，不承接 React sugar factory
4. 当前 scope 只承认 field/meta sugar
5. list sugar 明确移出本轮 scope，等待单独 reopen
6. authority 文本只允许 hook-free split builders，不允许官方稳定 `useX` family

## 当前问题定义

需要承认两个现实：

1. 用户侧会自己封装第二层 sugar
2. 框架级双 authority 依然必须避免

所以真正的问题是：

- 官方是否沉淀一层可复用能力
- 这层能力放在哪个 owner 下
- 它怎样存在，才不会重新长出第二套 host truth

## 当前基线

这份 proposal 只能建立在下面这些已冻结输入上：

- [Form Public API Families](../ssot/form/05-public-api-families.md)
- [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
- [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)

当前基线中的硬约束：

1. canonical acquisition 继续是 `useModule(formProgram, options?)`
2. canonical projection 继续是 `useSelector(handle, selector, equalityFn?)`
3. form-owned React hook family 不得回到 exact surface
4. optional sugar 不得改变 ownership、lifecycle、selector law、scope search 或 cache truth

## 方案比较

### A. 不提供官方 sugar

优点：

- public surface 最小
- authority 最干净

缺点：

- 业务方会重复造轮子
- 可复用经验无法沉淀

### B. 直接提供官方 concrete hooks

例如：

- `useField`
- `useMeta`
- `useList`

结论：

- 直接拒绝

原因：

- 它会重新长出第二套 host truth
- 会把 optional layer 误读成 canonical route

### C. 提供官方 factory sugar

结论：

- 允许，但必须收窄

## 最终裁决

### 1. owner

唯一 owner 固定为：

- core-owned optional host helper layer

明确拒绝：

- form-side owner fallback
- `@logixjs/form` 公开导出 React sugar factory

Form 侧若需要参与，只能提供 domain-specific primitive，例如：

- path helper
- error descriptor / normalizer
- data-support selector primitive

它们不构成第二条 host route。

### 2. 允许的对象形状

当前只允许 hook-free split builders，例如：

- field projection builder
- meta projection builder
- field event binder
- error policy composer

authority 文本不再冻结任何 exact sugar noun。
像下面这些名字当前都不进入冻结面：

- `createFormSugar`
- `createFieldBinder`
- `createMetaSelector`
- `createListBinder`
- `useField`
- `useMeta`
- `useList`

如果将来真要定 noun，必须等到实现或专门的 exact helper review。

### 3. scope

当前 base scope 只承认：

- field sugar
- meta sugar

当前明确排除：

- list sugar
- row id reader
- `selectListIds`
- `useList`

原因：

- row identity projection truth 还没冻结为公开输入合同
- 现在提前纳入会把 list binder 证明面抬得过早

### 4. canonical docs

canonical 教学继续只认：

1. `Form.make(...)`
2. `useModule(formProgram, options?)`
3. `useSelector(handle, selector, equalityFn?)`
4. direct form handle

optional sugar 若未来存在：

- 单独放在 optional host cookbook
- 不回到 canonical tutorial 主线
- 不进入 form exact contract 的 day-one corollary

## 设计护栏

若未来要真正落地 factory sugar，必须同时满足：

1. 只基于公开 surface 组装
2. 不 import `packages/*/src/internal/**`
3. 不新增第二套 state truth
4. 不新增第二套 error truth
5. 不改变 `useModule / useSelector / handle` 的语义
6. 不生成被当作 canonical route 的官方稳定 hook family
7. 不让 canonical docs 漂移到 sugar 主线

## proof obligations

后续如果要 reopen 并真正升格，必须同时交付：

1. 证明 owner 仍然单点闭合在 core host law
2. 证明 sugar 完全可反解到 `useModule + useSelector + direct handle`
3. 证明不需要任何 internal import
4. 证明不会改变 Agent 默认输出主线

另外：

- field/meta sugar 若要实现，需给出最小 binder contract 与 policy injection contract
- list sugar 若要 reopen，需额外给出：
  - row identity 公共 projection primitive 已冻结
  - locality / reorder / remap 语义已冻结
  - 至少两类真实 consumer 的稳定收益证据

## 对当前 `examples/logix-react/src/form-support.ts` 的判断

它当前仍然只是 consumer-local proof，不直接升格。

它的价值在于证明：

- field/meta/list 这类 sugar 确实会被业务封装

它当前还不能证明：

- 官方应该给 exact noun
- 官方应该给 concrete hooks
- list sugar 已达到公共 freeze 门槛

## 去向候选

若 converge 通过，回写面建议是：

- [Form Public API Families](../ssot/form/05-public-api-families.md)
  - 增加 optional host sugar 的单行边界
- [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - 增加 factory sugar 不构成第二 host truth 的负约束
- [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
  - 增加 core-owned optional helper 的允许形状
- [form-api-tutorial.md](../internal/form-api-tutorial.md)
  - 只写“optional sugar 不在 canonical walkthrough”

## 当前一句话结论

允许官方提供 factory sugar，但它只能是 core-owned optional host helper，当前只讨论 field/meta 的 hook-free split builders；Form 不重新拥有 React sugar factory，list sugar 延后到单独 reopen gate。

## 去向

- 2026-04-17 已消化到：
  - [Form Public API Families](../ssot/form/05-public-api-families.md)
  - [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
