# Quickstart: 028 Form API（rules-first 收敛 + DX 提升）

本 quickstart 用“复杂表单（联动 + 条件必填 + 动态列表行/列表级校验）”说明 028 的终态推荐写法与心智模型，并给出性能/诊断的成本模型与优化梯子。

> 目标：让业务侧默认只用 `rules + derived` 完成绝大多数表单；`traits` 只作为高级入口存在。

## 0) 五个关键词（≤5）

1. **rules**：校验入口（字段/列表/根规则）
2. **derived**：派生/联动入口（只写 values/ui）
3. **identity**：列表行身份策略（trackBy/store/index）
4. **scoped validate**：按 scope 增量校验（field/list/item/root）
5. **diagnostics**：静态清单 + 动态 trace（可解释链路）

## 1) 推荐写法（终态概念）

### 1.1 decl list（核心 IR：最少嵌套）

```ts
const $ = Form.from(ValuesSchema)

const FormM = Form.make("MyForm", {
  values: ValuesSchema,
  initialValues,
  derived: $.derived({
    "profile.fullName": Form.computed({
      deps: ["profile.firstName", "profile.lastName"],
      get: (firstName, lastName) => `${firstName} ${lastName}`.trim(),
    }),
  }),
  rules: $.rules(
    // 字段级：内置校验器直接写在 rule config（等价于 Rule.make 展开）
    Form.Rule.field("contact.email", { required: "请填写邮箱" }),
    Form.Rule.field(
      "contact.phone",
      { deps: ["contact.preferredChannel"], validate: ... },
    ),

    // 对象级 refine / 跨字段校验：写回 `errors.profile.$self`，避免覆盖 profile 子字段错误树
    Form.Rule.field(
      "profile",
      {
        deps: ["profile.password", "profile.confirmPassword"],
        validate: (profile) =>
          profile.password === profile.confirmPassword ? undefined : "两次密码不一致",
      },
      { errorTarget: "$self" },
    ),
    Form.Rule.list("items", {
      identity: { mode: "trackBy", trackBy: "id" },
      item: { deps: ["name", "quantity", "price"], validate: ... }, // 行级
      list: { validate: ... },                                     // 列表级/跨行
    }),
  ),
})
```

要点：

- `derived` 只关心“值/交互态的联动”，禁止写 errors。
- `rules` 只关心“错误产物”，必须显式 deps 与 list identity。
- 所有内容最终会编译为 `StateTraitSpec`，由 runtime 执行与产出 trace（不引入第二套运行时）。

### 1.2 schema（组合式 authoring：像 zod 一样的 object/array）

`decl list` 是核心 IR；但业务侧更自然的写法应该像 zod：用 `object/array/field` 递归组合成一棵“规则树”，再一次性编译成 decl list。

入口（推荐终态）：

- `const z = $.rules`（作者侧可以刻意命名为 `z`，获得 zod 风格的 `z.object/z.array` 读写体验）  
- `z.schema(node)`：把规则树编译为 decl list（等价 1.1 的 `$.rules(...decls)`）。  
- `z.field(rule)`：字段叶子；`rule` 输入形态与 `Form.Rule.make(...)` 一致（builtins + validate + deps + validateOn）。  
- `z.object(shape)`：对象节点；只负责拼路径；`.refine(rule)` 表示对象级 refine，错误写回 `errors.<path>.$self`。  
- `z.array(item, { identity })`：数组节点；每一层数组都显式声明 `identity`；`.refine(rule)` 表示 list-level/跨行校验（写回 `$list/rows[]`）。  
- `node.superRefine(fn)`：高级组合能力（zod-like）：允许在一次校验里向多个子路径写错误（等价于返回一个嵌套 error patch）；用于跨字段/跨行的多点报错。  

路径直觉：

- `field` 不携带 path；path 由 `object/array` 的嵌套位置决定（即 state 的 `a.b.c`）。  
- 因为数组节点本身就是 `array(item)`，所以 list-in-list 自然表达：`array(object({ options: array(object(...)) }))`（不需要额外的 `list({ shape: ... })`）。  

