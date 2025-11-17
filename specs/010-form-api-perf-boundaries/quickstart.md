# Quickstart: 010 Form API（设计收敛与性能边界）

本 quickstart 用 `case11-dynamic-list-cascading-exclusion` 的“仓库跨行互斥（uniqueWarehouse）”演示如何用 list-scope Rule 一次扫描产出一致错误，并删除 `listValidateOnChange` 开关。

> 注意：本文档同时记录「终态 DX 目标」与「当前 worktree 已实现基线」。
> - 当前 `@logix/form` 的主入口仍是 `Form.make({ values, initialValues, validateOn, reValidateOn, debounceMs, traits })`（直接声明 traits/StateTraitSpec）。
> - 早期草案提过 `rules/fieldArrays` 作为更高层配置入口；当前实现已把它们收敛为 `traits`（非数组字段 `traits.<path>.check`；数组字段 `traits.<listPath> = { identityHint, item, list }`），不再需要额外 `fieldArrays/Form.fieldArray`。

## 0) 终态 DX（一眼看完）

当 010 全部落实后，业务侧的默认体验应满足：

- **字段绑定极简且强类型**：`useField(form, "userList.0.warehouseId")` 返回 `{ value, error, touched, dirty, onChange, onBlur }`，且 `value/error` 类型可推导（不再 `unknown`）；`dirty` 默认采用 persistent dirty（一次 dirty 直到 `reset()`）。
- **FieldArray 稳定 rowId**：`useFieldArray(form, "userList").fields[i].id` 与 runtime rowId 对齐，增删/重排不漂移；错误与 UI 状态跟随 rowId 而不是 index。
- **跨行规则是一等公民**：跨行互斥/唯一性通过在 `traits` 的数组字段上声明 list 结构（`identityHint.trackBy` + `item.check/list.check`）来完成；一次扫描、多行写回、所有冲突行都标错；不允许 UI 手写全表扫描。
- **触发语义完全自动**：删除 `listValidateOnChange`；触发范围只由 deps/IR 推导（对齐 009 的 patch/dirty-set），结构变更（insert/remove/reorder）也会触发跨行规则刷新。
- **联动/派生也是一等公民**：级联清理、字段联动、可选项派生等必须以 `computed/link` 这类“事务内派生收敛”表达（产出 patch/dirty-set，可回放可解释），禁止在 UI 里串多个 `setValue` 手写联动；并且业务侧应只用 `@logix/form` 的领域包装来声明这些能力（保持可降解，不直接写 `@logix/core` 的 StateTrait）。
- **提交/校验/重置有默认语义**：提供 `validate/reset/handleSubmit`（事务内无 IO；IO 必须通过 Task/事务外）；Schema/Rules 的错误写回与清理语义统一。
- **可解释且可回放**：当 `Diagnostics Level=light|full` 时，每次校验输出 Slim 可序列化 `trait:check` 事件（复用 009 DynamicTrace；`off` 不产出），支持 Devtools/平台解释“哪个规则、因何触发、影响了哪些行”。

## 0.1) 当前 worktree 基线（可运行）

- 可运行示例：`/Users/yoyo/Documents/code/personal/intent-flow/examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- 最小心智模型：用 `Logix.StateTrait.list(...).list.check` 声明 list-scope 规则；用 `validateOn/reValidateOn` 控制默认自动校验阶段；用 rule 级 `validateOn` 精确放行/禁用 onChange/onBlur。

## 1) 业务写法（对齐当前实现）

关键约束：

- 非数组字段规则挂在 `traits.<path>.check`（跨字段校验也建议锚定到“要展示错误的字段”上）。
- 行内规则挂在 `traits.<listPath>.item.check`（只看当前行，不扫全表）。
- 跨行规则挂在 `traits.<listPath>.list.check`（输入整列，一次扫描，多行写回）。
- `values` 与 `initialValues` 只描述“值树”（不含 `errors/ui`）。
- 数组字段的“列表语义”（rowId/结构触发/校验 scope）通过 list trait 结构显式声明：`traits.<listPath> = { identityHint, item, list }`；`useFieldArray(form, listPath)` 负责派发 `arrayAppend/Remove/...` 等动作与生成稳定 `fields[i].id`。
- 联动/派生（`computed/link`）仍属于 Form 的核心能力：业务侧不应直接写 StateTraitSpec，而应通过 Form 领域层的包装入口声明（下文给出终态写法与其降解后的 Trait IR 形态）。

示意（终态推荐：业务侧只写 `Form.make` 的领域配置；`Form.make` 内部会把它编译为 StateTraitSpec/IR）：

```ts
import * as Form from "@logix/form"
import { Schema } from 'effect'

