---
title: Form API Tutorial
status: living
version: 7
---

# Form API Tutorial

## 用途

- 这页用于快速过一遍 Form 当前冻结的用户视角 API
- 这页只做 walkthrough，不持有权威语义
- exact spelling 与 owner 口径统一回 [../ssot/form/13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)、[../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)、[../ssot/runtime/06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)、[../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)

## 先记一句话

当前冻结口径里，Form 只补三件事：

- 领域 DSL
- 领域默认行为
- effectful domain handle

`Program / Runtime / React host law` 继续复用 Logix 主 spine。
用户从 Form 学到的是“怎么声明输入状态语义”，不是另一套平行的 host 或 composition 模型。

这页的教学优先级固定为：

- 优先减少用户需要记住的真相数
- 不优先减少用户今天少写的样板量

## 你会接触到哪些对象

从用户视角看，当前主链只需要记住这几个对象：

- `Form.make(...)`
- returned `FormProgram`
- `FormHandle`
- core host law 里的 `useModule(...)`
- core selector law 里的 `useSelector(...)`

这里的关系是：

- `Form.make(...)` 负责声明 Form 领域语义
- returned `FormProgram` 负责进入 imports、runtime tree 和 host acquisition
- `FormHandle` 负责 effectful validate、submit、field mutation、list mutation
- React acquisition 与 pure projection 继续走 core host law

## 最小导入

```ts
import * as Form from "@logixjs/form"
import * as S from "effect/Schema"
import { fieldValue, rawFormMeta, useModule, useSelector } from "@logixjs/react"
```

day-one 用户面不再把 package-local React hook sugar 当 canonical owner。
本页只承认 canonical route，加上当前已经冻结的三项 adjunct object：

- `fieldValue(valuePath)`
- `rawFormMeta()`
- `Form.Error.field(path)`
- `Form.Companion.field(path)` / `Form.Companion.byRowId(listPath, rowId, fieldPath)`

其中：

- `fieldValue(valuePath)` 与 `rawFormMeta()` 是 `@logixjs/react` root named exports
- `Form.Error.field(path)` 是 `Form.Error` owner 下的 selector primitive
- `Form.Companion.*` 是 `Form.Companion` owner 下的 selector primitive，只经 `useSelector` 消费

field-ui 当前只冻结为 companion boundary，不冻结 exact leaf；`touched / dirty` 仍只算实现与 example 的观察值。
write-side helper、derived meta helper、list sugar 都不在当前公开 contract 内。
仓内任何 repo-local `useForm*` / list wrapper 都只算 residue，不属于 canonical 教学主线。
若后续存在官方 `@logixjs/toolkit` form wrapper，本页也不会把它当成 core truth；它只属于官方 secondary DX layer。

builtin message authoring 当前也多了一条更细的冻结口径：

- canonical day-one 继续优先零参数 builtin
- 需要精确语义时继续优先 `token(...)` override
- raw string sugar 当前已经实现，但只停在显式 `message` slot 与 `Form.Rule.make` 的 `required / email` shorthand
- `Form.Rule.required("...")`、`Form.Rule.email("...")` 这类 positional raw string 当前不在已冻结范围内

例如：

```ts
form.field("email").rule(
  Form.Rule.make({
    required: "请输入邮箱",
    email: token("profile.email.invalid"),
  }),
)
```

这条 sugar 只服务 quick authoring。
它不会改变 token-first 的主教学路径。

若未来使用内置 rule 的默认 locale catalogs，当前冻结下来的注册路径是：

- 从 `@logixjs/form/locales` 读取 plain locale assets
- 在 application bootstrap 阶段把 domain defaults 与 app overrides 合并进 driver resources
- 再把 driver 交给 `I18n.layer(driver)`

也就是说，当前不会存在：

- `I18n.registerCatalogs(...)`
- `Form.installLocales(...)`

示意写法如下：

```ts
import { I18n } from "@logixjs/i18n"
import { zhCN as formZhCN, enUS as formEnUS } from "@logixjs/form/locales"

const driver = createAppI18nDriver({
  resources: {
    en: {
      ...formEnUS,
      ...appEn,
    },
    zh: {
      ...formZhCN,
      ...appZh,
    },
  },
})

const i18nLayer = I18n.layer(driver)
```

