# Form PoC Demo 场景

> historical / quarantine
>
> 目录用于放置围绕 `@logixjs/form-poc` 的旧使用示例，仅作为文档 demo，不作为 current teaching route，也不作为正式运行时代码。
> 当前 canonical route 统一回 `examples/logix-react/src/demos/form/**` 与 [../../../docs/internal/form-api-tutorial.md](../../../docs/internal/form-api-tutorial.md)。

## 1. UserProfile 表单示意

```ts
import { FormCore } from "../src/domain"
import { FormReact } from "../src/react-hooks"
import { UserProfileFormModule, UserProfileForm } from "../src/user-profile"

// 仅示意：实际实现由业务侧提供
function useUserProfileForm() {
  // 基础模式：基于某个 Form 程序蓝图创建控制器
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

// 运行时侧仅把 GlobalSearchFormModule 当作普通表单程序蓝图注入
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

> 上述 demo 只作为历史参考，不承诺在当前仓内直接运行；若需要当前口径，请以 canonical route 为准。
