---
title: Form Error Selector Primitive Contract
status: consumed
owner: form-error-selector-primitive
target-candidates:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/form/05-public-api-families.md
  - docs/proposals/form-react-sugar-factory-api-candidate.md
last-updated: 2026-04-17
---

# Form Error Selector Primitive Contract

## 目标

冻结 `Form.Error` 在 companion primitive 里的最小事实：

1. owner 归谁
2. 它是不是 descriptor-first
3. 它是不是 non-executable
4. caller 能不能改 precedence

本页当前不冻结 source universe 的 exact spelling，也不冻结 descriptor 的公开结构字段。

## 已冻结前提

这份 proposal 只能建立在下面这些约束上：

1. `Form.Error` 只保留 data-support 身份
2. selector descriptor factory 的 owner 在 `Form.Error`
3. 它不能长成 hook family、projection family 或 host route
4. sugar helper 不能重写 field error precedence

## 当前 adopted candidate

当前采用一个更小候选：

1. `Form.Error` 拥有 field error selector primitive
2. 这个 primitive 继续是 descriptor-first
3. 这个 primitive 明确 non-executable
4. caller 不再传 `order`
5. precedence policy 与 source resolution 都继续归 `Form.Error`
6. 当前 descriptor 视为 opaque token，不公开 structural shape
7. 当前只冻结 `field` 路线
8. `root / item / list / submit` 相关 selector 路线后置到 reopen

## 当前 exact candidate

### spelling

当前只冻结一条 spelling：

```ts
Form.Error.field(path: string): FormFieldErrorSelectorDescriptor
```

### contract

```ts
declare const FormFieldErrorSelectorDescriptorBrand: unique symbol

type FormFieldErrorSelectorDescriptor = Readonly<{
  readonly [FormFieldErrorSelectorDescriptorBrand]: true
}>
```

当前只冻结下面这些语义：

- 输入 path 当前按 canonical value path 理解
- 返回物是 opaque descriptor
- descriptor 不可执行
- precedence policy 不可由调用方改写
- source-to-path resolution 不外泄到 helper 或 caller

当前不冻结：

- descriptor 的可枚举字段
- exact source universe 的公开表示
- `submit` 是否进入 field selector 的内部 source bundle

这些都继续留在 `Form.Error` owner 下，等后续 reopen。

## 为什么收成这样

### 1. 不再保留双候选

这轮是 `zero-unresolved`。
所以不再保留 `descriptor-first` 和 `selector-first` 两条活候选。

### 2. 不再保留自由 `order`

field error precedence 如果允许调用点自由改写，就不再是 `Form.Error` 的单点 owner。

所以这轮明确裁掉：

- `options.order`

### 3. 不再公开 structural descriptor shape

如果 descriptor 只是 `{ path, order }` 这类可手写对象：

- helper 仍然会自己重写 source resolution
- 外部也能平地造出第二套 descriptor

所以这轮直接收成 opaque token。

## 当前 scope

当前只冻结：

- `Form.Error.field(path)`

当前明确不冻结：

- `Form.Error.root(...)`
- `Form.Error.item(...)`
- `Form.Error.list(...)`
- `submit-originated field error` 的公开 source 表示
- executable selector

## 设计护栏

若这份 proposal 要通过，必须同时满足：

1. owner 继续单点停在 `Form.Error`
2. 继续只做 data-support
3. 不返回 executable selector
4. 不让 caller 改 precedence
5. 不让 helper 重写 source-to-path resolution
6. 不长出 `useX` family

## 与 sugar-factory 的关系

当前 [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md) 里仍把 field error selector 记成后续 companion primitive。

这一页若通过，意味着：

- field value projection builder 仍只读 values
- field error 交给 `Form.Error.field(path)` 这条 companion primitive
- helper 只能消费 descriptor，不能自己拼 `manual/rule/decode/submit`

## 去向候选

若 converge 通过，回写面建议是：

- [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
- [Form Public API Families](../ssot/form/05-public-api-families.md)
- [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md)

## reopen gate

后续只有在同时满足下面条件时，才允许继续扩：

1. 不引入第二 host truth
2. 不把 precedence policy 重新交给 caller
3. 不把 descriptor 重新开放成 structural public object
4. 若要展开 source universe，必须同时交代 `submit` 与 source-to-path resolution
5. 若要扩到 `root / item / list`，必须证明不会立刻再长第二套 helper family

## 当前一句话结论

当前最小可证明的 `Form.Error` selector primitive 是：`Form.Error.field(path)` 返回一个由 `Form.Error` 单点拥有的 opaque、descriptor-first、non-executable token；precedence policy 和 source resolution 都不再外放给调用方。

## 去向

- 2026-04-17 已消化到：
  - [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - [Form Public API Families](../ssot/form/05-public-api-families.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
  - [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md)
