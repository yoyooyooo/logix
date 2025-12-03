# 实战 PoC 项目骨架 (Real-World Form PoC)

> **Status**: Draft  
> **Goal**: 用一个接近真实 B2B 管理后台的虚拟项目，演示 Form 在 logix 体系中的落点与边界，只写类型与 Demo，不给出具体实现。

本节通过一个「运营管理后台」PoC，串起：

- 领域 Form 模块（UserProfileForm / AddressForm / GlobalSearchForm）；
- Form Domain（FormState / FormAction / FormConfig）；
- logix-core Module / Logic；
- React 层 `useForm` / `useField`；

所有代码示例都只包含 **类型、签名与命名约定**，不包含具体实现。

---

## 1. 假想项目结构 (Monorepo Layout)

```text
apps/
  admin-portal/
    src/
      app/
        logixRuntime.ts        # AppRuntime 组装（仅类型示意）
      features/
        user/
          UserProfileForm.tsx  # 用户资料表单
        settings/
          AddressForm.tsx      # 地址设置表单
        search/
          GlobalSearchBar.tsx  # 全局搜索栏表单

packages/
  logix-core/                  # 现有 logix 引擎
  form/                        # Form Domain + React Hooks（本规范的实现落点）
```

下面代码片段里只出现 `declare` / `interface` / `type` / `namespace` 等声明，不给出实际逻辑。

---

## 2. Form Domain：统一类型出口

约定在 `packages/form/src/domain` 下提供统一的类型出口，供业务项目直接使用。

```ts
// packages/form/src/domain/index.d.ts

import type { Schema } from "effect/Schema";
import type * as Logix from "@logix/core"; // 概念性路径，用于说明依赖

export interface FormIssue {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  path: string;
}

export interface FieldState {
  touched: boolean;
  dirty: boolean;
  validating: boolean;
  focused: boolean;
  issues: FormIssue[];
}

export interface UIState {
  fields: Record<string, FieldState>;
  meta: {
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
    isDirty: boolean;
    submitCount: number;
    allIssues: FormIssue[];
  };
}

export interface FormState<TValues> {
  values: TValues;
  ui: UIState;
  // 可选：配置/初始快照等
  config?: FormConfig<TValues>;
}

export type ValidationMode = "onChange" | "onBlur" | "onSubmit" | "all";

export interface FormConfig<TValues> {
  readonly initialValues: TValues;
  readonly schema?: Schema<TValues>;
  readonly mode?: ValidationMode;
  readonly reValidateMode?: ValidationMode;
  readonly debounceMs?: number;
}

export type FormAction =
  | { _tag: "field/change"; payload: { path: string; value: unknown } }
  | { _tag: "field/blur"; payload: { path: string } }
  | { _tag: "field/focus"; payload: { path: string } }
  | { _tag: "array/append"; payload: { path: string; value: unknown } }
  | { _tag: "array/prepend"; payload: { path: string; value: unknown } }
  | { _tag: "array/remove"; payload: { path: string; index: number } }
  | {
      _tag: "array/swap";
      payload: { path: string; indexA: number; indexB: number };
    }
  | {
      _tag: "array/move";
      payload: { path: string; from: number; to: number };
    }
  | { _tag: "form/submit"; payload?: { trigger?: string } }
  | { _tag: "form/reset"; payload?: { values?: unknown } }
  | { _tag: "form/validate"; payload?: { paths?: string[] } }
  | { _tag: "form/setValues"; payload: { values: unknown } };

export type FormShape<TValues, TActionMap extends Record<string, Schema<any>>> =
  Logix.Shape<
    Schema<FormState<TValues>>,
    TActionMap
  >;
```

---

## 3. 领域模块：用户资料表单 (UserProfileForm)

模拟一个典型的「用户资料」表单：用户名、邮箱、手机、国家/省市。