下面用一个近似 zod 的写法同时演示：`对象>对象`、`对象>数组item>对象`、以及 `对象>数组item>对象>数组item>对象`（list-in-list）。

```ts
import { Schema } from 'effect'
import * as Form from '@logixjs/form'

const OptionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  value: Schema.String,
})

const ItemSchema = Schema.Struct({
  id: Schema.String,
  product: Schema.Struct({
    sku: Schema.String,
    name: Schema.String,
  }),
  warehouse: Schema.Struct({
    id: Schema.String,
  }),
  pricing: Schema.Struct({
    quantity: Schema.Number,
    price: Schema.Number,
  }),
  options: Schema.Array(OptionSchema),
})

const ValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    name: Schema.Struct({
      first: Schema.String,
      last: Schema.String,
    }),
    security: Schema.Struct({
      password: Schema.String,
      confirmPassword: Schema.String,
    }),
  }),
  contact: Schema.Struct({
    email: Schema.String,
    preferredChannel: Schema.Union(Schema.Literal('email'), Schema.Literal('phone')),
    phone: Schema.String,
    address: Schema.Struct({
      country: Schema.String,
      city: Schema.String,
      line1: Schema.String,
    }),
  }),
  items: Schema.Array(ItemSchema),
})

const $ = Form.from(ValuesSchema)
const z = $.rules

const Address = z.object({
  country: z.field({ required: '请选择国家' }),
  city: z.field({ required: '请填写城市' }),
  line1: z.field({ required: '请填写详细地址' }),
})

const Security = z.object({
  password: z.field({ required: '请填写密码', minLength: 8 }),
  confirmPassword: z.field({ required: '请再次输入密码' }),
}).refine({
  // 推荐：在 object/refine 中用相对 deps（编译期会补齐前缀）；也允许写绝对路径
  deps: ['password', 'confirmPassword'],
  validate: (security) => (security.password === security.confirmPassword ? undefined : '两次密码不一致'),
})

const Options = z.array(
  z.object({
    name: z.field({ required: '选项名必填' }),
    value: z.field({ required: '选项值必填' }),
  }),
  { identity: { mode: 'trackBy', trackBy: 'id' } },
).refine({
  validate: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: '至少一个选项' }),
})

const Item = z.object({
  product: z.object({
    sku: z.field({ required: '请填写 SKU' }),
    name: z.field({ required: '请填写商品名' }),
  }),
  warehouse: z.object({
    id: z.field({ required: '请选择仓库' }),
  }),
  pricing: z.object({
    quantity: z.field({ min: { value: 1, message: '数量必须 > 0' } }),
    price: z.field({ min: { value: 0, message: '价格不能为负' } }),
  }),

  // list-in-list：像 zod 一样自然地往下套
  options: Options,
})

const Items = z.array(Item, {
  identity: { mode: 'trackBy', trackBy: 'id' },
}).refine({
  validate: {
    atLeastOne: (rows) => (Array.isArray(rows) && rows.length > 0 ? undefined : { $list: '至少一行' }),
    uniqueWarehouse: (rows) => {
      // 同 1.1：构造 rowErrors 并返回 `{ rows: rowErrors }`（略）
      return undefined
    },
  },
})

const rules = z.schema(
  z.object({
    contact: z.object({
      email: z.field({
        required: '请填写邮箱',
        pattern: { value: /.+@.+\..+/, message: '邮箱格式不正确' },
      }),
      preferredChannel: z.field({ required: '请选择首选渠道' }),
      phone: z.field({
        deps: ['contact.preferredChannel'],
        validate: (phone, ctx) => {
          if (ctx.state.contact?.preferredChannel !== 'phone') return undefined
          return String(phone ?? '').trim() ? undefined : '当首选渠道为电话时，请填写手机号'
        },
      }),
      address: Address,
    }),

    profile: z.object({
      name: z.object({
        first: z.field({ required: '请填写名' }),
        last: z.field({ required: '请填写姓' }),
      }),
      security: Security,
    }),

    items: Items,
  }),
)
```

> 说明：深层 list 的 authoring 形态可以先固定为上述组合式 API；但要把“深层 scoped validate + identity + 写回”真正跑通，runtime 仍依赖 `tasks.md` 的 `T044/T045`（listIndexPath / 深层 RowIdStore）。

