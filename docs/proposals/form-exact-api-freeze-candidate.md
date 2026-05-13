---
title: Form Exact API Freeze Candidate
status: consumed
owner: form-api-freeze
target-candidates:
  - docs/ssot/form/05-public-api-families.md
  - docs/ssot/form/09-operator-slot-design.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/internal/form-api-quicklook.md
last-updated: 2026-04-15
---

> **Final authority note (2026-05-11):** This proposal is historical / consumed unless it is explicitly restated in `docs/ssot/form/13-exact-surface-contract.md`. Current Form API is single-track: `Form.make -> FormProgram -> FormHandle -> useModule + useSelector`. Old candidate wording for `@logixjs/form/react`, `Form.Path`, `Form.Source`, `Form.Row`, `Form.Fact`, `Form.SoftFact`, `Form.from`, Form-owned hooks, public row tokens, or schema mapping helpers must not be interpreted as current API.

## Superseded by final single-track contract

The body below is retained only as historical decision trace. Its earlier table rows that marked `Form.Path`, `Form.SchemaPathMapping`, `Form.SchemaErrorMapping`, `@logixjs/form/react`, `useForm`, `useFormState`, `useField`, or `useFieldArray` as `keep` are no longer current. The accepted current contract keeps only `Form.make`, `Form.Rule`, `Form.Error`, `Form.Companion` at the Form root and routes React reads through core `useModule + useSelector`.


# Form Exact API Freeze Candidate

> superseded / stale hazard
>
> 本页保留作历史 planning 材料，不再作为当前 authority 输入。
> root exact surface 以 `docs/ssot/form/13-exact-surface-contract.md` 为准；
> `Path / Schema*` 的 root-exit 以 `docs/ssot/runtime/06-form-field-kernel-boundary.md` 为准；
> follow-up 路由统一回 `docs/proposals/form-authority-drift-writeback-contract.md` 与 `docs/next/**`。

## 目标

把 form 表面 API 直接写成可被挑战的精确候选稿。
这份 proposal 的目标不是解释原则，目标是让 reviewer 可以直接审：

- 最终 root export 到底有哪些
- `@logixjs/form/react` 到底导出哪些 hook
- authoring DSL 到底长什么样
- commands 到底保留哪些 noun
- projection 到底长什么样

## 角色