const ValuesSchema = Schema.Struct({
  isDraft: Schema.Boolean,
  title: Schema.String,
  userList: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      country: Schema.String,
      province: Schema.String,
      city: Schema.String,
      warehouseId: Schema.String,
    }),
  ),
})

type Values = Schema.Schema.Type<typeof ValuesSchema>
type Row = Values['userList'][number]

// 内置校验器（对标 RHF rules）：返回 `ErrorValue | undefined` 的纯函数（ErrorValue 需 Slim，JSON 序列化后 ≤256B），可直接复用在 validate 中
// 也支持 RHF 风格简写：在规则声明里写 required:true / minLength:2 / pattern:/.../（见 1.1-D）
const requiredTitle = Form.Rule.required({ message: '请输入标题', trim: true })
const requiredProvince = Form.Rule.required({ message: '请选择省/州', trim: true })
const requiredCity = Form.Rule.required({ message: '请选择城市', trim: true })
const requiredWarehouse = Form.Rule.required({ message: '请选择仓库', trim: true })

const titleRules = {
  deps: ['isDraft'],
  validateOn: ['onBlur'],
  validate: {
    requiredWhenNotDraft: (value, ctx) => {
      const isDraft = Boolean((ctx.state as any).isDraft)
      if (isDraft) return undefined
      return requiredTitle(value)
    },
  },
}

const listRules = {
  // 语义：userList[].warehouseId（build 阶段归一化 + 补齐结构依赖）
  deps: ['warehouseId'],
  validateOn: ['onChange'],
  validate: {
    uniqueWarehouse: (rows, ctx) => {
      const rowList: ReadonlyArray<Row> = Array.isArray(rows) ? rows : []
      const indicesByValue = new Map<string, Array<number>>()
      for (let i = 0; i < rowList.length; i++) {
        const v = String(rowList[i]?.warehouseId ?? '').trim()
        if (!v) continue // 空值不参与冲突检测
        const bucket = indicesByValue.get(v) ?? []
        bucket.push(i)
        indicesByValue.set(v, bucket)
      }

      const rowErrors = rowList.map(() => undefined as any)
      for (const dupIndices of indicesByValue.values()) {
        if (dupIndices.length <= 1) continue
        for (const i of dupIndices) {
          rowErrors[i] = { warehouseId: '仓库选择需跨行互斥（当前重复）' }
        }
      }

      return rowErrors.some(Boolean) ? Form.Error.list(rowErrors) : undefined
    },
  },
}

const rowRules = {
  deps: ['country', 'province', 'city', 'warehouseId'],
  validateOn: ['onBlur'],
  validate: {
    requiredFields: (row) => {
      const errors: Record<string, unknown> = {}
      const provinceError = requiredProvince(row?.province)
      if (provinceError) errors.province = provinceError
      const cityError = requiredCity(row?.city)
      if (cityError) errors.city = cityError
      const warehouseError = requiredWarehouse(row?.warehouseId)
      if (warehouseError) errors.warehouseId = warehouseError
      return Object.keys(errors).length ? errors : undefined
    },
  },
}

const listPath = 'userList' as const

