# Quickstart: Module（默认定义对象）+ ModuleTag（高级身份锚点）

**Date**: 2025-12-21  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/022-module/spec.md`

## 0) 命名矩阵（本特性裁决）

- `ModuleDef`：`Logix.Module.make(...)` 返回；带 `.tag`；可 `.logic(...)` 产出逻辑值；`.implement(...)` 产出 `Module`；不带 `.impl`。
- `Module`：wrap module（通常由 `ModuleDef.implement(...)` 或领域工厂返回）；带 `.tag` + `.impl`；支持 `withLogic/withLayers`；`.logic(...)` 仍只产出逻辑值。
- `ModuleTag`：身份锚点（Context.Tag）；用于 Env 注入与“全局实例”解析。
- `ModuleImpl`：装配蓝图（`layer` + imports/processes 等）；用于创建局部实例。
- `ModuleRuntime`：运行时实例（真正的“实例”语义）。
- `ModuleHandle`：`yield* $.use(...)` 返回的只读句柄（可含 controller 等扩展）。
- `ModuleRef`：React `useModule(...)` 返回的 ref（含 state/actions/dispatch + 扩展）。

## 1) 你将获得什么

- Form/CRUD 等“领域工厂”返回同一种形状：`Module`（定义对象）。
- 你可以在 `Module` 上追加逻辑（`withLogic/withLogics`）与注入依赖（`withLayer/withLayers`），且保持不可变。
- 逻辑侧可以直接 `$.use(module)` 拿到“模块句柄（含 `actions` dispatchers）+ 领域扩展（如 controller）”（不再显式 `.module`）。
- 装配/运行侧入口可直接消费 `module`（不再显式 `.impl`），心智模型统一。
- Module 预留 `schemas/meta/services/dev.source` 等反射字段（可选）：供 Studio/Devtools/脚本通过运行时反射读取结构与链路信息（免静态分析）；其中 `dev.source` 预计由构建工具插件（vite/rsbuild/webpack）注入，本特性不实现自动注入（允许手工填写）。

## 2) 创建与组合（推荐心智模型）

- 领域工厂负责：定义模块 actionMap（action tags）+ 默认逻辑（install）/可选 controller。
- 业务侧负责：用 `logic` 产出可复用逻辑值，用 `withLogic/withLayers` 组合成最终“可运行形态”。
- 库作者建议通过 `Logix.Module.Manage.make(...)` 产出“模块工厂命名空间对象”（如 `CRUDModule`）：负责生成 Module（定义对象）、生成/暴露依赖 Tag（业务只管提供 Layer）、并统一注入句柄扩展（controller）。
- 业务开发使用领域工厂模块：`CRUDModule.make(id, spec, extend?)`（`extend.actions` 仅新增；`extend.reducers` 合并且允许覆盖；如 `idField` 等配置建议放进 `spec`），以保留默认能力并支持业务裁决。
- 业务开发定义普通模块：`Logix.Module.make(id, def, extend?)`（`extend.actions` 仅新增；`extend.reducers` 合并且允许覆盖），再用 `.implement({ initial, logics?, imports?, processes? })` 补齐实现。
- 覆盖默认逻辑：若你想覆盖领域包内置逻辑（例如 CRUD 的 `install`），用同一个 `id` 挂载新逻辑即可（默认 `last-write-wins`；dev 下会有可解释告警/诊断，便于确认覆盖链路是“有意的”）。

## 3) 在 Logic 中使用 actions/controller

- 通过 `yield* $.use(module)` 获取句柄，在句柄上直接调用 `actions`（模块 action dispatchers）/controller。
- `actions`（dispatchers）与 controller 的可用性必须与 React/装配侧一致（同一入口与语义）。
- 约束建议：`$.self` 主要用于拿“句柄扩展”（例如 controller）；dispatch 仍优先用 `$.actions.*`，并通过“command/result”分离或去重 guard 避免自触发闭环。

## 4) 在装配/运行侧消费（免拆壳）

- React hooks / Runtime 装配入口应允许直接传入 `Module`，由入口统一拆壳到蓝图（`module.impl`）。
- 迁移后，示例中不再需要为了挂载逻辑而额外创建“包装 Module”。

## 4.1) 消费语义矩阵（局部 vs 全局）

- `Logix.Runtime.make(module)`：等价于 `Logix.Runtime.make(module.impl)`（创建一棵新的 Runtime/作用域；该 Runtime 内 `module.tag`（ModuleTag）解析为 root singleton）。
- `yield* $.use(module)`：等价于 `yield* $.use(module.tag)`（从当前 scope 解析既有实例；可能是 root，也可能是 imports 的 child；不负责创建新实例）。
- `yield* module.tag`：直接解析 `ModuleRuntime`（同样从当前 Env/scope 解析；可能是 root，也可能是 imports 的 child；若需固定 root provider，用 `Logix.Root.resolve(module.tag)`）。
- `yield* $.self`：仅在 `module.logic(($)=>..., { id? })` 内可用，等价于“对当前 module 做一次 `$.use`”（拿到当前 `ModuleHandle`，含 controller）。
- React：`useModule(module)`：等价于 `useModule(module.impl)`（默认局部/会话级创建与缓存），并会把模块扩展（如 controller）合并到返回的 ref；若要使用 `RuntimeProvider` 内实例，请显式 `useModule(module.tag)`（ModuleTag，同样会合并扩展）。
- React：`useModule(moduleDef)`：等价于 `useModule(moduleDef.tag)`（全局实例；前提是 `RuntimeProvider`/Runtime 已提供该 `ModuleTag` 的运行时）。

## 5) 迁移要点（旧蓝图 → Module）

- 从“显式 `.module` / `.impl`”迁移到“直接传 module”：
  - `$.use(old.module)` → `$.use(module)`（等价拆壳）
  - `useModule(old.impl)` → `useModule(module)`（等价拆壳）
- `logic` 仍然只产出逻辑值；需要挂载到领域模块时使用 `withLogic/withLogics`。

## 5.1) 迁移：把 Module 当 Tag 用的调用点

> 说明：这是破坏性变更：新 `Module`（定义对象/wrap）不再是 `Context.Tag`，因此所有“把模块值当 Tag 用”的调用点都需要改写为显式拆壳（`.tag`）或通过 `$.use(module)` 统一拆壳。
> 本仓已完成迁移，本特性不再保留 codemod；若你在外部仓库/老分支迁移，按下列规则手工改写即可：

- 在 Logic `$` 作用域内：`yield* SomeModule` → `yield* $.use(SomeModule)`
- 不在 `$` 作用域内：`yield* SomeModule` → `yield* SomeModule.tag`
- Env 注入：`Layer.succeed(SomeModule, ...)` / `Effect.provideService(SomeModule, ...)` → 改用 `SomeModule.tag`

## 5.2) 表单迁移要点（FormBlueprint → Module）

- 旧：`Form.make()` 返回 `FormBlueprint`（含 `module/impl/controller.make(runtime)`），常见用法是 `useForm(blueprint)` 内部 `useModule(blueprint.impl)` 后再 `blueprint.controller.make(moduleRef.runtime)`。
- 新：`Form.make()` 返回 `Module`（含 `tag/impl/controller`），并支持 `withLogic/withLayers`；React 侧直接 `useModule(formModule)` 即可得到带 controller 的 `FormRef`（可选再提供 `useForm = useModule` 的 type-only alias）。
- 逻辑侧迁移：
  - `yield* $.use(formBlueprint.module)` → `yield* $.use(formModule)`；
  - 在 `formModule.logic(($)=>..., { id? })` 内，推荐用 `yield* $.self` 直接拿到带 controller 的句柄。

## 6) 示例（语义级）

> 说明：以下示例用于表达“语义与组合方式”，不锁死具体文件结构；最终以本特性落地后的类型与 API 为准。

### 示例 A：Form Module + 追加逻辑 + 运行（免 `.impl`）

```ts
const UserForm = Form.make("UserForm", {
  values: UserSchema,
  initialValues,
  traits,
})

