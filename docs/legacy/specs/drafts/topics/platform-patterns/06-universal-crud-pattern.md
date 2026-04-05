---
title: Universal CRUD Pattern
status: draft
version: 1.3
value: pattern
priority: high
related:
  - ./08-fractal-runtime-and-layer-injection.md
---

# Universal CRUD Pattern: One Logic, Any Module

> "差异化只靠 Service 外包出去，发挥 Effect 的能力"

本文档描述如何利用 Logix v3 的 **Fractal Runtime** 和 **Effect Context** 能力，构建一套“万能 CRUD 模板”。
在这种模式下，UI 交互（Loading / Error / Optimistic UI / Pagination）被标准化为通用逻辑，封装在 `@logixjs/template` 中；而具体的领域差异（API 路径、数据转换）则通过 **Route-Level RuntimeProvider** 注入。

## 1. 核心思想

我们将 CRUD 拆解为三个层次：

1.  **Generic Contract (Service)**: 定义“增删改查”的标准接口形状（Tag）。
2.  **Generic Logic (Template)**: 针对上述接口编写的通用 UI 交互逻辑，位于 `@logixjs/template`。
3.  **Specific Implementation (Layer)**: 针对具体领域（User/Product）的适配层，在路由层注入。

## 2. The Universal Contract & Template

假设这些代码位于 `@logixjs/template/crud` 包中。

```typescript
// @logixjs/template/crud/service.ts
import { Context, Effect } from 'effect'

// 1. 定义通用的 CRUD 能力接口
export interface CrudService<T, CreateInput, UpdateInput> {
  readonly list: (params: { page: number; size: number }) => Effect.Effect<{ items: T[]; total: number }, Error>
  readonly detail: (id: string) => Effect.Effect<T, Error>
  readonly create: (data: CreateInput) => Effect.Effect<T, Error>
  readonly update: (id: string, data: UpdateInput) => Effect.Effect<T, Error>
  readonly delete: (id: string) => Effect.Effect<void, Error>
}

// 2. 一个用于生成 Tag 的工厂函数
export const makeCrudTag = <T, C, U>(key: string) =>
  class extends Context.Tag(key)<any, CrudService<T, C, U>>() {}
```

```typescript
// @logixjs/template/crud/module.ts
import * as Logix from '@logixjs/core'
import { Context, Effect, Option, Schema } from 'effect'

// 通用状态结构
const makeState = <T>(ItemSchema: Schema.Schema<T>) =>
  Schema.Struct({
    items: Schema.Array(ItemSchema),
    total: Schema.Number,
    page: Schema.Number,
    loading: Schema.Boolean,
    error: Schema.Option(Schema.String),
  })

// 通用 Actions
const Actions = {
  fetch: Schema.Struct({ page: Schema.Number }),
  delete: Schema.String,
}

// ★ The Universal Factory
export const makeCrudModule = <T, C, U>(
  name: string,
  ItemSchema: Schema.Schema<T>,
  ServiceTag: Context.Tag<any, CrudService<T, C, U>>,
) => {
  const Def = Logix.Module.make(name, {
    state: makeState(ItemSchema),
    actions: Actions,
  })

  // 通用逻辑：只认 ServiceTag，不关心具体是 User 还是 Product
  const Logic = Def.logic(($) =>
    Effect.gen(function* () {
      const api = yield* $.use(ServiceTag)

      yield* $.onAction('fetch').runLatest(({ page }) =>
        Effect.gen(function* () {
          yield* $.state.mutate((draft) => {
            draft.loading = true
            draft.error = Option.none()
          })

          const { items, total } = yield* api.list({ page, size: 10 })

          yield* $.state.update((prev) => ({
            ...prev,
            items,
            total,
            page,
            loading: false,
          }))
        }).pipe(
          Effect.catchAll((err) =>
            $.state.mutate((draft) => {
              draft.loading = false
              draft.error = Option.some(err.message)
            }),
          ),
        ),
      )

      // ... delete logic
    }),
  )

  // 返回预配置好的 program module / ModuleImpl 工厂，方便用户在 React/Runtime 中按需消费
  return {
    Def,
    Logic,
    makeModule: (initial: any) =>
      Def.implement({
        initial,
        logics: [Logic],
        // 注意：这里不绑定 imports，把 Service 的注入留给 RuntimeProvider
      }),
    makeImpl: (initial: any) =>
      Def.implement({
        initial,
        logics: [Logic],
      }).impl,
  }
}
```

## 3. 业务落地：Route-Level Injection

现在，在具体的业务应用中，我们通过 **Runtime 分形** 来注入差异化实现。

### 3.1 Module Definition

```typescript
// src/module/user.ts
import { makeCrudTag } from '@logixjs/template/crud'

export const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String })
export type User = Schema.Schema.Type<typeof UserSchema>

// 专用的 Service Tag
export class UserService extends makeCrudTag<User, any, any>('UserService') {}
```

### 3.2 Implementation (Layer)

```typescript
// src/infra/user.live.ts
export const UserServiceLive = Layer.succeed(UserService, {
  list: ({ page }) => Effect.tryPromise(() => fetch(`/api/users?page=${page}`).then((r) => r.json())),
  // ...
})
```