export const DemoForm = Form.make('DemoForm', {
  values: ValuesSchema,
  // 两阶段触发（对标 RHF mode/reValidateMode）：
  // - submitCount===0：effectiveValidateOn = validateOn（默认 ["onSubmit"]）
  // - submitCount>0：effectiveValidateOn = reValidateOn（默认 ["onChange"]）
  // 不写 rule.validateOn 的规则，会继承当前阶段的 effectiveValidateOn
  validateOn: ['onChange'],
  initialValues: { isDraft: false, title: '', userList: [] },

  traits: Form.traits(ValuesSchema)({
    title: {
      check: Form.Rule.make(titleRules),
    },
    [listPath]: {
      identityHint: { trackBy: "id" },
      list: { check: Form.Rule.make(listRules) },
      item: { check: Form.Rule.make(rowRules) },
    },
  }),
})
```

### 1.0（内部视角）如何降解到 Trait IR

上面的 `traits`（经 `Form.traits` 归一化）会落成可直接挂到 Module.traits 的 StateTraitSpec（仅用于说明）：

```ts
traits: {
  // (提案) 联动/派生仍可完全降解为 trait 的 computed/link（但业务侧不直接写 StateTrait）
  "ui.userList.usedWarehouseIds": Form.Trait.computed({
    deps: ["userList"],
    get: (userList) =>
      Array.from(
        new Set(
          (Array.isArray(userList) ? userList : [])
            .map((r: any) => String(r?.warehouseId ?? "").trim())
            .filter(Boolean),
        ),
      ),
  }),
  title: { check: Form.Rule.make(titleRules) },
  [listPath]: {
    identityHint: { trackBy: "id" },
    list: { check: Form.Rule.make(listRules) },
    item: { check: Form.Rule.make(rowRules) },
  },
}
```

### 1.1 Rule 声明（直写 / 复用）

默认写法推荐“直写形态”：直接在 `traits.<path>.check`（含 list 的 `item.check/list.check`）里用对象声明规则。
`Form.Rule.make/merge` 是可选的“复用/组合工具”，用于把常用规则库提取出来复用，并在合并时对重复 ruleName 稳定失败。

无论你用哪种形态声明，rule 都不会被手动调用：它会在 `Form.install` 触发 scoped validate（`setValue/blur/submit`）时被 runtime 执行；你只负责声明规则（挂在 `check`）与显式 deps。

规则函数的 `ctx` 只提供最小必要上下文：

- `ctx.state`：只读的 FormState 快照（values + errors/ui/$form；跨字段分支通过读取 `ctx.state.<field>`）
- `ctx.mode`：本次校验阶段（`submit|blur|valueChange|manual`）
- `ctx.scope`：scope 信息（例如 `{ fieldPath }` / `{ fieldPath, listPath, index }`）

Form 的自动校验触发策略是两阶段的（对标 RHF）：

- `validateOn`：首提前的触发点（默认 `["onSubmit"]`）
- `reValidateOn`：首提后的触发点（默认 `["onChange"]`；可选改为 `["onBlur"]`）

可选：你可以为规则声明 rule 级 `validateOn`（自动校验阶段白名单），用来表达“某字段只在 onBlur 出错、某规则不参与 onChange/onBlur（仅提交/手动时运行）”这类常见需求（不必在 `validate(...)` 里手动写 `if (ctx.mode===...)`）。当一次 scoped validate 由 onChange/onBlur 触发时，若当前阶段不在该 rule 的 `validateOn` 内，则该 rule 应被跳过执行（submit/root validate 不受 `validateOn` 影响，仍会运行）。

> 关键点：`validateOn/reValidateOn` 只决定“默认规则在高频交互阶段怎么跑”，不应该迫使你把整个表单把 `validateOn` 写成 `["onChange","onBlur"]`。如果某条 rule 显式声明了 `validateOn:["onBlur"]`，Form 的 wiring 应能在 blur 时只运行这些规则（而不是全表 blur validate）。

**A) 直写：组级 deps + 具名 validate（推荐默认）**

```ts
const rules = {
  // deps 在 item/list scope 都是“相对路径”：
  // - item scope：相对当前行（例如 "warehouseId"）
  // - list scope：相对“行元素”（语义为 userList[].warehouseId）
  deps: ['warehouseId'],
  validate: {
    uniqueWarehouse: (input, ctx) => undefined,
    nonEmpty: (input, ctx) => undefined,
  },
}
```

**B) 复用：单条规则覆盖 deps / 携带 meta（用于诊断展示）**

```ts
const rules = Form.Rule.make<Row>({
  deps: ['a'],
  validate: {
    r1: (row, ctx) => undefined,
    r2: { deps: ['b'], validate: (row, ctx) => undefined, meta: { label: '更精确的依赖' } },
  },
})
```

**C) 复用：合并规则库（强制无重名）**

```ts
const base = Form.Rule.make<Row>({ deps: ['a'], validate: { r1: (row) => undefined } })
const extra = Form.Rule.make<Row>({ deps: ['b'], validate: { r2: (row) => undefined } })
const rules = Form.Rule.merge(base, extra)
```

**D) 内置规则简写（RHF 风格）**

当你的规则不需要上下文分支时，可以用简写减少样板；它会在 build 阶段展开为等价的内置纯函数（不改变 deps/scope 约束）：

```ts
const titleRules = {
  validateOn: ['onBlur'],
  required: { message: '请输入标题', trim: true },
  minLength: 2,
}