// `.logic(...)` 只产出逻辑值（可复用）
const AutoValidate = UserForm.logic(
  ($) =>
  Effect.gen(function* () {
    const form = yield* $.self // 当前 Module 的句柄（含 controller）
    yield* form.controller.validate()
  }),
  { id: "AutoValidate" },
)

// `withLogic(...)` 才把逻辑挂到“可运行形态”（不可变返回新实例）
const LiveForm = UserForm.withLogic(AutoValidate)

const runtime = Logix.Runtime.make(LiveForm, {
  label: "UserForm",
  devtools: true,
})
```

### 示例 B：Logic 内直接使用 `$.self` 拿 controller（数组行增删改）

```ts
const SyncLineItems = LineItemsForm.logic(
  ($) =>
  Effect.gen(function* () {
    const form = yield* $.self
    yield* form.controller.fieldArray("items").append({ sku: "A", qty: 1 })
    yield* form.controller.fieldArray("items").move(0, 1)
  }),
  { id: "SyncLineItems" },
)

const LiveLineItemsForm = LineItemsForm.withLogic(SyncLineItems)
```

> 迁移：`controller.array(path)` 已重命名为 `controller.fieldArray(path)`（与 `useFieldArray` 对齐）。

### 示例 C：React 侧直接消费 Module（免 `.impl`）

```ts
const form = useModule(LiveForm) // 返回 ModuleRef + controller（方案B：自动扩展）
const firstName = useField(form, "firstName")
```

### 示例 D：迁移对照（旧 → 新）

```ts
// 旧：显式拆壳
Logix.Runtime.make(BasicProfileForm.impl)
yield* $.use(BasicProfileForm.tag)

