---
title: I18n Literal Token Authoring Contract
status: consumed
owner: i18n-literal-token-authoring
target-candidates:
  - docs/ssot/runtime/08-domain-packages.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-17
---

# I18n Literal Token Authoring Contract

## 目标

评估并冻结一个新的 message contract 候选：

- `I18nMessageToken | I18nLiteralToken`

目标不是把 raw string 重新放回 canonical state。
目标是同时满足：

1. 继续保持单一、可序列化、可比较的 message carrier
2. 不需要国际化的项目，在 authoring 时不必被迫手写 `token(...)`

## 当前问题

当前公共口径已经收成：

- Form error carrier 只认 `I18nMessageToken`
- builtin rule `message` override 只认 `I18nMessageToken`

这条路对保持单一 truth 是干净的，但对“不做 i18n”的项目有明显 authoring friction。

真实痛点是：

```ts
Form.Rule.make({
  required: true,
  email: "自定义 message",
})
```

这样的作者面很自然。
但当前 contract 下，它会破坏 token-only carrier。

## 已冻结前提

当前 proposal 只能建立在下面这些前提上：

1. carrier 必须继续可序列化、可稳定比较
2. rendered string 不能重新进入 canonical truth
3. `@logixjs/i18n` 继续持有 token contract 与 render service
4. Form 不应重新持有 raw string error carrier
5. 对无 i18n 项目的 authoring friction 是真实问题，需要被正面解决

## 候选

### A. 继续坚持 token-only

- carrier：`I18nMessageToken`
- authoring：也只允许 `I18nMessageToken`
- 无 i18n 项目必须写 `token(...)`

优点：

- 最纯
- 最少分支

问题：

- 对不做 i18n 的项目很烦
- 会把“是否接入 i18n 系统”这件事外溢到最小表单作者面

### B. 允许 raw string 直接成为 canonical carrier

- carrier：`I18nMessageToken | string`
- authoring：允许直接 string

优点：

- 最省

问题：

- 重新打开两套 carrier
- compare / reason / render contract 都会重新分叉
- rendered text 与 semantic token 的边界再次变脏

### C. 引入 `I18nLiteralToken`

- carrier：`I18nMessageToken | I18nLiteralToken`
- state / compare / render 继续只认结构化 message object
- authoring edge 可以额外允许 raw string sugar，但它必须立刻 lower 成 `I18nLiteralToken`

当前判断：

这轮优先评估 C。

## 已挑战但未采纳的候选快照

下面这组内容是本轮被 challenge 但未采纳的候选快照，只保留作 rejected alternative 记录：

1. canonical message carrier 从单一 `I18nMessageToken` 升成：
   - `I18nMessageToken | I18nLiteralToken`
2. `I18nLiteralToken` 是显式的非本地化 message intent，不是 rendered string
3. raw string 只允许出现在窄 authoring sugar 位置
4. raw string 一进入 authoring edge 就必须立刻 lower 成 `I18nLiteralToken`
5. state / compare / reason / render contract 仍然只消费结构化 message
6. `@logixjs/i18n` 的 `render / renderReady` 继续单点承接这两类 message
7. semantic token 与 literal token 的差别必须可由 `_tag` 区分，不能靠隐式推断

## 已挑战但未采纳的 exact 快照

### message carrier

```ts
type I18nMessage =
  | I18nMessageToken
  | I18nLiteralToken

type I18nLiteralToken = {
  readonly _tag: "i18n.literal"
  readonly text: string
}
```

约束：

- `I18nLiteralToken` 必须可序列化
- 它不带语言 key
- 它不参与 i18n lookup
- render 时直接返回 `text`

### authoring sugar

当前建议只在窄位置允许 raw string sugar，例如：

- Form builtin `message`
- `Form.Error.leaf(...)`

对应 lower 规则：

```ts
"自定义 message" -> { _tag: "i18n.literal", text: "自定义 message" }
```

### render law

```ts
render(message: I18nMessage): string
```

行为：

- 若是 `I18nMessageToken`，继续按 key + params render
- 若是 `I18nLiteralToken`，直接返回 `text`

### boundary law

当前同时建议冻结：

- raw string 只允许停在 authoring edge
- canonical state / error tree / reason / compare 里不再出现 raw string
- compare 不因为 literal token 的存在而退回 string compare

## 这条候选当时为何被拿来挑战

### 1. 它保住了结构化 carrier

比 `string | token` 好，因为 carrier 仍然是结构化 object，不会回到 raw string state。

### 2. 它解决了无 i18n 项目的作者面烦恼

用户不需要先理解语义 token key discipline，才能写一个简单的中文报错。

### 3. 它把“我故意不做本地化”表达成显式语义

`I18nLiteralToken` 不是偷懒 string。
它表示：

- 这条 message 就是一个固定 literal
- 我不期待它随语言切换而变化

## 当前风险

### 1. carrier 从单变双

虽然都是结构化 object，但它依旧引入了第二种 message variant。

### 2. render contract 会多一条分支

i18n service 必须同时解释 semantic token 和 literal token。

### 3. authoring sugar 的开放边界容易失控

如果不把“允许 raw string 的位置”收紧，最后还是会慢慢退回 string-first。

## 当前拒绝的方向

当前继续拒绝：

- `string | I18nMessageToken` 直接成为 canonical carrier
- raw string 直接写进 state / error tree / reason
- 不带 `_tag` 区分的隐式 literal token
- 用 `t("文本")` 之类会和 render side `t(...)` 混淆的 constructor

## 需要 reviewer 重点挑战的点

1. `I18nMessageToken | I18nLiteralToken` 是否真的优于当前 token-only
2. raw string sugar 是否必须存在，还是只提供显式 `literal(...)` helper 就够
3. literal token 是否会引入第二系统，破坏单一 authority
4. 哪些 authoring edges 允许 string sugar，边界要不要收得更窄

## Adopted Delta

- 当前不采纳把公共 canonical carrier 升成 `I18nMessageToken | I18nLiteralToken`
- 当前不采纳把 literal 文本直接抬成公共 canonical carrier variant
- 若 future 要降低 non-i18n 项目的 authoring friction，优先只在窄 authoring edge reopen sugar
- 在没有单独证明前，不改 i18n 的公共 carrier 与 render contract

## 去向

- 2026-04-17 已消化到：
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