```ts
// apps/admin-portal/src/features/user/user-profile.form.d.ts

import type { Schema } from "effect/Schema";
import type * as Logix from "@logix/core";
import type {
  FormState,
  FormAction,
  FormShape,
} from "@logix/form/domain";

export namespace UserProfileDomain {
  export interface Values {
    username: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    marketingOptIn: boolean;
  }

  export interface Services {
    // 示例：检查用户名是否重名
    readonly checkUsername: (
      username: string,
    ) => Effect.Effect<boolean>;
  }

  export type State = FormState<Values>;

  export interface ActionMap {
    "field/change": Schema<{ path: string; value: unknown }>;
    "field/blur": Schema<{ path: string }>;
    "field/focus": Schema<{ path: string }>;
    "form/submit": Schema<{ trigger?: string }>;
  }

  export type Shape = FormShape<Values, ActionMap>;

  export type ModuleInstance = Logix.ModuleInstance<"UserProfileForm", Shape>;
}

// 仅声明：实际实现由 packages/form 提供工厂函数生成
export declare const UserProfileFormModule: UserProfileDomain.ModuleInstance;
```

Logic 与 Live 在 PoC 中也只给出「类型位」：

```ts
// apps/admin-portal/src/features/user/user-profile.logic.d.ts

import type { Logic } from "@logix/core";
import type { UserProfileDomain } from "./user-profile.form";

export declare namespace UserProfileLogic {
  // 监听 country 变化，重置 city（示意）
  export type CountryCityLink = Logic.Of<UserProfileDomain.Shape>;

  // 异步校验用户名是否重复（示意）
  export type UsernameValidation = Logic.Of<
    UserProfileDomain.Shape,
    UserProfileDomain.Services
  >;
}
```

---

## 4. 领域模块：地址设置表单 (AddressForm)

示意一个带数组字段的地址表单，演示 `array/*` Action 的类型使用。

```ts
// apps/admin-portal/src/features/settings/address.form.d.ts

import type { Schema } from "effect/Schema";
import type * as Logix from "@logix/core";
import type { FormState, FormAction, FormShape } from "@logix/form/domain";

export namespace AddressDomain {
  export interface AddressLine {
    id: string;
    label: string;
    detail: string;
  }

  export interface Values {
    defaultCountry: string;
    addresses: AddressLine[];
  }

  export type State = FormState<Values>;

  export interface ActionMap {
    "field/change": Schema<{ path: string; value: unknown }>;
    "field/blur": Schema<{ path: string }>;
    "field/focus": Schema<{ path: string }>;
    "array/append": Schema<{ path: string; value: unknown }>;
    "array/remove": Schema<{ path: string; index: number }>;
    "form/submit": Schema<{ trigger?: string }>;
  }

  export type Shape = FormShape<Values, ActionMap>;

  export type ModuleInstance = Logix.ModuleInstance<"AddressForm", Shape>;
}

export declare const AddressFormModule: AddressDomain.ModuleInstance;
```

---

## 5. 全局模块：搜索栏表单 (GlobalSearchForm)

示意一个挂在 AppRuntime 上的全局搜索栏表单，只暴露少量字段。

```ts
// apps/admin-portal/src/features/search/global-search.form.d.ts

import type { Schema } from "effect/Schema";
import type * as Logix from "@logix/core";
import type { FormState, FormShape } from "@logix/form/domain";

export namespace GlobalSearchDomain {
  export interface Values {
    keyword: string;
    status: "all" | "active" | "archived";
  }

  export type State = FormState<Values>;

  export interface ActionMap {
    "field/change": Schema<{ path: string; value: unknown }>;
    "field/blur": Schema<{ path: string }>;
    "form/submit": Schema<{ trigger?: string }>;
  }

  export type Shape = FormShape<Values, ActionMap>;

  export type ModuleInstance = Logix.ModuleInstance<"GlobalSearchForm", Shape>;
}

export declare const GlobalSearchFormModule: GlobalSearchDomain.ModuleInstance;
```