const codeRules = {
  required: true,
  pattern: { re: /^[A-Z0-9]+$/i, message: '仅允许字母/数字' },
}
```

**E) 规则挂载语法糖（可选）**

当表单规则很多、需要条件拼装或避免对象 spread 的静默覆盖时，可用 `Form.Rule.field/fields` 以“声明列表”的方式构造 `traits` 片段（key= valuePath）：

```ts
const emailTrait = (path = "email") =>
  Form.Rule.field(path, {
    check: Form.Rule.make({
      validateOn: ["onBlur"],
      validate: {
        format: (value) =>
          /\S+@\S+\.\S+/.test(String(value))
            ? undefined
            : Form.Error.leaf("邮箱格式不正确"),
      },
    }),
  })

const baseTraits = [
  Form.Rule.field("title", { check: Form.Rule.make(titleRules) }),
  emailTrait(),
] as const

const traits = Form.Rule.fields(baseTraits, Form.Rule.field("code", { check: Form.Rule.make(codeRules) }))
```

推荐把“通用规则包”做成可参数化的挂载函数（默认值就是常见字段名），避免把 path 写死在规则包里：

```ts
const emailTrait = (path = "email") =>
  Form.Rule.field(path, {
    check: Form.Rule.make({
      validateOn: ["onBlur"],
      validate: {
        format: (value) =>
          /\S+@\S+\.\S+/.test(String(value))
            ? undefined
            : Form.Error.leaf("邮箱格式不正确"),
      },
    }),
  })