#### 1.2.1 values（effect/Schema）与 rules 整合（目标形态：schema→rules 桥接）

> 说明：该段是 028 的终态 DX 目标；schema→rules 桥接已由 `tasks.md` 的 `T046` 落地。

我们把“内在约束”尽量写在 `ValuesSchema`（类型/长度/范围/格式），再在 rules authoring 中复用这些约束，叠加“交互约束”（deps/validateOn/跨字段/跨行/identity）：

为什么 schema 已经有约束，还要“取出来”挂到 rules？

- schema 本身只描述“约束是什么”，但表单运行时还需要知道“什么时候跑、按什么 scope 增量跑、怎么出静态 IR/诊断证据”。  
- 把 schema leaf 显式挂到 rules 树上，相当于把它接入同一套 `rules` 编译链路（decl list → trait spec → RulesManifest/trace），从而可以像其它规则一样参与 scoped validate / validateOn。  
- 终态可以进一步做得更自动：例如 `z.fromValuesSchema(ValuesSchema)` 一键生成基础规则树，再在其上叠加交互约束（扩展方向，当前未实现）。  

如果你的目标只是“submit/手动校验时兜底”，那其实**不需要**把 schema leaf 接入 rules（`z.field(schema)`）：当前 `Form.controller.handleSubmit/validate` 已经会对 `values` 做一次 `Schema.decodeUnknownEither`，并把结果写到 `errors.$schema`（UI 会按 `manual > rules > schema` 读取）。schema→rules 桥接更多是为了把 schema 约束接入 rules 的增量/触发/诊断链路；背后运行链路小抄见 `runtime-validation-cheatsheet.md`。

```ts
import { Schema } from 'effect'
import * as Form from '@logixjs/form'

const Email = Schema.String.pipe(
  Schema.minLength(1, { message: () => '请填写邮箱' }),
  Schema.pattern(/.+@.+\..+/),
)

const ValuesSchema = Schema.Struct({
  contact: Schema.Struct({
    email: Email,
  }),
})

const $ = Form.from(ValuesSchema)
const z = $.rules

const rules = z.schema(
  z.object({
    contact: z.object({
      // 复用 schema 上的约束与 message（并编译到 rules 的 decl list / trait spec）
      email: z.field(Email),
      // 等价写法（类型更强，但更啰嗦）：
      // email: z.field(ValuesSchema.fields.contact.fields.email),
    }),
  }),
)
```

更“像一体化”的用法（也是 schema→rules 桥接真正有价值的地方）是：schema 负责基础约束，rules 负责交互语义与额外约束——同一个字段不再重复写 `minLength/pattern`，但仍可以声明触发策略与跨字段依赖：

```ts
const rules2 = z.schema(
  z.object({
    contact: z.object({
      email: z.field(Email, {
        // 交互语义：只在 blur 或 submit 时跑（减少输入时抖动）
        validateOn: ['onBlur', 'onSubmit'],

        // 额外约束：依赖其它字段（示例：按国家限制邮箱域名）
        extend: {
          deps: ['contact.address.country'],
          validate: {
            companyOnly: (email, ctx) => {
              const country = String(ctx.state.contact?.address?.country ?? '').trim()
              if (country !== 'CN') return undefined
              return String(email ?? '').endsWith('@acme.com') ? undefined : '仅允许公司邮箱'
            },
          },
        },
      }),
    }),
  }),
)
```

i18n 提醒：

- `effect/Schema` 的 `message: () => string` 是**同步**函数（懒求值），不是异步执行。  
- 如果 message 里直接调用 `t("...")`，切换语言后需要**触发一次 re-validate**（不一定是 submit；也可以在 locale change 时调用表单的 `controller.validate()` / `validatePaths(...)`）才能生成新语言的错误字符串。  
- 若希望“切换语言立即刷新已存在的错误”，推荐让 errors 存储可序列化的**消息描述符**（例如 `{ key, params }`）而不是最终字符串；UI 渲染时按当前语言翻译。  

### 1.3 内置 rule（RHF-like builtins）怎么被用到的

