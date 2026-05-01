---
title: Form Rule Builtin I18n Catalog Contract
status: consumed
owner: form-rule-builtin-i18n-catalog
target-candidates:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-17
---

# Form Rule Builtin I18n Catalog Contract

## 目标

把 Form 内置 rule 的默认消息、override 合同和默认 locale 资源的 owner 收成单线。

这轮只处理 builtins：

- `required`
- `minLength`
- `maxLength`
- `min`
- `max`
- `pattern`

这轮不处理：

- 自定义 `validate` 返回值的全量 token cutover
- decode / schema error 默认 token
- render boundary exact contract

## 当前问题

当前 builtins 仍停在 raw string：

- [validators/index.ts](../../packages/logix-form/src/internal/validators/index.ts)

具体症状：

1. 默认错误值还是字符串，如 `required`、`minLength`
2. `message` override 还是 `string`
3. 现在 `FormErrorLeaf.message` 已收成 `I18nMessageToken`
4. 这导致 builtins 和当前 exact error carrier 之间仍有漂移

## 已冻结前提

当前 proposal 只能建立在下面这些前提上：

1. `FormErrorLeaf.message` 的 exact contract 已是 `I18nMessageToken`
2. `@logixjs/i18n` 继续只持有 token contract 与 render service
3. 领域包若要承接用户文案，默认直接复用 i18n token contract，不复制第二消息合同
4. render fallback 不进入 semantic token contract
5. `@logixjs/form` root surface 不应因为 builtins catalog 再长新的 canonical noun

## 要裁的 3 件事

### 1. builtins 默认消息的 truth 是什么

候选：

1. 默认继续是 raw string
2. 默认是 `I18nMessageToken`

当前判断：

只应接受 `I18nMessageToken`。

原因：

- builtins 属于 Form 自己的 validation semantics
- 既然 error carrier 已经改成 token，builtins 继续吐 string 只会留下第二条旧 truth
- 语言切换后的重新渲染必须由 `token + snapshot` 驱动，raw string 无法参与
- builtins 一旦自带默认 token，day-one call-site 也应随之收成零参数

### 2. builtins default locale resources 的 owner 放哪

候选：

1. 只提供 token key，文案完全由应用自己配
2. `@logixjs/form` 提供可选 locale catalogs
3. `@logixjs/i18n` 内建一份 form builtin catalogs

当前判断：

优先收成候选 2。

原因：

- builtin rule 的语义 owner 在 Form
- i18n 继续只提供通用 token/render 能力，不承接 Form 专属 validation 文案资产
- 只给 key 不给默认 catalogs，会让 day-one 体验和 examples 退化，内置 rule 失去“拿来即用”的基本完整性

### 3. `message` override 的 exact shape 是什么

候选：

1. `message?: string | I18nMessageToken`
2. `message?: I18nMessageToken`
3. `message?: string`，内部自动转 token

当前判断：

只应接受候选 2。

原因：

- `string | token` 会把 canonical carrier 再次打宽
- 自动把 string 升成 token，会制造隐式 key policy 和第二套 message normalization
- 对用户和 Agent 都更稳定的合同是显式 token

## 当前 adopted candidate

当前采用下面这组裁决：

1. 内置 rule 默认错误值全部改成 `I18nMessageToken`
2. builtins `message` override 只接受 `I18nMessageToken`
3. `@logixjs/form` 提供 default locale catalogs
4. default locale catalogs 的 day-one route 固定为 `@logixjs/form/locales`
5. `@logixjs/form` root 不新增 locale noun
6. default token key 由 Form 单点持有
7. token params 只放语义参数，不放 render fallback
8. 只有 `required` 允许 bare token shorthand
9. 数值类和 `pattern` 类 builtins 的 override 一律走 object 形态
10. builtin 一旦具备默认 token，canonical day-one 写法默认走零参数；显式 `message` 只服务 override

## exact candidate

### builtins declaration contract

```ts
type RequiredDecl =
  | boolean
  | I18nMessageToken
  | Readonly<{
      readonly message?: I18nMessageToken
      readonly trim?: boolean
    }>

type MinLengthDecl =
  | number
  | Readonly<{
      readonly min: number
      readonly message?: I18nMessageToken
    }>

type MaxLengthDecl =
  | number
  | Readonly<{
      readonly max: number
      readonly message?: I18nMessageToken
    }>

type MinDecl =
  | number
  | Readonly<{
      readonly min: number
      readonly message?: I18nMessageToken
    }>

type MaxDecl =
  | number
  | Readonly<{
      readonly max: number
      readonly message?: I18nMessageToken
    }>

type PatternDecl =
  | RegExp
  | Readonly<{
      readonly re: RegExp
      readonly message?: I18nMessageToken
    }>
```

说明：

- `RequiredDecl` 保留 token shorthand，是因为 `boolean | token | object` 仍然清晰
- 数值类和 `pattern` 类 rule 不接受 bare token shorthand
- 原因是它们还要同时承载阈值或 regexp 本体；object 形态更稳定，也更利于 Agent 生成
- builtin 一旦具备默认 token，canonical day-one 写法默认是：
  - `Form.Rule.required()`
  - `Form.Rule.minLength(3)`
  - `Form.Rule.pattern({ re: /.../ })`
- 只有在需要改默认文案时，才显式传 `message: token(...)`

### default token keys

当前建议固定为：

```ts
token("logix.form.rule.required")
token("logix.form.rule.minLength", { min })
token("logix.form.rule.maxLength", { max })
token("logix.form.rule.min", { min })
token("logix.form.rule.max", { max })
token("logix.form.rule.pattern")
```

说明：

