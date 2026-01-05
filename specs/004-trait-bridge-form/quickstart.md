# Quickstart: Trait→StateTrait（支点）→Form（领域包）——数组/校验/异步/可回放（RHF≥）

> 本文以 **Trait→StateTrait（支点）** 为主线，展示如何在不引入第二套运行时的前提下构建 Form 领域系统：  
> 规则/错误树/异步约束由 StateTrait（node/list/check/source）承载；Form 领域包（`@logix/form`）只提供语法糖与 helper；Trait 生命周期的桥接能力（install/refs/validate/cleanup）下沉为可复用能力，未来更多 `xxxTrait` 也可复用同一形状。
>
> 备注：`StateTrait` 是本 spec 选定的“第一个支点 Trait”，但不是强制中间层；未来某些领域也可以直接走 **Trait → Form（领域包）** 的链路。
>
> Query（平行领域）的 quickstart 与数据模型见：  
> - `specs/004-trait-bridge-form/references/04-query-quickstart.md`  
> - `specs/004-trait-bridge-form/references/03-query-data-model.md`
>
> Kernel 只保留一套 verbs：
>
> - `computed`：纯派生（包含表单视图 meta/options 的派生）
> - `source`：异步资源依赖声明（真实 IO 在 ResourceSpec.load: Effect 中）
> - `link`：跨字段传播
> - `check`：语义糖，本质是“写 errors/诊断子树的 computed”
>
> 004 的硬语义：`computed/source` 必须显式声明 `deps`（依赖字段路径）；Runtime watcher 只订阅 deps，Devtools/回放以 deps 解释“为什么重算/为什么刷新”。
>
> 数组字段通过 `StateTrait.list({ item, list })` 一等公民化；`item/list` 两个 scope 内部用 `StateTrait.node({ ... })` 统一声明形状。  
> `Form.traits / Form.Rule` 仅作为**可选领域糖**，最终都会回落为等价的 kernel 结构。
>
> 备注：`StateTrait.list` 的 `item` / `list` 两个 scope 都是可选的。大多数表单只需要 `item`；只有在需要“跨行/列表级”规则或摘要时才声明 `list`。
>
> 如果你只关心“业务怎么用”（Blueprint/Controller/React），只读第 0 节即可；后续场景 1/2/3 主要展示 Traits 写法与语义边界。
>
> 进一步阅读（同一事实源）：
> - Form 业务 API（Blueprint + Controller）：`specs/004-trait-bridge-form/references/06-form-business-api.md`
> - 链路叙事（Trait/StateTrait → Module → UI）：`specs/004-trait-bridge-form/references/00-trait-stack-narrative.md`

## 0. 端到端（业务开发者视角）：从 Blueprint 到 React

> 本节按真实业务开发流程走一遍完整链路：  
> **创建 FormBlueprint（组件外）→ 在页面/组件内懒启动 ModuleRuntime → React 投影订阅 + 事件派发 → Devtools/回放（可选）**。  
>
> 关键点：`StateTrait.node / StateTrait.list` 属于 **StateTrait 基础体系（@logix/core）**；`@logix/form` 只负责把它们装配成“业务默认入口”（Blueprint + Controller），并提供少量领域糖与 helper。

### 0.1 创建 FormBlueprint（组件外定义，不会偷跑运行时）

```ts
import { StateTrait } from "@logix/core"
import * as Form from "@logix/form"
import { Schema } from "effect"

const ValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    email: Schema.String,
  }),
})

export const EmailForm = Form.make("EmailForm", {
  values: ValuesSchema,
  initialValues: { profile: { email: "" } },
  traits: Form.traits(ValuesSchema)({
    "profile.email": StateTrait.node({
      check: {
        required: (email) => (email ? undefined : "必填"),
        format: (email) => (/^\\S+@\\S+$/.test(email) ? undefined : "邮箱格式不正确"),
      },
    }),
  }),
})
```

### 0.2 React（局部表单）：推荐用 `@logix/form/react`（薄投影），底层仍是 `@logix/react`

```tsx
import React from "react"
import { useForm, useField } from "@logix/form/react"
import { EmailForm } from "./emailForm"

export function EmailFormView() {
  const form = useForm(EmailForm)
  const email = useField(form, "profile.email")

  return (
    <div>
      <input
        value={email.value}
        onChange={(e) => email.onChange(e.target.value)}
        onBlur={email.onBlur}
      />
      {email.error ? <div>{email.error}</div> : null}
    </div>
  )
}
```

