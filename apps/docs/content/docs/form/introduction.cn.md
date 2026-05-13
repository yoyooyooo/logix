---
title: 介绍
description: Form 负责输入状态领域语义。React 获取与投影继续留在 core host route。
---

`@logixjs/form` 在 Logix runtime 之上定义输入状态语义。

当前用户面可以先压成三层：

1. `Form.make(...)` 负责声明表单语义
2. returned `FormProgram` 像其他 program 一样进入 Runtime
3. form handle 负责校验、submit、field 编辑和 list 编辑

## 公开表面

根导出包括：

- `Form.make`
- `Form.Rule`
- `Form.Error`
- `Form.Companion`

可选公开子路径：

- `@logixjs/form/locales`

React 消费继续留在 core host route：

- 通过 `RuntimeProvider` 挂载
- 通过 `useModule(...)` 获取
- 通过 `useSelector(...)` 读取
- 通过 form handle 写入

## 默认阅读顺序

- 先看默认 authoring 与 submit/validation
- 再看共享实例、局部实例和 keyed 恢复
- 再看 source scheduling 与远端事实链
- 再看 companion local support facts
- 最后看 row identity、cleanup receipt 与 row-heavy 编辑

## 作者面

```ts
import * as Form from "@logixjs/form"
import { Schema } from "effect"

const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

const SubmitPayload = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

export const ProfileForm = Form.make(
  "ProfileForm",
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
        required: "profile.name.required",
        minLength: {
          min: 2,
          message: "profile.name.minLength",
        },
      }),
    )

    form.field("email").rule(
      Form.Rule.make({
        required: "profile.email.required",
      }),
    )

    form.submit({
      decode: SubmitPayload,
    })
  },
)
```

## Runtime 消费

```tsx
import React from "react"
import * as Logix from "@logixjs/core"
import { Effect } from "effect"
import { RuntimeProvider, useModule, useSelector } from "@logixjs/react"
import { ProfileForm } from "./ProfileForm"

const runtime = Logix.Runtime.make(ProfileForm)

function ProfilePage() {
  const form = useModule(ProfileForm.tag)
  const name = useSelector(form, (s) => s.name)
  const email = useSelector(form, (s) => s.email)
  const nameError = useSelector(form, (s) => s.errors?.name)
  const canSubmit = useSelector(
    form,
    (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
  )

  return (
    <form>
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

      {nameError ? <p>{String(nameError)}</p> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          void Effect.runPromise(
            form.submit({
              onValid: (payload) => Effect.log(payload),
            }),
          )
        }
      >
        提交
      </button>
    </form>
  )
}

export const App = () => (
  <RuntimeProvider runtime={runtime}>
    <ProfilePage />
  </RuntimeProvider>
)
```

## 实例选择

当 Runtime 已经托管一个共享实例时，用 `useModule(ProfileForm.tag)`。

当页面需要一个独立实例时，用 `useModule(ProfileForm, { key })`：

```tsx
const form = useModule(ProfileForm, { key: "profile:42" })
```

如果每个组件需要自己的副本，可以省略 key：

```tsx
const form = useModule(ProfileForm)
```

如果路由切换后需要短时间恢复，给 keyed 实例加 `gcTime`：

```tsx
const form = useModule(ProfileForm, {
  key: "profile:42",
  gcTime: 60_000,
})
```

## 排除项

当前表面不包括：

- 第二套 form-owned React hook family
- package-local React wrapper 被当成公开真相
- rule declaration 直接产出 render-ready string
- 替代 core host route 的 helper family

## 延伸阅读

- [Instances](/cn/docs/form/instances)
- [Sources](/cn/docs/form/sources)
- [Companion](/cn/docs/form/companion)
- [Field arrays](/cn/docs/form/field-arrays)
