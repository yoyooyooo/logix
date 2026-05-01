---
title: Quick start
description: 用 `Form.make(...)` 创建 Form program，通过 core React host 挂载，再通过 form handle 提交。
---

## 1）定义 values 和 submit payload

```ts
import { Schema } from "effect"

export const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

export const SubmitPayload = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})
```

`values` 描述 UI 正在编辑的状态形状。
`submit.decode` 描述可以越过表单边界的 payload 形状。

## 2）创建 Form program

```ts
import * as Form from "@logixjs/form"

export const UserForm = Form.make(
  "UserForm",
  {
    values: Values,
    initialValues: {
      name: "",
      email: "",
    },
    validateOn: ["onSubmit"],
    reValidateOn: ["onChange"],
  },
  (form) => {
    form.field("name").rule(
      Form.Rule.make({
        required: "user.name.required",
      }),
    )

    form.field("email").rule(
      Form.Rule.make({
        required: "user.email.required",
      }),
    )

    form.submit({
      decode: SubmitPayload,
    })
  },
)
```

## 3）创建 Runtime

```ts
import * as Logix from "@logixjs/core"

export const runtime = Logix.Runtime.make(UserForm)
```

当一个共享表单实例已经足够时，这是最直接的方式。

## 4）通过 core React host 挂载

```tsx
import React from "react"
import { RuntimeProvider, useModule, useSelector } from "@logixjs/react"
import { Effect } from "effect"
import { runtime, UserForm } from "./UserForm"

function Page() {
  const form = useModule(UserForm.tag)
  const name = useSelector(form, (s) => s.name)
  const email = useSelector(form, (s) => s.email)
  const nameError = useSelector(form, (s) => s.errors?.name)
  const canSubmit = useSelector(
    form,
    (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
  )

  return (
    <div>
      <input
        value={String(name ?? "")}
        onChange={(e) => void Effect.runPromise(form.field("name").set(e.target.value))}
        onBlur={() => void Effect.runPromise(form.field("name").blur())}
      />

      <input
        value={String(email ?? "")}
        onChange={(e) => void Effect.runPromise(form.field("email").set(e.target.value))}
        onBlur={() => void Effect.runPromise(form.field("email").blur())}
      />

      {nameError ? <div>{String(nameError)}</div> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          void Effect.runPromise(
            form.submit({
              onValid: (payload) => Effect.log(payload),
              onInvalid: (currentErrors) => Effect.log(currentErrors),
            }),
          )
        }
      >
        提交
      </button>
    </div>
  )
}

export const App = () => (
  <RuntimeProvider runtime={runtime}>
    <Page />
  </RuntimeProvider>
)
```

## 5）读取和写入边界

读取统一留在：

- `useSelector(form, selector)`

写入统一留在：

- `form.field(path).set(...)`
- `form.field(path).blur()`
- `form.fieldArray(path).append(...)`
- `form.submit(...)`

Form-specific support reads 也继续走 `useSelector(...)`：

- `fieldValue(path)` 读取 typed value
- `Form.Error.field(path)` 读取 field explanation
- `Form.Companion.field(path)` 与 `Form.Companion.byRowId(...)` 读取 companion bundle

selector 表、returned-carrier 类型路线，以及 companion soft fact 与 final rule / submit truth 的边界，见 [Selectors and support facts](/cn/docs/form/selectors)。

## 6）多实例场景

当同一页面需要多个独立副本时，改用 program route：

```tsx
const form = useModule(UserForm, { key: "user-form:42" })
```

`useModule(UserForm.tag)` 适合 Runtime 已托管的共享实例。
`useModule(UserForm, { key })` 适合独立实例。
`useModule(UserForm)` 适合组件私有实例。
`useModule(UserForm, { key, gcTime })` 适合路由切换后短时间恢复。

更完整的生命周期选择见 [Instances](/cn/docs/form/instances)。

## Canonical route

当前 canonical route 是：

- `Form.make(...)`
- `form.field(path).rule(...)`
- `form.submit({ decode })`
- `RuntimeProvider`
- `useModule(...)`
- `useSelector(...)`

把 `useForm / useField / useFieldArray / useFormState` 重新抬成 wrapper family，不属于当前 canonical surface。

## 延伸阅读

- [Instances](/cn/docs/form/instances)
- [Sources](/cn/docs/form/sources)
- [Companion](/cn/docs/form/companion)
- [Selectors and support facts](/cn/docs/form/selectors)