说明：

- `useForm(blueprint)` 内部等价于：`useLocalModule(blueprint.module, { initial: blueprint.initial(), logics: blueprint.logics })` + `blueprint.controller.make(runtime)`。
- `useField` 只做 selector 投影 + DOM 事件适配；`state.ui` 与 scoped validate 仍由 TraitLifecycle/默认 logics 维护。

### 0.3 AppRuntime（全局模块）：像普通模块一样 imports（可选）

```ts
const RootImpl = Root.implement({
  initial: { /* ... */ },
  imports: [EmailForm.impl],
})
```

> 如果 traits 使用了 `source`（异步资源），对应的 `ResourceSpec` 需要在 runtime scope 内注册（`Resource.layer([...])`）；可放在 RootImpl.layer 或 `Logix.Runtime.make(..., { layer })` 的 layer 合并里。

后续章节的“场景 1/2/3”主要聚焦在 **traits 写法**（computed/source/check/list scope 等）；但把它们装配进项目的方式，都遵循本节的 Blueprint → ModuleImpl → Runtime 的主线。

## 1. 场景 1：订单行列表 + 前后行依赖

**业务描述**

- 用户在订单编辑页维护多行明细 `items[]`，每行包含：订单号 `orderNo`、供应商编码 `supplierCode`、金额 `amount`；
- 需要规则：
  - R1：当前行 `orderNo` 不能小于上一行 `orderNo`；
  - R2：当 `supplierCode` 不为空时，本行 `amount` 必须大于 1000；
- 增删 / 重排后规则语义保持稳定，错误准确落到对应行控件。

**推荐写法：StateTrait.list（kernel）**

```ts
import { StateTrait } from "@logix/core"
import * as Form from "@logix/form"
import { Schema } from "effect"

interface OrderItem {
  orderNo: number
  supplierCode: string | null
  amount: number
}

interface OrderFormState {
  items: OrderItem[]
  errors?: {
    // 数组字段错误节点就是数组本身（可附带 $list）
    items?: (Array<{
      orderNo?: string
      amount?: string
      $item?: string
    } | undefined> & { $list?: string })
  }
  // 表单交互态（全双工可回放）：由 @logix/form 维护（示意）
  ui?: unknown
}

const OrderFormStateSchema = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      orderNo: Schema.Number,
      supplierCode: Schema.NullOr(Schema.String),
      amount: Schema.Number,
    }),
  ),
  errors: Schema.optional(Schema.Any),
})

export const OrderTraits = StateTrait.from(OrderFormStateSchema)({
  items: StateTrait.list<OrderFormState, OrderItem>({
    item: StateTrait.node({
      // 行内校验（R2）
      check: {
        amountWithSupplier: (item) => {
          if (item.supplierCode && item.amount <= 1000) {
            return Form.Error.item(
              { amount: "当选择供应商时，金额必须大于 1000" },
              { item: "本行校验失败" },
            )
          }
          return undefined
        },
      },
    }),

    list: StateTrait.node({
      // 列表级校验（R1：orderNo 单调递增）
      check: {
        nonDecreasingOrderNo: (items) => {
          const rowErrors = items.map(() => undefined as { orderNo?: string } | undefined)

          for (let i = 1; i < items.length; i++) {
            if (items[i]!.orderNo < items[i - 1]!.orderNo) {
              rowErrors[i] = { orderNo: "orderNo 不能小于上一行" }
            }
          }

          return rowErrors.some(Boolean)
            ? Form.Error.list(rowErrors, { list: "orderNo 必须单调递增" })
            : undefined
        },
      },
    }),
  }),
})
```

**可选：使用 Rules 语法糖**

在真实项目中，可以用 `Form.Rule.make` 组合常用校验规则，再挂到 kernel 的 `check` 槽位上：

```ts
import { StateTrait } from "@logix/core"
import * as Form from "@logix/form"

const orderItemCheck = Form.Rule.make<OrderItem>({
  validate: {
    amountWithSupplier: (item) =>
      item.supplierCode && item.amount <= 1000
        ? "当选择供应商时，金额必须大于 1000"
        : undefined,
  },
})

const orderListCheck = Form.Rule.make<ReadonlyArray<OrderItem>>({
  validate: {
    nonDecreasingOrderNo: (items) => {
      const rowErrors = items.map(() => undefined as { orderNo?: string } | undefined)
      for (let i = 1; i < items.length; i++) {
        if (items[i]!.orderNo < items[i - 1]!.orderNo) {
          rowErrors[i] = { orderNo: "orderNo 不能小于上一行" }
        }
      }
      return rowErrors.some(Boolean)
        ? Form.Error.list(rowErrors, { list: "orderNo 必须单调递增" })
        : undefined
    },
  },
})

export const OrderTraitsWithRules = StateTrait.from(OrderFormStateSchema)({
  items: StateTrait.list<OrderFormState, OrderItem>({
    item: StateTrait.node({ check: orderItemCheck }),
    list: StateTrait.node({ check: orderListCheck }),
  }),
})
```

