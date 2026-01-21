# Quickstart：Kit Factory（语法糖机器）

> 目标：用最少代码展示 “造糖（定义 kit）→ 吃糖（traits/logic/workflow 使用）” 的统一写法。
> 本文以拟定 API 为准（实现按 `tasks.md` 推进）。

## 0) 心智模型（30 秒）

- Kit 只做组合（macro-like）：**不订阅、不 fork、不建 Scope**。
- 读侧：用 `ExternalStore → StateTrait.externalStore` 把外部快照写回状态图（external-owned）。
- 写侧：用显式 command/service port（Effect）在事务外执行，状态变化再通过 ExternalStore 写回。
- Workflow：只用 `Workflow.call/callById`，serviceId 规则不复制。
- meta：只承诺“可被裁剪为 Slim JSON 并进入 Root IR”（白名单裁剪见 `packages/logix-core/src/internal/state-trait/meta.ts` 的 `sanitize`）。推荐开发期用 `Kit.validateMeta(meta)` 自检（或依赖 dev warn），避免“写了但没进 Root IR”的困惑。

### 导入方式（Kit vs KitWorkflow）

Kit 与 Workflow sugar 分层（便于 tree-shaking）：

```ts
import * as Logix from "@logixjs/core"

// 组合糖（Trait/Logic/Input）
Logix.Kit

// Workflow sugar（薄封装：委托 Workflow.call/callById）
Logix.KitWorkflow
```

## 0.5 常见陷阱（⚠️）

### 0.5.1 meta 会被白名单裁剪（Root IR 只认可导出子集）

- 只保留：`label/description/tags/group/docsUrl/cacheGroup/canonical`
- `annotations` 只保留 `x-*` keys，且 value 必须是 JsonValue（函数/闭包/过深对象会被裁剪掉）
- 推荐：在 dev 环境对 `externalTrait({ meta })` 的 meta 做一次 `Kit.validateMeta(meta)` 预检，或依赖 Kit 的 dev warn

### 0.5.2 `Kit.forModule` 不支持“运行时动态选择某个 instance”

- `forModule` 只覆盖：imports 可解析到**唯一**源模块实例的 Module-as-Source
- 如果你需要动态选择：把 `instanceKey/rowId` 等显式建模为数据，用 `ReadQuery/Logic` 侧做选择；不要把动态选择伪装成静态 ExternalStore trait

### 0.5.3 Workflow stepKey 必须稳定（不要手写随意字符串）

- 推荐：domain kit 统一用 `Kit.makeStepKey(prefix, literal)` 生成（prefix=端口/领域名，literal=操作名）
- Kit v1 不会自动补 stepKey（避免隐式规则与漂移）

更多 domain kit 写法口径见：`specs/093-logix-kit-factory/domain-kit-guide.md`。

## 1) Service 端口型（Router/Session/Flags…都属同类）

### 1.1 定义端口契约（唯一真相源）

```ts
import { Context, Effect } from "effect"
import * as Logix from "@logixjs/core"

export type RouteSnapshot = { readonly pathname: string }

export type RouterPort = {
  readonly locationStore: Logix.ExternalStore.ExternalStore<RouteSnapshot>
  readonly navigate: (to: string) => Effect.Effect<void, never, any>
}

export class RouterPortTag extends Context.Tag("@app/RouterPort")<RouterPortTag, RouterPort>() {}
```

### 1.2 造糖：为该端口创建 kit

```ts
const Router = Logix.Kit.forService(RouterPortTag)
const RouteInput = Router.input((svc) => svc.locationStore)
```

#### 1.2.1 等价展开（de-sugared view）

```ts
import { Layer } from "effect"

const RouteStore = Logix.ExternalStore.fromService(RouterPortTag, (svc) => svc.locationStore)

const RouteTrait = Logix.StateTrait.externalStore({
  store: RouteStore,
  select: (snap) => snap.pathname,
})

const useRouter = ($) => $.use(RouterPortTag)
const provideRouter = (svc) => Layer.succeed(RouterPortTag, svc)
```

### 1.3 吃糖：traits/logic 里使用

```ts
traits: Logix.StateTrait.from(State)({
  "route.pathname": RouteInput.externalTrait({
    select: (snap) => snap.pathname,
    meta: {
      label: "route.pathname",
      annotations: { "x-domain": "router" },
    },
  }),
})

const Logic = Def.logic(($) =>
  Effect.gen(function* () {
    const router = yield* Router.use($)
    yield* $.onAction("nav/go").run(() => router.navigate("/me"))
  }),
)
```

### 1.4 吃糖：Workflow 里使用（分支示例）

```ts
const RouterWf = Logix.KitWorkflow.forService(RouterPortTag)

const steps = [
  RouterWf.call({
    key: Logix.Kit.makeStepKey("router", "navigate"),
    input: Logix.Workflow.object({ to: Logix.Workflow.constValue("/me") }),
    onSuccess: [],
    onFailure: [],
  }),
]
```

等价展开：`RouterWf.call(...)` ⇔ `Logix.Workflow.call({ service: RouterPortTag, ... })`（serviceId 规则以 `Workflow` 为单点真相源）。

## 2) Module-as-Source（跨模块输入）

```ts
const SelectedUserId = Logix.ReadQuery.make({
  selectorId: "rq_users.selectedUserId",
  reads: ["selectedUserId"],
  select: (s) => s.selectedUserId,
  equalsKind: "objectIs",
})

const UserIdInput = Logix.Kit.forModule(UsersDef, SelectedUserId)

traits: Logix.StateTrait.from(State)({
  "inputs.userId": UserIdInput.externalTrait(),
})
```

#### 2.1 等价展开（de-sugared view）

```ts
const Store = Logix.ExternalStore.fromModule(UsersDef, SelectedUserId)
traits: Logix.StateTrait.from(State)({
  "inputs.userId": Logix.StateTrait.externalStore({ store: Store }),
})
```

约束提醒：

- 目标模块必须 imports 源模块（否则 Module-as-Source 无法解析）。
- selectorId 必须稳定（禁止 `unstableSelectorId`）。
- `Kit.forModule` 不解决“运行时动态选择某个 instance”：imports 必须能解析到唯一源模块实例；动态选择应通过数据建模 + ReadQuery/Logic 侧解析完成。
