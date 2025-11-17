# Form PoC Demo 场景

> 目录用于放置围绕 `@intent-flow/logix-form-poc` 的使用示例，仅作为文档 demo，不作为正式运行时代码。

## 1. UserProfile 表单示意

```ts
import { FormCore } from "../src/domain"
import { FormReact } from "../src/react-hooks"
import { UserProfileFormModule, UserProfileForm } from "../src/user-profile"

// 仅示意：实际实现由业务侧提供
function useUserProfileForm() {
  // 基础模式：基于某个 Module 实例创建控制器
  const controller = FormReact.useForm<UserProfileForm.Values>(UserProfileFormModule)

  const username = FormReact.useField<UserProfileForm.Values, string>(
    controller,
    "username",
  )

  const email = FormReact.useField<UserProfileForm.Values, string>(
    controller,
    "email",
  )

  return {
    controller,
    fields: { username, email },
  }
}
```

## 2. AddressForm + 数组字段示意

```ts
import { AddressFormModule, AddressForm } from "../src/address-form"
import { FormReact } from "../src/react-hooks"

function useAddressForm() {
  const controller = FormReact.useForm<AddressForm.Values>(AddressFormModule)

  const country = FormReact.useField<AddressForm.Values, string>(
    controller,
    "defaultCountry",
  )

  const addresses = FormReact.useFieldArray<AddressForm.Values, AddressForm.AddressLine>(
    controller,
    "addresses",
  )

  return { controller, country, addresses }
}
```

## 3. GlobalSearch 表单 + AppRuntime 示意

```ts
import { GlobalSearchFormModule, GlobalSearchForm } from "../src/global-search"
import { FormReact } from "../src/react-hooks"
import type { AppRuntime } from "../src/app-runtime"

// 运行时侧仅把 GlobalSearchFormModule 当作普通 Module 注入
declare const runtime: AppRuntime.Runtime

function useGlobalSearch() {
  const controller = FormReact.useForm<GlobalSearchForm.Values>(GlobalSearchFormModule)
  const keyword = FormReact.useField<GlobalSearchForm.Values, string>(controller, "keyword")
  const status = FormReact.useField<GlobalSearchForm.Values, GlobalSearchForm.StatusFilter>(
    controller,
    "status",
  )

  return { controller, keyword, status }
}
```

> 上述 demo 仅作为「类型与用法」的参考，不承诺在未实现 `useForm/useField` 等函数时可以直接运行。后续可以按需把这里的示意逐步替换为真实实现。