---

## 2. 场景 2：语言选择规则（「无」选项联动）

**业务描述**

字段 `languages[]`，每行有：

- `type`: 语言类型（英语 / 日语 / 无）；
- `level`: 语言等级；
- `score`: 语言分数；

规则：

- R1：语言数量大于 1 条时，不展示「无」选项；
- R2：选择「无」后不能新增其他语言（隐藏新增按钮）；
- R3：选择了其他语言后不能再选「无」；
- R4：当语言类型为「无」时，隐藏 `level/score`。

**kernel 写法：meta 用字段级 computed，行内用 list.item.node**

```ts
import { StateTrait } from "@logix/core"
import { Schema } from "effect"

interface LanguageItem {
  type: "英语" | "日语" | "无" | string
  level?: string
  score?: number
  ui: {
    hideLevelAndScore: boolean
  }
}

interface LanguageFormMeta {
  canAddLanguage: boolean
  languageTypeOptions: string[]
}

interface LanguageFormState {
  languages: LanguageItem[]
  meta: LanguageFormMeta
}

const LanguageFormStateSchema = Schema.Struct({
  languages: Schema.Array(
    Schema.Struct({
      type: Schema.String,
      level: Schema.optional(Schema.String),
      score: Schema.optional(Schema.Number),
      ui: Schema.Struct({
        hideLevelAndScore: Schema.Boolean,
      }),
    }),
  ),
  meta: Schema.Struct({
    canAddLanguage: Schema.Boolean,
    languageTypeOptions: Schema.Array(Schema.String),
  }),
})

export const LanguageTraits = StateTrait.from(LanguageFormStateSchema)({
  // 列表级 meta：写在独立字段上（不在 list 内做 patch）
  "meta.canAddLanguage": StateTrait.computed({
    deps: ["languages"],
    get: (languages) => {
      const hasNone = languages.some((i) => i.type === "无")
      const count = languages.length
      const maxLanguageCount = 5
      return !hasNone && count < maxLanguageCount // R2
    },
  }),

  "meta.languageTypeOptions": StateTrait.computed({
    deps: ["languages"],
    get: (languages) => {
      const hasNone = languages.some((i) => i.type === "无")
      const count = languages.length
      const allLanguageTypes = ["英语", "日语", "无"]

      // R1 + R3
      return hasNone || count > 1
        ? allLanguageTypes.filter((t) => t !== "无")
        : allLanguageTypes
    },
  }),

  // 行内隐藏字段：写回到每行的 ui 字段（不依赖外部 UI runner）
  languages: StateTrait.list<LanguageFormState, LanguageItem>({
    item: StateTrait.node({
      computed: {
        "ui.hideLevelAndScore": StateTrait.computed({
          deps: ["type"],
          get: (type) => type === "无", // R4
        }),
      },
    }),
  }),
})
```

UI 层只需读取：

- `meta.canAddLanguage`（是否展示“新增语言”按钮）；
- `meta.languageTypeOptions`（下拉选项过滤）；
- `languages[i].ui.hideLevelAndScore`（隐藏/展示行内字段）；

联动逻辑全部集中在 Traits 中。

---

## 3. 场景 3：合同选择 + 供应商异步约束

**业务描述**

- 选择「合同」后自动带出「供应商编码」并禁用手动修改；  
- 选择供应商编码后，异步拉取供应商信息，约束：
  - 「费用网点」下拉；
  - 「采购品类」下拉；
- 该场景常与列表表单组合（多行合同明细）。

**kernel 写法：list.item.node.source + computed**