当前内置校验器入口是 `Form.Rule.make({ required/minLength/maxLength/min/max/pattern, validate })`：

- **展开**：只要声明了 builtin，就会在 build 阶段展开成同名规则（如 `required`/`minLength`），与 `validate` 一起组成可直接挂到 `check` 的 `RuleSet`（规则名重复会稳定报错）。
- **语义**：每条规则返回 `undefined` 表示通过；返回任意 `ErrorValue`（string/object）表示失败；错误值有预算上限（默认 JSON ≤256B）。
- **合并**：同一字段多条规则会**共同执行**；但 errors 真相源默认只保留 **firstError**（多错误不进入 errors，交给诊断层）。当多条都返回错误时，会按规则名的确定性排序取第一个（例如 `required` 通常会先于 `validate` 生效）。
- **触发**：规则会被 Form 的两阶段策略（`validateOn/reValidateOn`）与 rule-level `validateOn` 共同门控；`submit/manual` 总是执行。

028 推荐路径不会要求业务侧手动“消费 `Rule.make`”：你直接把同形态的 rule config 交给 `z.field(...) / z.object(...).refine(...) / z.array(...).refine(...) / node.superRefine(...)`（或写 decl list 的 `Form.Rule.field/list`），编译层内部会统一调用 `Form.Rule.make` 归一化并挂到 check：

```ts
rules: $.rules(
  Form.Rule.field('contact.email', {
    required: '请填写邮箱',
    pattern: { value: /.+@.+\..+/, message: '邮箱格式不正确' },
    validate: {
      companyOnly: (email) => (email.endsWith('@acme.com') ? undefined : '仅允许公司邮箱'),
    },
  }),
)
```

约束：推荐路径默认只用 `rules + derived`；`traits` 仅作为高级入口存在，且应与 `rules` 互斥（避免混用导致心智与行为漂移）。

## 2) 粗成本模型（性能心智）

- **字段级规则**：`O(受影响规则数)`；deps 越精确，增量范围越小。
- **列表级/跨行规则**：最坏 `O(rows)`；必须把这种扫描显式表达在 list scope（禁止 UI 手写全表扫描）。
- **identity**：`trackBy` 成本≈读取字段；`store` 依赖 runtime；`index` 最省但最容易错位。
- **诊断**：`off` 近零成本；`light/full` 会产出 Slim 可序列化事件（以 contracts 为口径），成本必须可预估。

## 3) 优化梯子（默认 → 可行动）

1. 默认：`validateOn=["onSubmit"]`，`reValidateOn=["onChange"]`
2. 观测：打开 diagnostics（light），看哪些规则在高频触发、哪些 list 扫描最贵
3. 收敛 deps：把 deps 写准（尤其跨字段/跨行）以缩小影响域
4. 稳定 identity：优先 `trackBy`；缺失则明确选择 `store/index` 并接受对应风险
5. 调触发策略：对高成本规则用 rule 级 `validateOn` 限制到 `onBlur` 或仅 submit
6. 拆分表单：大表单拆模块/拆列表，避免单次事务触发过多无关规则

## 4) 反模式（强制禁止/不推荐）

- 在 UI 里手写“全表扫描 + setError”模拟跨行校验（不可回放/不可解释/性能不可控）。
- `derived` 写入 `errors/$form`（产生第二套事实源）。
- 规则里执行 IO/await（破坏事务窗口定义）。
- 不声明 identity 就期望列表错误稳定对齐（必须显式选择策略）。
- `rules` 与 `traits` 混用（推荐路径只用 `rules + derived`；需要 escape hatch 则只用 `traits`）。
- 为了“收集全部错误”把 errors 真相源膨胀为多错误数组（默认只保留 firstError；多错误交给诊断层）。

## 5) 排障入口（最短路径）

- **错位/漂移**：看 `trait:check` 的 `rowIdMode/degraded`，确认当前 identity 是否降级（以及原因）。
- **为何某规则没跑**：看规则的 `validateOn` 与本次触发模式（submit/blur/valueChange/manual）。
- **为何错误不消失**：检查错误优先级（manual > rules > schema）与写回路径是否一致。