AppRuntime 侧只需要知道「这是一个模块」，不用关心它是 Form：

```ts
// apps/admin-portal/src/app/logixRuntime.d.ts

import type { Layer } from "effect/Layer";
import type { ManagedRuntime } from "effect/ManagedRuntime";

import type { UserProfileDomain } from "../features/user/user-profile.form";
import type { AddressDomain } from "../features/settings/address.form";
import type { GlobalSearchDomain } from "../features/search/global-search.form";

export declare namespace AppRuntime {
  export type Modules =
    | UserProfileDomain.ModuleInstance
    | AddressDomain.ModuleInstance
    | GlobalSearchDomain.ModuleInstance;

  export type LayerOfModules = Layer<Modules, never, never>;

  export type Runtime = ManagedRuntime<never>;
}
```

---

## 6. React 层：Hooks 类型示意

在 `packages/form/src/react` 中提供对 Form Module 的标准 Hooks 类型。

```ts
// packages/form/src/react/hooks.d.ts

import type * as React from "react";
import type * as Logix from "@logix/core";
import type {
  FormState,
  FormAction,
  FormIssue,
} from "@logix/form/domain";

export interface FormController<TValues> {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>;
  readonly getState: () => FormState<TValues>;
  readonly dispatch: (action: FormAction) => void;
}

export interface UseFieldReturn<TValue> {
  value: TValue;
  isTouched: boolean;
  isDirty: boolean;
  isValidating: boolean;
  error?: string;
  issues: FormIssue[];
  onChange: (value: TValue | React.ChangeEvent<any>) => void;
  onBlur: () => void;
  onFocus: () => void;
}

export interface UseFieldArrayReturn<TItem> {
  fields: Array<{ id: string } & TItem>;
  append: (value: TItem) => void;
  prepend: (value: TItem) => void;
  remove: (index: number) => void;
  swap: (indexA: number, indexB: number) => void;
  move: (from: number, to: number) => void;
  replace: (values: TItem[]) => void;
}

export declare function useForm<TValues>(
  module: Logix.ModuleInstance<string, any>,
): FormController<TValues>;

export declare function useField<TValues, TPath extends string, TValue>(
  controller: FormController<TValues>,
  path: TPath,
): UseFieldReturn<TValue>;

export declare function useFieldArray<TValues, TPath extends string, TItem>(
  controller: FormController<TValues>,
  path: TPath,
): UseFieldArrayReturn<TItem>;
```

业务侧使用方式示意（只写签名）：

```ts
// apps/admin-portal/src/features/user/UserProfileForm.tsx.d.ts

import type * as React from "react";
import type { UserProfileDomain } from "./user-profile.form";
import type {
  FormController,
  UseFieldReturn,
} from "@logix/form/react/hooks";

export interface UserProfileFormProps {
  readonly userId: string;
}

export declare function useUserProfileForm(
  props: UserProfileFormProps,
): {
  controller: FormController<UserProfileDomain.Values>;
  fields: {
    username: UseFieldReturn<string>;
    email: UseFieldReturn<string>;
    phone: UseFieldReturn<string>;
    country: UseFieldReturn<string>;
    city: UseFieldReturn<string>;
  };
};

export declare const UserProfileForm: React.FC<UserProfileFormProps>;
```

---

## 7. 小结：PoC 对齐的约束点

- Form 在项目中的身份是：`Logix.Module<FormShape>` 的一个具体实例集合（UserProfile / Address / GlobalSearch），在 Type 层统一约束为 `FormState<T>` + `FormAction`。
- 所有「真实项目」相关的目录/命名（apps/admin-portal、features/user 等）只是示意，用来验证 Form 规划在实际仓库中的落点和边界。
- React 层只依赖 `FormController` + `useField`/`useFieldArray` 类型，表单行为本身由 logix-core + Form Logic Presets 决定。  

实现落地时，可以以本文件为蓝本，把 `*.d.ts` 中的声明逐步替换为具体实现。