```ts
import { Resource, StateTrait } from "@logix/core"
import { Effect, Schema } from "effect"

interface SupplierInfo {
  allowedFeeSites: string[]
  allowedCategories: string[]
}

type ResourceSnapshot<Key, Out, Err = unknown> =
  | { status: "idle" }
  | { status: "loading"; key: Key }
  | { status: "success"; key: Key; data: Out }
  | { status: "error"; key: Key; error: Err }

interface ContractLine {
  contractId: string | null
  supplierCode: string | null
  feeSite: string | null
  category: string | null

  // 由 source 写回的远程快照（ResourceSnapshot）
  supplierInfo?: ResourceSnapshot<{ supplierCode: string }, SupplierInfo>

  // 由 computed 派生的视图辅助字段
  feeSiteOptions: string[]
  categoryOptions: string[]
  supplierCodeDisabled: boolean
}

interface ContractFormState {
  items: ContractLine[]
  errors?: {
    items?: Array<{ supplierCode?: string }>
  }
}

// 资源 id 常量（纯数据：供 Traits/Devtools/生成使用；不承载 load 实现）
const SupplierInfoResource = {
  id: "SupplierInfo",
  meta: {
    label: "供应商信息",
    tags: ["form", "vendor"],
  },
} as const

// 供应商信息资源（统一定义在 Resource 体系中）
const SupplierInfoSpec = Resource.make({
  id: SupplierInfoResource.id,
  keySchema: Schema.Struct({ supplierCode: Schema.String }),
  load: (key: { supplierCode: string }) =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`/api/suppliers/${key.supplierCode}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as SupplierInfo
      },
      catch: (e) => e,
    }),
})

const ContractFormStateSchema = Schema.Struct({
  items: Schema.Array(Schema.Any),
  errors: Schema.optional(Schema.Any),
})

export const ContractTraits = StateTrait.from(ContractFormStateSchema)({
  items: StateTrait.list<ContractFormState, ContractLine>({
	    item: StateTrait.node({
	      // 1) 同步联动 + 远程结果派生（纯派生：每个字段各自产值）
		      computed: {
		        supplierCodeDisabled: StateTrait.computed({
		          deps: ["contractId"],
		          get: (contractId) => !!contractId,
		        }),

		        // 合同 -> 供应商编码（禁用时强制回填；否则保持用户输入）
		        supplierCode: StateTrait.computed({
		          deps: ["contractId", "supplierCode"],
		          get: (contractId, supplierCode) =>
		            contractId ? deriveSupplierCodeFromContract(contractId) : supplierCode,
		        }),

		        // supplierInfo -> options
		        feeSiteOptions: StateTrait.computed({
		          deps: ["supplierInfo"],
		          get: (supplierInfo) => {
		            const snap = supplierInfo
		            const info = snap && snap.status === "success" ? snap.data : undefined
		            return info ? info.allowedFeeSites : []
		          },
		        }),
		        categoryOptions: StateTrait.computed({
		          deps: ["supplierInfo"],
		          get: (supplierInfo) => {
		            const snap = supplierInfo
		            const info = snap && snap.status === "success" ? snap.data : undefined
		            return info ? info.allowedCategories : []
		          },
		        }),
		      },

	      // 2) 异步资源依赖：供应商编码 -> supplierInfo（写回 ResourceSnapshot）
		      source: {
		        supplierInfo: {
		          deps: ["supplierCode"],
		          resource: SupplierInfoResource,
		          triggers: ["onMount", "onKeyChange"],
		          debounceMs: 300,
		          // 默认 switch：以“最新 key”为准（尽量取消旧 in-flight，且无论是否可取消都必须丢弃 stale）。
		          // 若该资源请求成本高/需限流，可改用 exhaust：in-flight 期间合并触发，结束后补一次最新 key 的刷新。
		          concurrency: "switch",
		          key: (supplierCode) => (supplierCode ? { supplierCode } : undefined),
	        },
	      },

      // 3) （可选）基于资源结果派生错误
      check: {
        supplierInfoFailed: (row) => {
          if (row.supplierCode && row.supplierInfo?.status === "error") {
            return { supplierCode: "获取供应商信息失败" }
          }
          return undefined
        },
      },
    }),
  }),
})