```

### 1.2 list trait 用法（多数组字段 / deps 触发粒度）

数组字段的“列表语义”（identity/rowId、触发/写回、React FieldArray key）由 list trait 显式声明：`traits.<listPath> = { identityHint, item, list }`。

- **identity/rowId**：`identityHint.trackBy` 用于生成稳定 rowId（增删/重排不漂移）
- **触发/写回**：list/row scope 的触发粒度与错误写回形态（`$list/rows[]`）
- **React FieldArray**：`useFieldArray(form, listPath)` 会优先使用 `trackBy` 生成 `fields[i].id`，缺失时退回 runtime rowIdStore，再退回 index

**A) 一个 Form 定义多个动态数组字段**

```ts
export const DemoForm = Form.make('DemoForm', {
  values: ValuesSchema,
  validateOn: ['onChange'],
  initialValues: { userList: [], addressList: [] },
  traits: Form.traits(ValuesSchema)({
    userList: {
      identityHint: { trackBy: "id" },
      item: { check: Form.Rule.make(userRowRules) },
      list: { check: Form.Rule.make(userListRules) },
    },
    addressList: {
      identityHint: { trackBy: "id" },
      item: { check: Form.Rule.make(addressRowRules) },
    },
  }),
})
```

**B) deps 到底控制什么（结构 / 列 / 行）**

| 你关心的变化                                       | 推荐 scope | deps 写法              | 典型用途                              |
| -------------------------------------------------- | ---------- | ---------------------- | ------------------------------------- |
| append/remove/reorder（结构变化）                  | list       | `deps: []`             | 最少/最多行数、结构约束               |
| 任意行的某列变化（例如 `warehouseId`）             | list       | `deps:["warehouseId"]` | 跨行唯一性/互斥（一次扫描、多行写回） |
| 某一行内字段变化（例如 `userList[i].warehouseId`） | row        | `deps:["warehouseId"]` | 行内必填/联动（只看当前行）           |

注意：

- list-scope 的 `deps:["x"]` 语义是 `listPath[].x`，并且会自动补齐结构依赖：**insert/remove/reorder 也会触发该 list-scope Rule**（即便你只写了字段 deps）。
- “想监听整个数组任何变更”本质上是“结构变化 + 你关心的列变化”。010 不推荐隐式“全字段 wildcard deps”，避免把高频 onChange 退化成全表扫描。

示例：只关心结构（至少 1 行），写回列表级错误（`$list`）：

```ts
const listRules = Form.Rule.make<ReadonlyArray<Row>>({
  deps: [],
  validate: {
    minRows: (rows) => (rows.length ? undefined : Form.Error.list([], { list: '至少添加一行' })),
  },
})
```

### 1.3) 联动/派生（computed/link）：把“联动”从 UI 搬回 Form 领域

很多表单痛点并不是“校验”本身，而是：

- 级联清理（上游字段变化导致下游值失效，需要确定性清理）
- 字段联动（一个字段跟随另一个字段同步）
- 可选项派生（跨行互斥导致某行 options 需要禁用一部分）

在 Logix 体系里，这些都应优先落到 **事务内派生收敛**（`computed/link`）：

- 事务内同步、可回放：不会引入 UI 侧的多次写回与竞态；
- 可诊断：能输出“写回由谁触发/写回了什么”的 Slim 证据；
- 可优化：未来可结合 patch/dirty-set 做增量派生，而不是每次 UI render 扫全表。

终态目标：业务侧只 import `@logix/form`，用 Form 领域层的包装声明 `computed/link`，而不是直接写 `@logix/core` 的 `StateTrait`。

**示例：派生一份 UI 用的“已选仓库集合”，避免 UI 自己扫大树**

> 说明：这里只演示“联动/派生如何声明 + 如何降解”。是否需要进一步做增量优化由 013/014 跑道证据决定。

```ts
export const DemoForm = Form.make('DemoForm', {
  values: ValuesSchema,
  validateOn: ['onChange'],
  initialValues: { isDraft: false, title: '', userList: [] },

  traits: Form.traits(ValuesSchema)({
    title: { check: Form.Rule.make(titleRules) },
    userList: {
      identityHint: { trackBy: "id" },
      list: { check: Form.Rule.make(listRules) },
      item: { check: Form.Rule.make(rowRules) },
    },
  }),

  // (提案) derived：Form 领域层声明 computed/link 的入口（只写 values/ui，不写 errors）
  derived: {
    'ui.userList.usedWarehouseIds': Form.Trait.computed({
      // deps 是唯一依赖事实源；这里用粗粒度依赖（整列）覆盖派生读取
      deps: ['userList'],
      get: (userList) =>
        Array.from(
          new Set(
            (Array.isArray(userList) ? userList : [])
              .map((r: any) => String(r?.warehouseId ?? '').trim())
              .filter(Boolean),
          ),
        ),
    }),
  },
})
```

约束（终态）：

- `computed/link` 必须纯同步、无 IO；需要 IO（例如异步 options）应走 `source/Task`（事务外）再写回。
- 消费 Query/外部快照时，010 先只支持在本模块通过 `source` 写回到本表单 `ui.*`（或显式槽位），再用 `computed` 以 local deps 读取；跨模块显式投影与跨模块缓存/in-flight 去重后置；禁止在 `get` 内读全局 store/隐式 Context。
- `derived` 的写回点必须可预测且可证明清理；默认不允许写 `errors`（错误仍由 `rules/schema/$manual` 管）。

**示例：字段联动（link），避免在 UI 里“改 A 再手动 setValue 改 B”**

```ts
const ValuesSchema2 = Schema.Struct({
  profile: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    fullName: Schema.String,
  }),
  shipping: Schema.Struct({
    recipientName: Schema.String,
  }),
})

