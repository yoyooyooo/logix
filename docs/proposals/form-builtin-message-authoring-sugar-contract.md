---
title: Form Builtin Message Authoring Sugar Contract
status: consumed
owner: form-builtin-message-authoring-sugar
target-candidates:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-17
---

# Form Builtin Message Authoring Sugar Contract

## 目标

只讨论一个更小的问题：

- `Form` builtin rule 的 `message` 输入位，是否应该允许更轻的 authoring sugar

这轮不讨论：

- i18n 公共 canonical carrier
- i18n render contract
- `Form.Error.leaf(...)`
- `setError(...)`
- schema mapping
- submit mapper

## 当前问题

当前公共 contract 已经收成：

- `FormErrorLeaf.message` 只认 `I18nMessageToken`
- builtin rule `message` override 也只认 `I18nMessageToken`

这条路在 contract 上很干净，但对“不做 i18n”的项目有真实 friction。

例如用户会自然写出：

```ts
Form.Rule.make({
  required: true,
  email: "自定义 message",
})
```

或：

```ts
Form.Rule.minLength({
  min: 3,
  message: "至少 3 位",
})
```

问题在于：

- 直接允许 raw string 进入 canonical state，会破坏单一 token truth
- 前一轮评审已经明确拒绝把公共 carrier 升成 `I18nMessageToken | I18nLiteralToken`

所以这一轮只审：

- builtin `message` 输入位是否能接更轻的 sugar
- 以及这层 sugar 应如何 lower，才不污染公共 carrier

## 已冻结前提

当前 proposal 只能建立在下面这些前提上：

1. `FormErrorLeaf.message` 继续按 `I18nMessageToken` 理解
2. i18n 公共 canonical carrier 与 render contract 当前不改
3. 若要降低 non-i18n authoring friction，当前只允许在窄 authoring edge reopen
4. builtin rule 是当前最有证据的高频摩擦点
5. raw string 不允许重新进入 canonical state / error tree / reason / compare

## 候选

### A. 继续坚持 token-only

```ts
Form.Rule.make({
  required: true,
  email: token("profile.email.invalid"),
})
```

优点：

- 最干净
- 概念最少

问题：

- 对不做 i18n 的项目仍然偏烦
- 把 i18n 语义 key discipline 外溢到最小作者面

### B. builtin `message` 输入位允许 `string | I18nMessageToken`

```ts
Form.Rule.make({
  required: true,
  email: "自定义 message",
})
```

或：

```ts
Form.Rule.minLength({
  min: 3,
  message: "至少 3 位",
})
```

要求：

- raw string 只允许停在 builtin authoring input
- 一进入 Form authoring edge 就立刻 lower
- 下游 canonical carrier 继续只认结构化 message

优点：

- 直接命中当前已证明的 DX 痛点
- blast radius 小

风险：

- 必须补齐 lowering law
- 必须补齐 allowlist

### C. 要求显式 helper

例如：

```ts
Form.Rule.make({
  required: true,
  email: literal("自定义 message"),
})
```

优点：

- 依然明确
- 不会把 raw string 直接写进对象

问题：

- 还是引入额外心智
- 对“不想管 i18n”的项目来说，烦恼并没有消失太多

## Adopted Delta

这轮最终采用的是更小的 authoring-only sugar 结论：

1. raw string 只允许停在显式 `message` slot
2. `Form.Rule.make({...})` 里只为 `required`、`email` 这两个 boolean builtin 保留 raw string shorthand
3. direct builder 暂不开放 bare string positional shorthand
4. raw string 一进入 Form authoring edge就必须立刻 lower
5. lower 后的结果不改变公共 canonical carrier

## exact candidate

### allowed positions

当前建议允许 raw string 的位置只有：

- `Form.Rule.minLength({ min, message: "..." })`
- `Form.Rule.maxLength({ max, message: "..." })`
- `Form.Rule.min({ min, message: "..." })`
- `Form.Rule.max({ max, message: "..." })`
- `Form.Rule.pattern({ re, message: "..." })`
- `Form.Rule.required({ message: "..." })`
- `Form.Rule.email({ message: "..." })`
- `Form.Rule.make({ required: "..." })`
- `Form.Rule.make({ email: "..." })`

说明：

- direct builder 当前不开放 bare string positional shorthand
- `Form.Rule.make` 里只为 `required`、`email` 这两个 boolean builtin 保留 raw string shorthand
- 数值类和 `pattern` 类只在 object 的 `message` property 接受 raw string，因为还要承载 `min / max / re`

### disallowed positions

当前明确不允许 raw string 的位置包括：

- `Form.Rule.required("...")`
- `Form.Rule.email("...")`
- `Form.Error.leaf("...")`
- `form.setError(path, { message: "..." })`
- 自定义 `validate` 直接返回 raw string
- submit error mapper
- schema error mapper

### lowering law

当前冻结下面这些 invariant：

- raw string 只在 Form builtin authoring input 这一瞬合法
- lower 只发生在 Form authoring edge
- lower 不读取 driver / snapshot / app bootstrap 状态
- lower 后 raw string 不再越过 builtin parser 边界
- 一旦形成 rule declaration、normalized builtin config、runtime error leaf、reason evidence、compare input 或 diagnostics 输入，看到的都已经是 i18n-owned 的非 string 结构
- lowering 不新增任何 export noun、也不新增任何新公开 type

这轮先不冻结 lower 后的公开 spelling。

也就是说，这轮当前不承诺：

- 对外公开 `I18nLiteralToken`
- 对外公开 `literal(...)`
- 对外公开新的 union carrier

### public contract impact

当前 candidate 的目标是：

- authoring input 变宽
- canonical carrier 不变

所以如果通过，活 SSoT 最终应表现为：

- `FormErrorLeaf.message` 继续是 `I18nMessageToken`
- `Form builtin message authoring input` 在窄 allowlist 上比 canonical carrier 更宽

### teaching law

当前同时冻结文档顺序：

1. 默认零参数 builtin
2. 显式 `I18nMessageToken` override
3. raw string sugar

raw string sugar 只服务 non-i18n / quick authoring。
它不改 canonical tutorial 主线。

## 为什么这条候选可能更好

### 1. 它只解决已证明的问题

当前证据只覆盖 builtin message authoring friction。

所以更合理的收法是：

- 只改 builtin authoring input
- 不动 i18n 全域 carrier

### 2. 它保住了公共单线 truth

只要 lower 足够早，state / compare / diagnostics 看到的仍然是统一的结构化 message。

### 3. 它对非 i18n 项目仍然直接

用户想写中文，就直接写中文。
不用先理解 token key discipline。

## 当前风险

### 1. lowering law 若不够硬，会重新滑回 string-first

### 2. allowlist 若不闭合，会从 builtin message 扩散到 manual / submit / schema 路径

### 3. public type 和 authoring input type 分层后，文档必须非常清楚

## 当前拒绝的方向

当前继续拒绝：

- 把 `string | I18nMessageToken` 直接升成公共 canonical carrier
- 直接开放 `Form.Rule.required("...")` / `Form.Rule.email("...")`
- 直接 reopen `Form.Error.leaf(...)` 的 raw string sugar
- 直接 reopen `setError(...)` 的 raw string sugar
- 重新改写 i18n 的公共 render contract

## 需要 reviewer 重点挑战的点

1. 这条更小的候选，是否比“公共 union carrier”更合理
2. `Form.Rule.make({ required: "...", email: "..." })` 是否值得进入 v1 allowlist
3. lowering invariant 是否已经足够硬
4. teaching order 是否已经足够防止 string-first 漂移

## 去向

- 2026-04-18 已消化到：
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