function deriveSupplierCodeFromContract(contractId: string): string {
  // 真实项目中可通过 ctx.env / Resource 做映射，此处仅示意
  return contractId.slice(0, 8)
}
```

要点：

- 远程依赖只通过 `source` 声明 resourceId + key；  
- 对资源结果的 UI 影响只在 `computed/check` 中做纯派生；  
- 真实 IO 只在 `SupplierInfoSpec.load` 内部发生，由 Runtime/Middleware 统一调度。
- 当供应商编码高频变化导致请求乱序返回时，Runtime 会基于 `keySchema normalize + keyHash` 门控丢弃 stale 结果，避免旧 key 覆盖新 key。

---

## 4. 与 RHF 的映射心智（能力 ≥，路径不要求一致）

本 spec 的对齐目标是“**表达能力与错误模型 ≥ RHF**”，不是字符串路径 1:1 兼容。

示意表（概念）：

| 维度 | RHF 写法示例 | StateTrait 写法（概念） |
|------|--------------|-------------------------|
| 字段注册 | `register('items.0.amount')` | `StateTrait.list({ item: StateTrait.node({ ... }) })` 中直接访问 `row.amount` |
| 行级错误 | `errors.items?.[i]?.amount` | `list.item.node.check(row)` 写出 `errors.items[i].amount` 形状的错误 |
| 列表级错误 | `errors.items?.root` | `list.list.node.check(rows)` 写出 `errors.items.$list`（或等价节点） |
| 依赖上一行 | `validate` 中 `getValues()` | `list.list.node.check(rows)` 顺序遍历 `rows[i-1]` |
| 异步约束 | `setError/clearErrors` + 自管缓存 | `source + computed/check` + Resource/Query 统一接管 |

迁移时只需遵循「写法映射规则」，不强求无缝自动迁移。

---

## 5. Schema / transformer 集成示意（概念）

当 FormView 与后端字段名不一致时，推荐通过 effect/Schema 的 transform 建立双向边界：

```ts
import { Schema, Effect } from "effect"

const FormOrderItemSchema = Schema.Struct({
  supplierCode: Schema.String,
  amount: Schema.Number,
})

const DomainOrderItemSchema = Schema.Struct({
  supplier_code: Schema.String,
  amount: Schema.Number,
})

const FormToDomainOrderItem = Schema.transform(FormOrderItemSchema, DomainOrderItemSchema, {
  decode: (form) => ({
    supplier_code: form.supplierCode,
    amount: form.amount,
  }),
  encode: (domain) => ({
    supplierCode: domain.supplier_code,
    amount: domain.amount,
  }),
})

// 提交前：
// const domainInput = yield* Schema.decode(FormToDomainOrderItem)(formItem)
// 回填时：
// const formView = yield* Schema.encode(FormToDomainOrderItem)(domainItem)
```

提交期（边界）校验建议同样放在 Schema decode 中，并把 decode 失败映射回同一套 ErrorTree（写回 `state.errors`），避免出现第二套错误来源：

```ts
import { Effect, Schema } from "effect"
import * as Form from "@logix/form"

// 提交时：FormView -> 后端模型
const submit = (formItem: unknown) =>
  Effect.gen(function* () {
    const domainInput = yield* Schema.decode(FormToDomainOrderItem)(formItem)
    return domainInput
  }).pipe(
    // 示例：把 Schema 错误映射为 ErrorTree（最终写回 state.errors）
    Effect.catchAll((schemaError) =>
      Effect.fail(Form.Error.fromSchemaError(schemaError)),
    ),
  )
```

Traits / Rules 只面对 FormView 字段名；字段名映射与深度业务校验由 Schema/transformer 在边界统一处理。

---

## 6. 与 Module / Logic 的集成示意（概念）

Form 场景的 Traits 仍然是 Module 图纸 traits 槽位的一部分：

```ts
import { Module, StateTrait } from "@logix/core"
import { Schema } from "effect"

const OrderFormStateSchema = Schema.Struct({
  items: Schema.Array(Schema.Any),
  errors: Schema.optional(Schema.Any),
})

const OrderTraits = StateTrait.from(OrderFormStateSchema)({
  items: StateTrait.list({
    item: StateTrait.node({ /* computed/source/link/check */ }),
    list: StateTrait.node({ /* computed/source/link/check */ }),
  }),
})

export const OrderModule = Module.make("OrderModule", {
  state: OrderFormStateSchema,
  actions: {},
  traits: OrderTraits,
})
```

心智：

- Module/Runtime 只有一条主线（StateTrait → Txn/EffectOp/Resource）；  
- Form 相关能力只是 traits 中的一类领域用法；  
- 可选的 `Form.traits / Form.Rule` 只是提升可读性，输出仍是等价的 kernel 结构。

---

## 7. `state.ui` + scoped validate（更贴近真实的最小片段）

> 目标：把 touched/dirty 等交互态纳入全双工链路，并展示“按目标局部校验”的调用方式（对齐本 spec 的 FieldRef/ValidateRequest 心智）。
>
> 说明：以下代码按本 spec 的规划给出“真实项目会怎么写”的代码形状：**动作（Action）是 UI→Runtime 的唯一入口**，TraitLifecycle 负责把动作桥接为 `state.ui` 与 scoped validate（写回 `state.errors`）。

```ts
import { Module, StateTrait, TraitLifecycle } from "@logix/core"
import * as Form from "@logix/form"
import { Schema } from "effect"