export const DemoForm2 = Form.make('DemoForm2', {
  values: ValuesSchema2,
  validateOn: ['onChange'],
  initialValues: {
    profile: { firstName: '', lastName: '', fullName: '' },
    shipping: { recipientName: '' },
  },
  derived: {
    'profile.fullName': Form.Trait.computed({
      deps: ['profile.firstName', 'profile.lastName'],
      get: (firstName, lastName) => `${firstName} ${lastName}`.trim(),
    }),
    'shipping.recipientName': Form.Trait.link({
      from: 'profile.fullName',
    }),
  },
})
```

## 2) 错误树结构（写回结果）

listPath 为 `userList` 时：

- `state.errors.title`：非数组字段错误（示例：标题必填）
- `$list` 是“列表节点自身的错误槽位”（`$` 前缀为保留键）；业务侧通过 `Form.Error.list(rows, { list })` 生成，不需要直接写 `$list`。
- `state.errors.userList.$list`：列表级错误（可选）
- `state.errors.userList.rows[i].warehouseId`：第 i 行的字段错误
- `state.errors.userList.rows[i].$rowId`：稳定行锚点（可选，用于诊断/回放/重排对齐）
- Rule 返回值必须“对齐 scope”而不是返回任意 path-map：`rowRules` 返回行内 patch（例如 `{ warehouseId: "..." }` 或 `{ "address.city": "..." }` 这种“行内相对 valuePath”）；`listRules` 返回 `Form.Error.list(rows, { list? })`；命令式 `form.controller.setError("userList.3.warehouseId", ...)` 属于 controller API（RHF 风格），不是规则函数的返回形态。

## 3) 触发与一致性

- `Form.install` 不再需要 `listValidateOnChange`；
- 当用户修改任意一行 `userList[i].warehouseId`，list-scope Rule 仍会在同一事务内得到一致结果，并写回所有受影响行的错误（所有冲突行均标错）。

## 4) React 侧使用（推荐）

目标：在 UI 侧只写 valuePath（`userList.0.warehouseId`），不关心 `$list/rows[]` 的内部错误树形态；增删/重排后错误不漂移。

```tsx
import { useField, useFieldArray, useForm, useFormState } from '@logix/form/react'

function RowEditor(props: {
  readonly index: number
  readonly rowId: string
  readonly form: any
  readonly onRemove: () => void
  readonly onMoveUp: () => void
}) {
  const { form, index, onRemove, onMoveUp } = props

  const warehouse = useField(form, `userList.${index}.warehouseId`)
  const province = useField(form, `userList.${index}.province`)
  const city = useField(form, `userList.${index}.city`)

  const renderError = (e: unknown) => String((e as any)?.message ?? e ?? '')

  return (
    <div>
      <input
        value={String(province.value ?? '')}
        onChange={(e) => province.onChange(e.target.value)}
        onBlur={province.onBlur}
      />
      {province.touched && province.error ? <div>{renderError(province.error)}</div> : null}

      <input value={String(city.value ?? '')} onChange={(e) => city.onChange(e.target.value)} onBlur={city.onBlur} />
      {city.touched && city.error ? <div>{renderError(city.error)}</div> : null}

      <input
        value={String(warehouse.value ?? '')}
        onChange={(e) => warehouse.onChange(e.target.value)}
        onBlur={warehouse.onBlur}
      />
      {warehouse.error ? <div>{renderError(warehouse.error)}</div> : null}

      <button type="button" onClick={onRemove}>
        删除
      </button>
      <button type="button" disabled={index === 0} onClick={onMoveUp}>
        上移
      </button>
    </div>
  )
}

