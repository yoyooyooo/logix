---
title: 快速开始
description: 从 0 到 1 跑起来一个可校验、可提交、可订阅的表单。
---

## 1) 定义 values Schema 与初始值

```ts
import { Schema } from "effect"

export const Values = Schema.Struct({
  name: Schema.String,
})

export type ValuesT = Schema.Schema.Type<typeof Values>
```

## 2) 创建 Form Module

```ts
import * as Form from "@logixjs/form"

const $ = Form.from(Values)
const z = $.rules

export const UserForm = Form.make("UserForm", {
  values: Values,
  initialValues: { name: "" } satisfies ValuesT,

  // 两阶段触发（提交前 / 提交后）
  validateOn: ["onSubmit"],
  reValidateOn: ["onChange"],

  // 推荐入口：rules（字段/列表/根规则）
  rules: z(
    z.field("name", {
      required: "请输入姓名",
      minLength: { min: 2, message: "至少 2 个字符" },
    }),
  ),
})
```

`z` 的两套写法（Decl DSL vs Node DSL）与 `z.schema(...)` 的用法见：[Rules DSL（z）](./rules)。

## 3) 在 React 中使用（RuntimeProvider + hooks）

```tsx
import React from "react"
import { Effect } from "effect"
import * as Logix from "@logixjs/core"
import { RuntimeProvider } from "@logixjs/react"
import { useForm, useField, useFormState } from "@logixjs/form/react"
import { UserForm } from "./UserForm"

const runtime = Logix.Runtime.make(UserForm, { devtools: true })

const Page = () => {
  const form = useForm(UserForm)
  const view = useFormState(form, (v) => v)
  const name = useField(form, "name")

  return (
    <div>
      <input value={String(name.value ?? "")} onChange={(e) => name.onChange(e.target.value)} onBlur={name.onBlur} />
      {name.error ? <div>{String(name.error)}</div> : null}

      <button
        disabled={!view.canSubmit}
        onClick={() =>
          void Effect.runPromise(
            form.controller.handleSubmit({
              onValid: (values) => Effect.log(values),
              onInvalid: (errors) => Effect.log(errors),
            }) as any,
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

`useFormState(form, selector)` 用于订阅“聚合后的表单视图状态”（例如 `canSubmit/isValid/isDirty`），避免在 UI 层订阅整棵 values/errors 导致无谓重渲染。

> 提示：`traits` 仍然保留，但作为高级入口（更适合 computed/source/link 或少量底层能力对照）。日常表单校验优先写在 `rules`。