interface State {
  profile: { email: string }
  errors: { profile: { email?: string } }
  ui: {
    touched: { profile: { email?: boolean } }
    dirty: { profile: { email?: boolean } }
    submitCount: number
  }
}

/**
 * 可序列化 FieldRef（用于 onChange/onBlur/unregister/scroll-to-error 等）。
 * - path 为“目标字段路径”（root/field 都可表达）；数组定位由 listIndexPath 承载。
 */
type FieldRef<S> =
  | { readonly kind: "root" }
  | {
      readonly kind: "field"
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
    }

const FieldRefSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("root") }),
  Schema.Struct({
    kind: Schema.Literal("field"),
    path: Schema.String,
    listIndexPath: Schema.optional(Schema.Array(Schema.Number)),
  }),
)

const ValidateModeSchema = Schema.Union(
  Schema.Literal("submit"),
  Schema.Literal("blur"),
  Schema.Literal("valueChange"),
  Schema.Literal("manual"),
)

const StateSchema = Schema.Struct({
  profile: Schema.Struct({ email: Schema.String }),
  errors: Schema.Struct({
    profile: Schema.Struct({
      email: Schema.optional(Schema.String),
    }),
  }),
  ui: Schema.Struct({
    touched: Schema.Struct({
      profile: Schema.Struct({
        email: Schema.optional(Schema.Boolean),
      }),
    }),
    dirty: Schema.Struct({
      profile: Schema.Struct({
        email: Schema.optional(Schema.Boolean),
      }),
    }),
    submitCount: Schema.Number,
  }),
})

const Traits = StateTrait.from(StateSchema)({
  "profile.email": StateTrait.node({
    check: {
      required: (email) => (email ? undefined : "必填"),
      format: (email) => (/^\\S+@\\S+$/.test(email) ? undefined : "邮箱格式不正确"),
    },
  }),
})

export const FormModule = Module.make("FormModule", {
  state: StateSchema,
  actions: {
    // 领域动作：TraitLifecycle.install 监听并桥接为 state.ui + scoped validate（写回 state.errors）
    "form/valueChange": Schema.Struct({
      target: FieldRefSchema, // FieldRef<State>
      value: Schema.Unknown,
    }),
    "form/blur": Schema.Struct({
      target: FieldRefSchema, // FieldRef<State>
    }),
    "form/validate": Schema.Struct({
      mode: ValidateModeSchema,
      target: FieldRefSchema, // FieldRef<State>
    }),
    "form/unregister": Schema.Struct({
      target: FieldRefSchema, // FieldRef<State>
    }),
  },
  traits: Traits,
})

// 在 ModuleImpl 上安装 Trait 生命周期桥接（Form 只是领域包：可选择性 re-export）
const TraitBridgeLogic = TraitLifecycle.install(FormModule, {
  uiPath: "ui",
  errorsPath: "errors",
})

export const FormModuleImpl = FormModule.implement({
  initial: {
    profile: { email: "" },
    errors: { profile: {} },
    ui: { touched: { profile: {} }, dirty: { profile: {} }, submitCount: 0 },
  },
  logics: [
    // 1) 维护 state.ui：touched/dirty/submitCount（全双工可回放）
    // 2) 执行 scoped validate：把 check 输出写回 state.errors
    // 3) 执行 unregister 清理：errors/ui/source snapshot 都要回收
    TraitBridgeLogic,
  ],
})

// UI 层（React/其他）在 input 事件里只 dispatch 领域动作：
//
// const emailRef = Form.Ref.field<State>("profile.email")
// dispatch({ _tag: "form/valueChange", payload: { target: emailRef, value: next } })
// dispatch({ _tag: "form/blur", payload: { target: emailRef } })
//
// submit 时：
// dispatch({ _tag: "form/validate", payload: { mode: "submit", target: Form.Ref.root<State>() } })
```

要点：

- `state.ui` 是事实源：touched/dirty/submitCount 都是可回放状态；  
- validate 是显式动作：blur 局部、submit 全量；具体执行范围由 Graph/Plan 推导；  
- 规则写法仍然只依赖 traits 的 `check`（写 `state.errors`），不在 UI 层手动 setError/clearError。