- key namespace 固定归 Form owner
- `min/max/minLength/maxLength` 的数值阈值进入 semantic params
- `pattern` 当前不把 regexp 本身塞进 token params

### default locale catalogs

当前最终建议先固定为：

```ts
import { zhCN, enUS } from "@logixjs/form/locales"
```

这轮不采用按 locale 分拆的 subpath：

```ts
import { zhCN } from "@logixjs/form/locales/zh-CN"
```

原因：

- `@logixjs/form/locales` 已经足够薄，不会污染 root canonical surface
- examples、docs 和应用接线更直接
- day-one 不需要为还未证明的 bundle pressure 预埋第二层 subpath 复杂度
- 若未来真有 tree-shaking 或按需装载证据，再单独 reopen per-locale subpath

这里同时补一条已经冻结的 registration owner：

- `@logixjs/form/locales` 只导出 locale assets
- registration、merge order 与 bucket mapping 的唯一 owner 已固定为 application bootstrap
- 这块的 exact contract 继续看 [i18n-catalog-registration-contract.md](./i18n-catalog-registration-contract.md) 与其已消费去向

### locale catalog data shape

当前建议只给薄数据，不给 helper：

```ts
type FormBuiltinRuleCatalog = Readonly<Record<string, string>>
```

例如：

```ts
const zhCN = {
  "logix.form.rule.required": "此项为必填",
  "logix.form.rule.minLength": "长度不能小于 {{min}}",
  "logix.form.rule.maxLength": "长度不能大于 {{max}}",
  "logix.form.rule.min": "值不能小于 {{min}}",
  "logix.form.rule.max": "值不能大于 {{max}}",
  "logix.form.rule.pattern": "格式不正确",
}
```

这里的 catalog 只是一份 asset：

- 不定义 render API
- 不定义 locale loading policy
- 不定义 snapshot helper

这些继续归 i18n service 和应用接线层。

## 为什么这样收

### 1. 为什么 default catalogs 不放 i18n

因为文案语义 owner 在 Form builtins。

i18n 只该知道：

- token 长什么样
- 怎么 render
- 怎么响应语言切换

它不该替 Form 维护 rule builtin 的领域文案资产。

### 1.1 为什么先固定 `@logixjs/form/locales`

因为这条路已经满足当前所有目标：

- optional
- 不进 root
- import 简单
- 文档教学成本低

再细分成 `locales/zh-CN`、`locales/en-US` 这类多级 subpath，当前没有足够收益支撑它进入 freeze。

### 2. 为什么 override 不允许 string

因为只要 builtins 还允许 string override，canonical rule surface 就仍有两套消息合同：

- token
- string

这会让 examples、tests、Agent 生成和 type guidance 全部再次分叉。

### 3. 为什么只有 `required` 接受 bare token shorthand

因为只有 `required` 没有第二个语义参数要承载。

例如：

- `required: token(...)` 仍然清晰
- `minLength: token(...)` 不成立，因为 `min` 去哪了
- `pattern: token(...)` 也不成立，因为 `re` 去哪了

所以更稳的合同是：

- `required` 可用 bare token shorthand
- 其余 builtins 的 override 一律进 object

### 4. 为什么 `pattern` 不放 regexp params

regexp 本身通常不属于稳定的 semantic token 参数：

- 太实现细节
- 很难本地化
- 容易把 render 文案绑死在技术表达上

当前保留简单 key 更稳。

如果以后真有业务证明需要 pattern explain，再单独 reopen。

## 当前拒绝的方向

当前继续拒绝：

- builtins default message 继续用 raw string
- `message?: string | I18nMessageToken`
- `message?: string` 后再内部自动转 token
- 在 `@logixjs/i18n` root 下新增 `FormRuleMessages` 之类专属 façade
- `@logixjs/form` root 新增 `Locales`、`Messages`、`BuiltinMessages` 一类 noun
- `@logixjs/form/locales/zh-CN` 这类 per-locale subpath 抢跑进入 freeze
- `minLength: token(...)`、`max: token(...)`、`pattern: token(...)` 这类 bare token shorthand
- 把 render fallback 塞进 token params

## 当前影响面

若采用本 proposal，下一波实现至少会改：

- `packages/logix-form/src/internal/validators/index.ts`
- `packages/logix-form/src/Rule.ts`
- `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
- examples 中所有 builtin `message: "..."` 写法
- `packages/logix-form` 的 optional locale subpath exports
- `@logixjs/form` 与 `@logixjs/i18n` 的接线 examples / tutorial

## reopen gate

后续只有同时满足下面条件时，才允许继续扩：

1. 不把 i18n 重新拖成 Form 专属 façade owner
2. 不把 builtins default message 再降回 string
3. 不给 root surface 新增 locale noun
4. 若要放开 string override，必须先重新证明它不会破坏 canonical carrier 单线
5. 若要把 locale route 拆成 per-locale subpath，必须先给出 bundle / tree-shaking 证据
6. 若要扩到 custom validate return contract，必须单独回答 rule-return normalization owner

## 当前一句话结论

当前最稳的收法是：

- builtins 全部输出 token
- override 只接受 token
- default locale catalogs 由 `@logixjs/form/locales` 提供
- 只有 `required` 允许 bare token shorthand
- builtin 自带默认 token 后，canonical day-one 写法默认零参数
- i18n 继续只做 token/render owner

当前 registration owner 与 merge law 已由 [i18n-catalog-registration-contract.md](./i18n-catalog-registration-contract.md) 收口：

- application bootstrap 是唯一 owner
- cross-domain default collision 视为 authoring error
- app overrides last-wins

## 去向

- 2026-04-17 已消化到：
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