export function Demo() {
  const form = useForm(DemoForm)
  const isDraft = useField(form, 'isDraft')
  const title = useField(form, 'title')
  const userList = useFieldArray(form, 'userList')

  const canSubmit = useFormState(form, (v) => v.canSubmit)
  const isSubmitting = useFormState(form, (v) => v.isSubmitting)

  const renderError = (e: unknown) => String((e as any)?.message ?? e ?? '')

  // 终态：由 handleSubmit 统一编排 submit→validateRoot→(valid/invalid) 分支
  const onSubmit = form.controller.handleSubmit({
    onValid: (values: any) => undefined,
    onInvalid: (errors: any) => undefined,
  })

  return (
    <form onSubmit={onSubmit}>
      <label>
        <input type="checkbox" checked={Boolean(isDraft.value)} onChange={(e) => isDraft.onChange(e.target.checked)} />
        草稿
      </label>

      <input value={String(title.value ?? '')} onChange={(e) => title.onChange(e.target.value)} onBlur={title.onBlur} />
      {title.touched && title.error ? <div>{renderError(title.error)}</div> : null}

      <button
        type="button"
        onClick={() =>
          userList.append({
            id: crypto.randomUUID(),
            country: '',
            province: '',
            city: '',
            warehouseId: '',
          })
        }
      >
        添加一行
      </button>

      {userList.fields.map((row, i) => (
        <RowEditor
          key={row.id}
          rowId={row.id}
          form={form}
          index={i}
          onRemove={() => userList.remove(i)}
          onMoveUp={() => userList.swap(i, i - 1)}
        />
      ))}

      <button type="submit" disabled={!canSubmit || isSubmitting}>
        提交
      </button>
    </form>
  )
}
```

说明（终态约束）：

- `userList.fields[i].id` 必须与 runtime rowId 对齐，用作 React key；增删/重排后**错误与 UI 状态跟随 rowId**，不会漂移到错行。
- `userList.fields[i]` 仅承载 rowId 等元信息，不等价于 `values.userList[i]` 行对象；业务行字段（例如 `values.userList[i].id`）与 rowId 可能同值（trackBy=业务 id）也可能不同值（trackBy 缺失/降级），避免混用心智。
- `useField(...).error` 的读取由 Form 内部做 valuePath→errorsPath 映射；业务侧不再拼接 `errors.${path}`。
- 表单级衍生状态（例如 `canSubmit/isSubmitting`）通过 selector 订阅（`useFormState`），避免业务直接读取大 state 对象造成不必要的渲染 churn。
- `useFormState(form, selector)` 的 selector 入参是“表单视图”（最小必要衍生状态 + 引用稳定保证）；业务不应在 selector 内扫描 values/errors 大树来计算 `canSubmit` 之类结果。
- `canSubmit` 默认不与 `isDirty` 强耦合；如需“pristine 时禁用提交”，用 selector 订阅 `isPristine`（或自定义策略）在 UI 层实现。

## 5) 提交/校验/重置（终态）

目标：补齐“默认动作语义”，但仍保持 Logix 的硬约束（事务内无 IO，可回放可解释）：

统一通过 `form.controller.*` 访问默认动作语义（React 侧与 `$.use(Form.module)` 返回 handle 侧一致）；`actions.*` 视为内部实现细节。

- `form.controller.validate()`：root validate，同步写回 errors（默认运行 Rules + Schema）。
- `form.controller.validatePaths(paths)`：scoped validate（field/list/item），同步写回 errors（默认只运行 Rules，不运行 Schema/Resolver）。
- `form.controller.setError(valuePath, error)` / `form.controller.clearErrors(valuePath?)`：写入/清理命令式错误覆盖层 `errors.$manual`；读取优先级 `manual > rules > schema`；同路径 value 变更会自动清理对应 manual；`reset()` 清空全部 manual。
- `errors.$manual` 会参与 `canSubmit/isValid`（存在 manual error 时默认阻止提交），直到被 `clearErrors`/同路径 value 变更自动清理/`reset()` 清空。
- `form.controller.reset(values?)`：重置 values 并清空 errors/ui（事务写回，可回放），且不隐式触发 validate。
- `form.controller.handleSubmit({ onValid, onInvalid })`：submit → validateRoot → 根据 errors 决策；`onValid` 里的 IO 必须通过 Task/事务外执行。

### 5.1 在 Module/Logic 内触发（组件外）

当 Form 作为 Host 的 `imports` 子模块装配时，你可以在 Host 的 Logic 中通过 `$.use(DemoForm.module)` 拿到该 Form 的 ModuleHandle，并在组件外触发校验（对齐“逻辑独立于组件”的目标）。

```ts
import * as Logix from '@logix/core'
import { Effect, Schema } from 'effect'
import { DemoForm } from './DemoForm'