### 3.3 Route Composition (The Pattern)

这是本模式的核心：**在路由组件的外层包裹 `RuntimeProvider`，注入具体的 Service 实现**。

```tsx
// src/routes/UserRoute.tsx
import { RuntimeProvider, useModule } from '@logixjs/react'
import { makeCrudModule } from '@logixjs/template/crud'
import { Option } from 'effect'
import { UserService, UserSchema } from '@/domain/user'
import { UserServiceLive } from '@/infra/user.live'

// 1. 生成 User 专用的 Module (Template Instantiation)
const { makeImpl } = makeCrudModule('UserModule', UserSchema, UserService)

// 2. 实例化 Impl (Logic is built-in)
const UserImpl = makeImpl({
  items: [],
  total: 0,
  page: 1,
  loading: false,
  error: Option.none(),
})

// 3. 页面组件 (Pure UI, unaware of Service implementation)
function UserPage() {
  const { state, actions } = useModule(UserImpl)
  return <Table dataSource={state.items} loading={state.loading} onChange={(p) => actions.fetch({ page: p.current })} />
}

// 4. 路由入口 (The Fractal Boundary)
export default function UserRoute() {
  // 直接通过 layer 属性注入 UserServiceLive
  // RuntimeProvider 会自动将其合并到当前 Context 中
  return (
    <RuntimeProvider layer={UserServiceLive}>
      <UserPage />
    </RuntimeProvider>
  )
}
```

## 4. 应对差异化：Progressive Complexity

"通用模板"最怕遇到"特殊需求"。Logix v3 的架构设计天然支持**渐进式复杂性 (Progressive Complexity)**，确保这套玩法能“兜得住”。

### 4.1 Level 1: Service 层的差异化

如果只是 API 参数不同、或者需要聚合多个接口，直接在 `UserServiceLive` 中处理。

```typescript
// 差异化：列表接口需要额外传一个 tenantId，且返回结构需要转换
export const ComplexUserLayer = Layer.succeed(UserService, {
  list: ({ page }) =>
    Effect.gen(function* () {
      const tenantId = yield* Config.string('TENANT_ID')
      const raw = yield* Effect.tryPromise(() =>
        fetch(`/api/${tenantId}/users?page=${page}`).then((r) => r.json()),
      )
      return { items: raw.data.map(adaptUser), total: raw.meta.total } // 伪代码：按实际返回结构适配
    }),
  // ...
})
```

**结论**：Logic 依然通用，复杂度下沉到 Service 实现。

### 4.2 Level 2: Logic 层的扩展 (Additive)

如果页面有了额外的交互（例如“批量导出”），而 Template 里没有。

```typescript
// features/user/UserExtension.ts
import { UserModule } from './UserModule' // Template 生成的 Module

// 编写额外的 Logic
export const ExportLogic = UserModule.logic(($) => Effect.gen(function*() {
  yield* $.onAction('export').runFork(Effect.log("Exporting..."))
}))

// 组装时挂载
const UserImpl = makeImpl({ ... }).withLogic(ExportLogic)
```

**结论**：Template 负责 80% 的通用逻辑，剩下的 20% 通过 `withLogic` 挂载。

### 4.3 Level 3: Logic 层的拦截与重写 (Override)

如果 Template 的默认行为（例如删除后自动刷新）不符合需求（例如删除后只弹 Toast 不刷新）。

```typescript
// features/user/OverrideLogic.ts
export const OverrideLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    // 拦截 delete 动作
    // 使用 .prevent() 或类似机制阻止 Template 的默认逻辑（需引擎支持优先级/拦截）。
    // 或者，更简单地：Template 设计时提供 Hook 点；或直接不使用 Template 的 Delete Logic。
    yield* $.onAction('delete').run(({ payload: id }) =>
      Effect.gen(function* () {
        yield* api.delete(id)
        yield* Toast.show('Deleted')
        // 不调用 fetch，从而改变了默认行为
      }),
    )
  }),
)
```

> **最佳实践**：如果差异过大，建议直接**Eject**。即：不再使用 `makeCrudModule` 生成的 Logic，而是只复用它的 State/Action 定义，自己重写 Logic。
>
> ```typescript
> // 只复用结构，不复用逻辑
> const { Module } = makeCrudModule(...)
> const MyCustomLogic = Module.logic(...)
> ```

### 4.4 Level 4: Eject (完全分叉)

当业务演进到完全不再是 CRUD（例如变成了即时通讯列表），此时应该果断放弃 CRUD Template，手写一个新的 Module。

由于 Logix 的模块化特性，切换成本极低：

1.  新建 `ChatModule`。
2.  修改 `UserRoute` 中的引用。
3.  Service 层依然可以复用（如果需要）。

## 5. 总结

通过 **Template + Service Injection + Logic Composition**，我们构建了一个**有底线、无上限**的开发模式：

- **底线 (Template)**: 保证 80% 的 CRUD 页面 5 分钟写完，且具备高水准的交互体验。
- **中间态 (Extension)**: 通过 Service 适配和 Logic 挂载，从容应对 15% 的微调需求。
- **上限 (Eject)**: 遇到 5% 的变态需求，直接退回原生 Logix 开发模式，没有任何框架包袱。