- 本页是待裁决 proposal，不是权威事实源
- 本页是当前 exact surface 的单 authority artifact
- walkthrough、后续 SSoT 回写、export 对齐都应从本页派生，不再各自手写第二份 exact noun
- 本页允许为了更优 exact surface 反推并挑战整个 kernel，不预设当前 kernel grammar 必然保留
- 上游权威仍回：
  - [Form Public API Families](../ssot/form/05-public-api-families.md)
  - [Form Operator Slot Design](../ssot/form/09-operator-slot-design.md)
  - [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
- 本页一旦收口，后续应升格到 SSoT 与 internal walkthrough

## review order

这轮 exact freeze 的裁决顺序固定为：

1. 先决 authority model
2. 再决 canonical authoring act
3. 再决 runtime / projection return boundary
4. 再决 submit noun
5. 再决 host sugar noun
6. 最后才决具体 helper noun

如果前一层没收口，后一层不冻结。

## 当前基线

当前这份 exact candidate 只允许建立在下面这些已冻结输入上：

- 三条 authority route：
  - authoring route
  - runtime command route
  - react projection route
- canonical slots：
  - `S1 declaration`
  - `S2 mutate`
  - `S3 validate`
  - `S4 submit`
  - `S5 project`
- canonical obligations：
  - `O1 participation`
  - `O2 shape-edit`
  - `O3 settlement`
  - `O4 reason-projection`
- kernel grammar：
  - `participation-delta kernel`
  - `settlement-task kernel`
  - shared `canonical evidence envelope`

上面这些输入当前是基线，不是不可挑战前提。
如果 reviewer 能证明更优 surface 需要反推更小、更一致的 kernel grammar，本 proposal 允许直接挑战 03/07/08 与 runtime boundary。

## synthesized candidate

这轮采用一个更小的 exact candidate：

1. authority 只保留两条：
   - authoring authority
   - runtime authority
2. `@logixjs/form/react` 不再作为第三条 peer authority，只是 host manifestation package
3. canonical authoring 收敛到单 act：
   - `Form.make(id, { values, initialValues, logic: ($) => { ... } })`
4. `Form.from`、`FormLogicSpec`、`$.rules` 退出 canonical user surface
5. runtime submit 只保留一个 canonical noun：`submit`
6. `handleSubmit` 下沉到 host sugar / alias，不进入 exact surface
7. projection 先冻结 contract 与 acquisition，不先把所有 helper noun 升格到 root
8. exact freeze 显式拆成：
   - value surface
   - type surface
9. kernel grammar 候选同步压到：
   - `shape executor`
   - `task executor`
   - shared `receipt format`

## authority model

### A. authoring authority

- acquisition path：`@logixjs/form`
- 负责 form 语义声明
- 负责 submit contract declaration

### B. runtime authority

- acquisition path：form instance handle
- 负责 validate、submit、mutation、projection acquisition

### host manifestation package

- acquisition path：`@logixjs/form/react`
- 只是 host package manifestation
- `useField`、`useFieldArray` 的写方法明确视为 runtime authority 的 host sugar
- React 不再被视为第三条 peer authority

## exact surface split

### 1. value surface

### root value surface

| export | status | authority | note | deleted_boundary |
| --- | --- | --- | --- | --- |
| `Form.make` | `keep` | authoring | 唯一 canonical authoring act | `Form.from` |
| `Form.Rule` | `keep` | authoring support | 规则构造与组合 | none |
| `Form.Error` | `keep` | authoring support | error helpers | none |
| `Form.Path` | `keep` | authoring support | path helpers | none |
| `Form.SchemaPathMapping` | `keep` | authoring support | schema mapping | none |
| `Form.SchemaErrorMapping` | `keep` | authoring support | schema mapping | none |
| `Form.from` | `drop` | none | 退出 canonical user surface | duplicate acquisition step |
| `Form.commands` | `unnamed` | bridge residue | packaging exception / internal bridge | exact user contract |
| `FormView` | `drop` | none | 退出 exact root value export | projection entry merged into `form.view()` |

### react value surface

| export | status | authority | note |
| --- | --- | --- | --- |
| `useForm` | `keep` | host manifestation | 返回 exact form handle |
| `useFormState` | `keep` | host manifestation | selector entry |
| `useField` | `keep` | host sugar | field projection + runtime sugar |
| `useFieldArray` | `keep` | host sugar | list projection + runtime sugar |

### 2. type surface

| type export | status | note | deleted_boundary |
| --- | --- | --- | --- |
| `FormModule<Id, TValues, TDecoded>` | `keep` | exact program/module type | none |
| `FormHandle<TValues, TDecoded>` | `keep` | exact runtime handle boundary | `FormCommandsHandle` as public carrier |
| `FormViewContract<TValues, TDecoded>` | `keep` | exact projection contract | opaque `FormView` namespace typing |
| `SubmitVerdict<TDecoded>` | `keep` | exact submit outcome contract | implicit decoded/invalid split |
| `FormLogicBuilder<TValues, TDecoded>` | `keep` | exact authoring builder contract | anonymous builder type |
| `FormFieldBuilder` | `keep` | exact field-chain builder contract | anonymous field builder |
| `FormFrom` | `drop` | no canonical surface | `Form.from` |
| `FormLogicInput` | `drop` | no canonical surface | `logic({ rules })` carrier |
| `FormLogicSpec` | `drop` | no canonical surface | public lowering bundle |
| `RulesDsl / RulesSpec / Rules*Node` | `unnamed` | authoring implementation residue | day-one user contract |

## exact authoring candidate

### canonical authoring act

```ts
Form.make<Id extends string, TValues extends object, TDecoded = TValues>(
  id: Id,
  config: {
    values: Schema.Schema<TValues>
    initialValues: TValues
    logic?: (dsl: FormLogicBuilder<TValues, TDecoded>) => void
    validateOn?: ReadonlyArray<"onSubmit" | "onChange" | "onBlur">
    reValidateOn?: ReadonlyArray<"onSubmit" | "onChange" | "onBlur">
    debounceMs?: number
  },
): FormModule<Id, TValues, TDecoded>
```

裁决：

- schema 只出现一次
- `Form.make` 既是 acquisition，也是 assembly
- `logic` 直接收 builder callback
- 中间 lowering bundle 不穿过 public surface

### authoring builder

```ts
interface FormLogicBuilder<TValues extends object, TDecoded = TValues> {
  field(path: string): {
    rule(input: unknown): FormFieldBuilder
  }

  scope: {
    when(
      path: string,
      branch: {
        equals: unknown
        then: (dsl: FormLogicBuilder<TValues, TDecoded>) => void
      },
    ): void

    list(
      path: string,
      config: {
        trackBy: string
        item: (dsl: FormLogicBuilder<any, TDecoded>) => void
      },
    ): void
  }

  submit(config: {
    decode: Schema.Schema<TDecoded> | ((values: TValues) => TDecoded)
  }): void
}

interface FormFieldBuilder {
  rule(input: unknown): FormFieldBuilder
}
```

这轮 exact freeze 只冻结三类 day-one declaration：

- `field`
- `scope`
- `submit`

不再把 `when`、`list` 冻成和 `field` 同级的 grammar noun。
它们是 `scope` 家族下的 exact variant。

deleted boundary：

- `Form.from(values).logic(...)`
- `$.logic({ rules })`
- `$.rules`
- `z.field / z.list / z.root / z.schema`

## exact runtime candidate

### exact runtime handle

```ts
interface FormHandle<TValues extends object, TDecoded = TValues> {
  validate(): Effect.Effect<void>
  validatePaths(paths: ReadonlyArray<string> | string): Effect.Effect<void>

  submit(options?: {
    onValid?: (decoded: TDecoded, ctx: { values: TValues }) => Effect.Effect<void> | Promise<void> | void
    onInvalid?: (errors: unknown) => Effect.Effect<void> | Promise<void> | void
  }): Effect.Effect<SubmitVerdict<TDecoded>>

  reset(values?: TValues): Effect.Effect<void>
  setError(path: string, error: unknown): Effect.Effect<void>
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

  view(): FormViewContract<TValues, TDecoded>
}
```

裁决：

- runtime exact surface 只保留一个 submit noun：`submit`
- `handleSubmit` 退出 exact runtime surface
- `getState / dispatch / runtime / rulesManifest*` 全部降为 expert residue 或 internal path
- `field(path).get` 与 `fieldArray(path).get` 不进入 runtime exact surface
- `byId(rowId)` 暂不升格，等 row token contract 先冻结

## exact projection candidate

### projection acquisition

```ts
form.view()
```

这轮 exact freeze 先冻结：

- 单一 projection acquisition
- 单一 projection data contract

### projection contract

```ts
interface FormViewContract<TValues extends object, TDecoded = TValues> {
  summary(): {
    canSubmit: boolean
    isSubmitting: boolean
    isValid: boolean
    isDirty: boolean
    isPristine: boolean
    submitCount: number
  }

  path(path: string): {
    value(): unknown
    error(): unknown
    reason(): unknown
  }

  explain(): unknown
}
```

这里冻结的是 contract。
`summary / path / explain` 作为 nested selectors 保留在同一个 projection entry 下，不再额外冻结为多个 root acquisition noun。

## host manifestation candidate

### `useForm`

```ts
useForm(formBlueprint): FormHandle<TValues, TDecoded>
```

### `useFormState`

```ts
useFormState(form, selector?)
```

### host sugar

`useField` 与 `useFieldArray` 继续保留，并按 exact freeze 明确视为 host sugar：

```ts
useField(form, path)
useFieldArray(form, path)
```

它们不得反向定义 authority。
一切写行为继续只视为 runtime handle 的 host manifestation。

## exact kernel minimization candidate

这轮 exact surface 对应的 kernel 最小候选改成：

- `shape executor`
  - active-set
  - structure delta
  - ownership / remap
  - cleanup receipts
- `task executor`
  - validate / submit
  - async settlement
  - stale / cancel
  - blocking receipts
- shared `receipt format`
  - projection
  - verification
  - diagnostics

这份候选不再把 `reason contract` 当成 peer grammar object。
`reason` 退回 shared receipt format 的 derived projection law。

## canonical walkthroughs

### W1. minimal form

```ts
export const profileForm = Form.make("profile-form", {
  values: ProfileSchema,
  initialValues,
  logic: ($) => {
    $.field("name").rule(Form.Rule.required("请输入姓名"))
    $.field("email").rule(Form.Rule.required("请输入邮箱"))
    $.submit({ decode: ProfilePayloadSchema })
  },
})
```

### W2. conditional subtree

```ts
logic: ($) => {
  $.scope.when("type", {
    equals: "company",
    then: ($) => {
      $.field("companyName").rule(Form.Rule.required("请输入公司名"))
      $.field("taxId").rule(Form.Rule.required("请输入税号"))
    },
  })
}
```

### W3. dynamic list

```ts
logic: ($) => {
  $.scope.list("items", {
    trackBy: "id",
    item: ($row) => {
      $row.field("name").rule(Form.Rule.required("请输入名称"))
      $row.field("qty").rule(Form.Rule.min(1, "数量至少为 1"))
    },
  })
}
```

### W4. submit in React

```tsx
function ProfileForm() {
  const form = useForm(profileForm)
  const view = useFormState(form, (v) => v)

  return (
    <button
      disabled={!view.canSubmit}
      onClick={() =>
        void Effect.runPromise(
          form.submit({
            onValid: (decoded) => Effect.log(decoded),
          }) as any,
        )
      }
    >
      提交
    </button>
  )
}
```

## API audit matrix

| surface | exact candidate | authority | slot | proof_ref | deleted_boundary |
| --- | --- | --- | --- | --- | --- |
| `Form.make(..., { logic: ($) => ... })` | adopt | authoring | `S1` | `O1/O2/O3` | `Form.from(...).logic(...)` |
| `field(...).rule(...)` | adopt | authoring | `S1` | `O1/O3` | raw field fragments |
| `scope.when(...)` | adopt | authoring | `S1` | `O1 + S1/S2/S5` | standalone `when` grammar noun |
| `scope.list(...)` | adopt | authoring | `S1` | `O2 + S2/S5` | standalone `list` grammar noun |
| `submit({ decode })` | adopt | authoring | `S1` | `O3 + S1/S4/S5` | submit declaration hidden in runtime helper |
| `form.submit(options?)` | adopt | runtime | `S4` | `O3 + S4` | `handleSubmit(...)` |
| `form.validate / validatePaths` | keep | runtime | `S3` | `O3 + S3` | none |
| `form.field(...).set/blur` | keep | runtime | `S2` | `O1/O2 + S2` | `field(...).get` |
| `form.fieldArray(...).insert/update/replace` | adopt | runtime | `S2` | `O2 + S2/S5` | half-closed list mutation family |
| `form.view()` | adopt | projection acquisition | `S5` | `O4 + S5` | `Form.view(form)` 与 `FormView` namespace |
| `useForm / useFormState` | keep | host manifestation | `S5` | `O4 + S5` | none |
| `useField / useFieldArray` | keep as host sugar | host manifestation | `S5` + runtime sugar | `O1/O2/O4` | peer authority interpretation |

## review focus

后续 reviewer 应优先挑战这些点：

1. single authority artifact 是否足够闭合
2. `Form.make(... logic: ($) => ...)` 是否应成为唯一 canonical authoring act
3. `Form.from` 是否应完全退出 canonical surface
4. `form.submit(options?)` 是否足以吃掉 `handleSubmit(...)`
5. `Form.commands` 是否只应停在 packaging/internal bridge
6. `shape executor + task executor + receipt format` 是否支配当前 kernel grammar
7. type surface 表是否还缺关键公开类型

## 去向

- 2026-04-15 已消化到：
  - [05-public-api-families.md](../ssot/form/05-public-api-families.md)
  - [09-operator-slot-design.md](../ssot/form/09-operator-slot-design.md)
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [form-api-quicklook.md](../internal/form-api-quicklook.md)