这里的 `createAppI18nDriver(...)` 只是 app-local placeholder。
它不属于 `@logixjs/i18n` 或 `@logixjs/form` 的冻结公开 API。

这里要额外记住两条：

- cross-domain default catalogs 必须先按稳定 namespace 闭合，冲突视为 authoring error
- app overrides 继续是最终覆盖层，固定 `last-wins`

## 用 `Form.make(...)` 定义 Form

最小 authoring act 形状如下：

```ts
import * as Form from "@logixjs/form"
import * as S from "effect/Schema"

const ProfileValues = S.Struct({
  name: S.String,
  email: S.String,
})

const ProfilePayload = ProfileValues

export const ProfileForm = Form.make(
  "profile-form",
  {
    values: ProfileValues,
    initialValues: {
      name: "",
      email: "",
    },
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange"],
  },
  (form) => {
    form.field("name").rule(Form.Rule.required())
    form.field("email").rule(Form.Rule.email())
    form.submit({ decode: ProfilePayload })
  },
)
```

这里可以直接读出几条规则：

- `Form.make(...)` 是唯一 declaration act
- declaration slot 当前只冻结 `field` 与 `submit`
- builtin rule 一旦自带默认 i18n message，canonical day-one 写法就不再强求用户传 message
- 只有在需要 override 时，才显式传 `I18nMessageToken`
- 面向 non-i18n 项目的 convenience path 若存在，也不会改 token-first 主叙事
- `values` 和 `initialValues` 继续停在 config
- returned value 是 `FormProgram`

超出当前 canonical route 与 adjunct object 的 convenience noun，本页一律不抢跑。

权威回链：

- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)

## 把 returned `FormProgram` 当成 core `Program`

`FormProgram` 的心智很简单：

- 它是 Form 领域的返回值
- 它继续按 core `Program` 的 refinement 理解
- 它进入 host、imports、runtime tree 时，服从同一条 `Program` law

所以用户在脑中不需要再多存一套“Form 专属 composition law”。
从 Logix 主 spine 看，关系可以压成：

```text
Form.make(...) -> FormProgram -> Runtime / host / imports
```

你可以把它理解成“领域包替你补了 input-state 语义，主链对象仍是同一套”。

权威回链：

- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)

## `FormHandle` 负责 effectful domain commands

当前冻结口径里，Form 拥有自己的 effectful domain handle。
它承接的是领域命令，不承接第二套 pure projection family。

可以先按这组能力理解：

```ts
interface FormHandle<TValues extends object, TDecoded = TValues> {
  validate(): Effect.Effect<void>
  validatePaths(paths: ReadonlyArray<string> | string): Effect.Effect<void>

  submit(options?: {
    onValid?: (decoded: TDecoded, ctx: { values: TValues }) => Effect.Effect<void> | Promise<void> | void
    onInvalid?: (errors: unknown) => Effect.Effect<void> | Promise<void> | void
  }): Effect.Effect<SubmitVerdict<TDecoded>>

  reset(values?: TValues): Effect.Effect<void>
  setError(path: string, error: Form.FormErrorLeaf): Effect.Effect<void>
  clearErrors(paths?: ReadonlyArray<string> | string): Effect.Effect<void>

  field(path: string): {
    set(value: unknown): Effect.Effect<void>
    blur(): Effect.Effect<void>
  }

  fieldArray(path: string): {
    append(value: unknown): Effect.Effect<void>
    prepend(value: unknown): Effect.Effect<void>
    insert(index: number, value: unknown): Effect.Effect<void>
    update(index: number, value: unknown): Effect.Effect<void>
    replace(nextItems: ReadonlyArray<unknown>): Effect.Effect<void>
    remove(index: number): Effect.Effect<void>
    swap(indexA: number, indexB: number): Effect.Effect<void>
    move(from: number, to: number): Effect.Effect<void>
  }
}
```

这部分只表达一件事：Form 拥有 effectful domain handle。
读取 state、做 selector、投影 UI，继续交给 core host law。

权威回链：

- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)

## 在 React 里怎么拿到它

当前 canonical acquisition 继续沿 core host law：