export const Host = Logix.Module.make('Host', {
  state: Schema.Struct({}),
  actions: {},
})

export const HostImpl = Host.implement({
  initial: {},
  imports: [DemoForm.impl],
  logics: [
    Host.logic(($) =>
      Effect.gen(function* () {
        const form = yield* $.use(DemoForm.module)

        // 相当于 RHF 的 trigger(): root validate（Rules + Schema）
        yield* form.controller.validate()

        // 相当于 RHF 的 trigger("userList.3.warehouseId"): scoped validate（Rules only）
        yield* form.controller.validatePaths(['userList.3.warehouseId'])

        const errors = yield* form.read((s) => s.errors)
        // 根据 errors / FormView 决策后续流程（终态不建议业务 deep-scan errors）
      }),
    ),
  ],
})
```

要点：

- Logic 侧只依赖 ModuleHandle 的 `read/controller`（controller 为默认动作语义入口），无需拿到 ModuleRuntime，也不需要 React。
- `validate/validatePaths` 的结果写回 Form 自身 state（errors/ui），Host 通过 `read` 决策后续流程；任何 IO 必须通过 Task/事务外完成。

## 6) Rule 与 Schema：交集与复用（终态建议）

先给一句话：**Schema 负责“值的形状/类型边界”，Rule 负责“增量触发 + list-scope 语义”**；两者都可复用到同一条 `submit/validate` 链路，但不要把跨行规则塞进 Schema。

### 6.1 交集：都是 `values -> errors`

- **共同点**：都可以被抽象成纯函数 `input -> (error | undefined)`，且最终都要落到同一份错误树（010 的 `$list/rows[]`）。
- **差异**：
  - Schema 更像 **root 级 resolver**：擅长表达结构、类型、字段级约束与少量跨字段 refine，但缺少“deps/触发范围”语义。
  - Rule 是 **运行时一等原语**：显式 deps（唯一事实源）+ scope（field/item/list/root）+ 可诊断；尤其适合 list-scope 的“一次扫描、多行写回”。

### 6.2 推荐分工（默认最省心且最优性能）

- **onChange/onBlur（高频）**：只跑 Rule（item/list），由 deps/dirty-set（对齐 009）自动收敛触发范围，避免 Schema 全量 parse 带来负优化。
- **submit/root validate（低频）**：可以跑 Schema + Rules，但要保证**单次写回**与可解释诊断；同一路径冲突时以 Rules 为准。`validatePaths(paths)` 默认只跑 Rules，避免字段级/列表级手动校验引入 Schema 全量 parse 的负优化。

### 6.3 如何复用（Phase D 设计原则）

- `Form.make({ values: ValuesSchema, ... })` 默认把 Schema 作为“root 校验源”接入 `handleSubmit/validate`，并把 issue path 映射成错误树写回。
- Schema 的 issue path 更接近 valuePath（可能含 index）；而 009 的 canonical FieldPath（用于 dirty-set/trace）不含 index，因此：
  - **错误写回**：允许用 index 定位 `rows[i]`，同时写入 `$rowId` 锚点；若缺失 `trackBy` 则输出 degraded 诊断。
  - **诊断/触发**：Trigger/path 一律使用 009 FieldPath（段数组、无 index/`[]`），行级范围用 rowId/indices 单独表达。
- 当 Schema 与 Rules 在同一叶子路径均产出错误时，最终写回以 Rules 为准（Schema 作为补充来源，不得覆盖业务语义错误；需要时可在诊断事件中保留 Schema 证据）。