// 新：入口直接吃 Module
Logix.Runtime.make(BasicProfileForm)
yield* $.use(BasicProfileForm)
```

### 示例 E：领域包可以不再提供 `useForm/useCrud` 这类“controller 投影 hook”

```ts
// 方案B 下：useModule(Module) 已自动把 controller 合并进返回的 ref
const form = useModule(UserForm)
void Effect.runPromise(form.controller.validate())
```

### 示例 F：普通 Module（state/actions/reducers，日常业务）

```ts
import * as Logix from "@logix/core"
import { Schema } from "effect"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: (state) => ({ ...state, count: state.count + 1 }),
  },
})

// `.implement(...)` 产出“可运行形态”（Module 里会带 `.impl`）
export const LiveCounter = Counter.implement({
  initial: { count: 0 },
})
```

### 示例 G：CRUDModule（模块工厂）如何提供与使用（库作者 vs 业务作者，Tag 由库提供）

```ts
import * as Logix from "@logix/core"
import { useModule } from "@logix/react"
import { Context, Effect, Layer, Schema } from "effect"

// ------------------------------------------------------------
// @logix/domain（库作者）：实现一个“CRUDModule 模块工厂命名空间”
// ------------------------------------------------------------

export interface CrudQueryApi<Entity> {
  readonly list: (
    input: { readonly pageSize: number },
  ) => Effect.Effect<ReadonlyArray<Entity>, { readonly _tag: "CrudApiError" }, never>
}

export interface CrudSpec<Entity> {
  readonly entity: Schema.Schema<Entity>
  readonly idField?: string
}

export const CRUDModule = Logix.Module.Manage.make({
  kind: "crud",
  define: <Entity>(id: string, spec: CrudSpec<Entity>) => {
    // `kind`：该“模块工厂”的模式标识（用于反射/Devtools 面板选择/默认 meta.kind；不影响运行时语义）。
    // 1) 依赖契约：Tag 由库提供，业务只管用 Layer 提供实现（支持多个 Tag）
    class QueryApi extends Context.Tag(`${id}/crud/queryApi`)<QueryApi, CrudQueryApi<Entity>>() {}
    const services = { queryApi: QueryApi }

    // 2) 模块 Shape（state/actions/reducers）：库作者在这里定义“CRUD 是什么”
    const StateSchema = Schema.Struct({
      items: Schema.Array(spec.entity),
      loading: Schema.Boolean,
    })

    const Actions = {
      query: Schema.Struct({ pageSize: Schema.Number }),
      querySucceeded: Schema.Array(spec.entity),
    } as const

    const Crud = Logix.Module.make(id, {
      state: StateSchema,
      actions: Actions,
      reducers: {
        query: (state) => ({ ...state, loading: true }),
        querySucceeded: (state, action) => ({
          ...state,
          loading: false,
          items: action.payload,
        }),
      },
      schemas: { entity: spec.entity },
      meta: { kind: "crud", idField: spec.idField },
      services,
    })

    // 3) 默认逻辑：在逻辑里使用服务（Tag）→ 做事 → dispatch 回本模块
    const install = Crud.logic(
      ($) =>
      Effect.gen(function* () {
        yield* $.onAction("query").runFork((action) =>
          Effect.gen(function* () {
            const api = yield* $.use(services.queryApi)
            const items = yield* api.list(action.payload)
            yield* $.actions.querySucceeded(items)
          }),
        )
      }),
      { id: "install" },
    )

    // 4) controller：高层 API（你想给 handle.controller 暴露什么，就在这里定义什么）
    const controller = {
      make: (runtime: Logix.ModuleRuntime<any, any>) => ({
        list: (input: { readonly pageSize: number }) =>
          runtime.dispatch({ _tag: "query", payload: input } as any),
        idField: spec.idField,
      }),
    }

    // 5) 扩展协议：同一份扩展同时作用于 $.use/$.self 与 useModule（方案B）
    const EXTEND = Symbol.for("logix.module.handle.extend")
    ;(Crud.tag as any)[EXTEND] = (runtime: any, base: any) => ({
      ...base,
      controller: controller.make(runtime),
      services,
    })

    // 6) 返回统一的 Module（定义对象）：业务后续只拿这个对象玩
    return Crud.implement({
      initial: { items: [] as ReadonlyArray<Entity>, loading: false },
      logics: [install],
    })
  },
})

// ------------------------------------------------------------
// 业务侧：只提供 Layer（不用自定义 Tag），并创建 OrdersCrud
// ------------------------------------------------------------

const OrderSchema = Schema.Struct({ id: Schema.String })

const OrdersCrud = CRUDModule.make("OrdersCrud", { entity: OrderSchema, idField: "id" })

// 覆盖默认逻辑（有意）：同一个 `id` 后挂载覆盖前者（dev 下会告警，便于确认覆盖链路）
const CustomInstall = OrdersCrud.logic(($) => Effect.void, { id: "install" })

const LiveOrdersCrud = OrdersCrud.withLogic(CustomInstall).withLayers(
  Layer.succeed(OrdersCrud.services.queryApi, { list: (_i) => Effect.succeed([]) }),
)

// React（方案B）：直接 useModule(Module) 得到带 controller 的 ref
const crud = useModule(LiveOrdersCrud)
void Effect.runPromise(crud.controller.list({ pageSize: 20 }) as any)
```