```tsx
import { fieldValue, rawFormMeta, useModule, useSelector } from "@logixjs/react"

function ProfileScreen() {
  const form = useModule(ProfileForm, { key: "profile:42" })

  const name = useSelector(form, fieldValue("name"))
  const meta = useSelector(form, rawFormMeta())
  const canSubmit = meta.errorCount === 0 && !meta.isSubmitting

  return (
    <form>
      <input
        value={String(name)}
        onChange={(e) => {
          void form.field("name").set(e.target.value)
        }}
        onBlur={() => {
          void form.field("name").blur()
        }}
      />

      <button
        disabled={!canSubmit}
        onClick={() => {
          void form.submit()
        }}
      >
        提交
      </button>
    </form>
  )
}
```

这个例子刻意只保留两条规则：

- acquisition 走 `useModule(formProgram, options?)`
- pure projection 继续走 `useSelector(handle, selector)`
- 若只想复用最小读侧 helper，当前只允许 `fieldValue(valuePath)` 和 `rawFormMeta()`

Form 领域层不会再拥有第二套 canonical React hook family。

`fieldValue(path)` 当前可以在 typed handle 入口推导 literal path 的结果类型；非法 literal path 在 `useSelector` 入口被拒绝，宽 `string` path 诚实降级为 `unknown`。不要把手写泛型当成终局类型真相。

companion exact typing 的教学路径固定为 returned-carrier。需要让 `Form.Companion.field/byRowId` 推导 exact `lower` result 时，把 companion declaration 返回的 type-only carrier 从 `define` callback 返回：

```tsx
const InventoryForm = Form.make("inventory", inventoryConfig, ($) => {
  const warehouseCarrier = $.field("items.warehouseId").companion({
    deps: ["countryId"],
    lower() {
      return {
        availability: { kind: "interactive" as const },
        candidates: { items: [{ id: "w1", label: "Main" }] },
      }
    },
  })

  return warehouseCarrier
})

function InventoryRow({ rowId }: { rowId: string }) {
  const form = useModule(InventoryForm, { key: "inventory:main" })

  const bundle = useSelector(form, Form.Companion.field("items.warehouseId"))
  const rowBundle = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))

  return <span>{rowBundle?.candidates.items[0]?.label ?? bundle?.availability.kind}</span>
}
```

多个 companion 需要 exact typing 时，返回 carrier tuple，例如 `return [countryCarrier, warehouseCarrier] as const`。
imperative `void` callback 写法仍可运行，但不会自动收集 exact metadata；对应 selector result 应按 `unknown` 处理。

权威回链：

- [10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)

## canonical state truth 长什么样

当前冻结口径里，Form pure projection 消费的是这份 canonical state truth：

```ts
type FormState<TValues extends object> = TValues & {
  errors: unknown
  ui: unknown
  $form: {
    submitCount: number
    isSubmitting: boolean
    isDirty: boolean
    errorCount: number
  }
}
```

从用户脑中只需要留下两个点：

- values tree 和领域 meta 继续在同一份 state truth 里
- host 通过 selector 消费它，不再额外学习第二套聚合 view namespace 心智

权威回链：

- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)

## 以后不再当正式口径的对象

下面这些旧 root alias、旧 command bridge、旧 view namespace、旧 form-owned hook family，即使短期还在代码里可见，也不再属于当前 canonical 用户面：

它们如果短期仍然存在，只能按 residue、alias 或 convenience layer 理解。

## 当前实现 residue 提醒

如果你在历史文档、旧 proposal 或 review ledger 里仍看到旧导出、旧 hook 或旧 command layer，它们当前只说明 cutover 过程里曾出现过这些 residue，不说明公开合同会保留它们。
此前 repo-local `useFormMeta / useFormField / useFormList / withFormDsl` helper family 已从 active examples 删除，不构成官方 helper 或 factory 方向。

看实现差异时，优先回：

- [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)

## 一句话结论

当前冻结的用户视角可以压成一句话：
我用 `Form.make(...)` 写 Form 领域 DSL，拿到 returned `FormProgram` 接回 Logix 主 spine，用 `FormHandle` 做 effectful domain commands，用 core host law 做 React acquisition 和 pure projection。
