---
title: Agent-first API 生成守则
---

# Agent-first API 生成守则

## 0) 适用场景

用于让低能力模型、外部模型或 SubAgent 生成、评审、改写 Logix 代码。目标是稳定命中当前 API shape，减少伪 API、第二 owner 和边界外扩。

本页是 skill 内的自包含操作守则。安装到任意本地环境后，直接以本页规则作为 API 生成与评审依据。

若本页和用户本地代码短期不一致，优先遵守本页的 public API shape 和 negative space。实现差异应作为本地适配或版本差异处理，不得自行发明第二公开路线。

## 1) 总公式

```ts
Module.logic(...)
Logix.Program.make(Module, config)
Logix.Runtime.make(Program)
Logix.Runtime.check(CounterProgram, options?)
Logix.Runtime.trial(CounterProgram, options)
```

React 宿主读写公式：

```tsx
const handle = useModule(Program, options?)
const selected = useSelector(handle, selector, equalityFn?)
const dispatch = useDispatch(handle) // only when an existing action contract is provided
```

React 读侧默认 selector input 只生成 `fieldValue(path)`、少量同 UI 原子字段用 `fieldValues(paths)`，或领域包 selector primitives。不要生成无参 `useSelector(handle)`。函数 selector 属于专家输入，只有任务明确给出并且能通过 core selector precision admission 时才使用。

Form 领域公式：

```ts
Form.make(id, config, ($) => {
  $.field(path).source(...)
  $.field(path).companion(...)
  $.field(path).rule(...)
  $.root(...)
  $.list(...)
  $.submit(...)
})
```

代码导入默认使用：

```ts
import * as Logix from "@logixjs/core"
import * as Form from "@logixjs/form"
import { Effect } from "effect"
import {
  RuntimeProvider,
  fieldValue,
  useModule,
  useSelector,
} from "@logixjs/react"
```

默认验证代码只生成 `Logix.Runtime.check` 与 `Logix.Runtime.trial`。

不要生成 compare 调用或任何 root compare facade。`compare` 只作为控制面阶段名出现在评审文本中。

当前推荐主链从已定义好的 module 对象进入 `.logic(...)`，再经 `Program.make(...)` 和 `Runtime.make(...)` 装配运行。

不要为了“展示写侧”发明 action。只有任务明确给出现有 action creator、reducer action 或 submit command 时，才导入 `useDispatch` 并调用它。禁止猜测 string action、submit action 名或 payload shape。

## 1.1) Core 最小生成骨架

低能力模型生成 Core 逻辑时，优先套这个骨架。`CounterModule` 这类 module 定义对象、`CounterInitialState` 和业务 watcher 由本地项目补齐。

```ts
import * as Logix from "@logixjs/core"
import { Effect } from "effect"

const CounterLogic = CounterModule.logic("counter-logic", ($) => {
  // declaration at builder root
  return Effect.void
})

const CounterProgram = Logix.Program.make(CounterModule, {
  initial: CounterInitialState,
  logics: [CounterLogic],
})

const runtime = Logix.Runtime.make(CounterProgram)

await Logix.Runtime.check(CounterProgram, { mode: "static" })
await Logix.Runtime.trial(CounterProgram, { mode: "startup" })
```

`Module.logic(...)` 表示 module 对象上的 `.logic(id, build)` authoring entry，不表示必须存在 root `Logix.Module.logic(...)` namespace function。builder 根部只做同步声明，返回值是唯一 run effect。若本地代码的 exact declaration helper 与骨架不同，仍保持 `Module.logic -> Program.make -> Runtime.make` 主链。

Readiness 只生成 `$.readyAfter(effect, { id?: string })`。它表示 instance 在该 effect 成功后才 ready；effect 失败时 instance acquisition 失败。不要生成 `$.lifecycle.*`、`$.startup.*`、`$.ready.*`、`$.resources.*`、`$.signals.*`、`$.beforeReady(...)` 或 `$.afterReady(...)`。启动后长期行为写在 returned run effect 里；动态资源释放使用 `Effect.acquireRelease` 或 Scope finalizer；未处理失败观察走 Runtime / RuntimeProvider / diagnostics；host signals 走 Platform / host carrier。

## 1.2) Form 最小生成骨架

低能力模型生成 Form 领域代码时，优先套这个骨架。`Schema`、`Rule` 和 `Resource` 由本地项目补齐，不发明第二套 API。

`Form.make(...)` 的返回值就是进入 `Logix.Runtime.make(...)` 与 `useModule(...)` 的对象。Form 领域主链不再包一层 `Program.make(...)`。

```tsx
import * as Logix from "@logixjs/core"
import * as Form from "@logixjs/form"
import {
  RuntimeProvider,
  fieldValue,
  useModule,
  useSelector,
} from "@logixjs/react"

const CheckoutForm = Form.make("checkout", {
  values: CheckoutValues,
  initialValues: {
    countryId: "",
    provinceId: "",
    warehouseId: "",
    items: [],
  },
  validateOn: ["onSubmit"],
  reValidateOn: ["onChange"],
}, ($) => {
  $.field("provinceId").source({
    resource: ProvincesByCountry,
    deps: ["countryId"],
    key: (countryId) => countryId ? { countryId } : undefined,
    triggers: ["onMount", "onKeyChange"],
    debounceMs: 150,
    concurrency: "switch",
    submitImpact: "observe",
  })

  const warehouse = $.field("warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      return {
        availability: { kind: "interactive" as const },
        candidates: { items: [] },
      }
    },
  })

  $.field("warehouseId").rule(uniqueWarehouseRule)
  $.list("items").rule(uniqueItemsRule)
  $.root(rootCheckoutRule)
  $.submit({ decode: CheckoutSubmitSchema })

  return [warehouse] as const
})

const runtime = Logix.Runtime.make(CheckoutForm)

await Logix.Runtime.check(CheckoutForm, { mode: "static" })
await Logix.Runtime.trial(CheckoutForm, { mode: "startup" })

function CheckoutApp() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CheckoutView />
    </RuntimeProvider>
  )
}

function CheckoutView() {
  const form = useModule(CheckoutForm)
  const warehouseId = useSelector(form, fieldValue("warehouseId"))
  const warehouseError = useSelector(form, Form.Error.field("warehouseId"))
  const warehouseBundle = useSelector(form, Form.Companion.field("warehouseId"))

  return null
}
```

## 2) Owner-lane 决策表

| 场景措辞 | 选择 | 禁止 |
| --- | --- | --- |
| 远端查询、远端校验、异步获取 options、stale、pending | `field(path).source(...)` | `companion.lower` 内 IO、manual refresh helper |
| 本地可用性、候选集整形、keep current、UI 辅助事实 | `field(path).companion({ deps, lower })` | final blocking、errors、submit verdict、远端 IO |
| required、唯一性、互斥、提交阻塞、decode、最终错误 | `field(path).rule(...)`、`root(...)`、`list(...)`、`submit(...)` | companion final truth owner |
| React 读取字段值 | `useSelector(handle, fieldValue(path))` | second hook family、public path carrier |
| React 读取少量同 UI 原子字段 | `useSelector(handle, fieldValues(paths))` 返回 tuple | object/struct projection descriptor、把无关字段塞进同一个 tuple |
| React 读取字段错误 | `useSelector(handle, Form.Error.field(path))` | second report object、helper-side precedence、guessed aggregate error helper |
| React 读取 companion bundle | `useSelector(handle, Form.Companion.field(path))` | second hook family、carrier-bound selector route |
| row-scoped companion read | `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))` | public row owner token |
| React 读取 whole-state snapshot | 不生成；拆成明确 selector input | no-arg `useSelector(handle)`、动态函数 selector fallback、broad state read |
| React 函数 selector | 只在专家任务明确给出并通过 core selector precision admission 时使用 | L0/L1 默认 recipe、源码推断、silent module-topic fallback |
| React 写入动作 | `useDispatch(handle)` 只调用已给定 action contract | guessed string action、guessed submit command、invented payload shape |
| 静态合同检查 | `Logix.Runtime.check(CounterProgram, { mode: "static" })` | 暗中启动 trial |
| 启动试运行 | `Logix.Runtime.trial(CounterProgram, { mode: "startup" })` | 交互脚本协议 |
| 验证文件内交互脚本 | 只在验证文件内使用交互试运行 | public scenario business asset |
| 评审文本中的对比阶段 | compare stage label in review text | compare call、raw evidence default compare、benchmark truth owner、root compare facade |

## 3) 正确片段

Remote fact 走 source：

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => countryId ? { countryId } : undefined,
  triggers: ["onMount", "onKeyChange"],
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

Local soft fact 走 companion：

```ts
const warehouseCarrier = $.field("warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: { kind: "interactive" as const },
      candidates: { items: [] },
    }
  },
})

return [warehouseCarrier] as const
```

Final truth 走 rule / submit：

```ts
$.field("warehouseId").rule(uniqueWarehouseRule)
$.submit({ decode: SubmitSchema })
```

React read 只走 single selector gate：

```tsx
const value = useSelector(form, fieldValue("warehouseId"))
const [warehouseId, quantity] = useSelector(form, fieldValues(["warehouseId", "quantity"]))
const error = useSelector(form, Form.Error.field("warehouseId"))
const companion = useSelector(form, Form.Companion.field("warehouseId"))
const rowCompanion = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Forbidden React read shapes，以下代码块只作负向示例，禁止作为生成模板：

```tsx
useSelector(form)
useSelector(form, (state) => state.warehouseId)
```

L0/L1 默认 Form 错误读取只生成 `Form.Error.field(path)`。其他错误聚合读取需要任务明确给出。

Verification 只走 runtime control plane。Core 代码使用 Core program 变量：

```ts
const checkOutcome = await Logix.Runtime.check(CounterProgram, { mode: "static" })

const startupOutcome = await Logix.Runtime.trial(CounterProgram, {
  mode: "startup",
})
```

Form 代码使用 Form object 变量：

```ts
const checkOutcome = await Logix.Runtime.check(CheckoutForm, { mode: "static" })

const startupOutcome = await Logix.Runtime.trial(CheckoutForm, {
  mode: "startup",
})
```

验证脚本专用规则：只有任务明确要求测试文件、验证文件或 SubAgent 压测任务时，才可以使用交互试运行。输入形状是 `fixtures/env + steps + expect`，它只是验证脚本输入，禁止作为业务 authoring API。

业务代码禁止生成 scenario object、report object 或 evidence object。

## 4) 边界替代写法

远端 IO 统一写到 `source`：

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => countryId ? { countryId } : undefined,
})
```

final truth 统一写到 rule / root / list / submit：

```ts
$.field("warehouseId").rule(uniqueWarehouseRule)
$.root(rootCheckoutRule)
$.list("items", itemsListSpec)
$.submit({ decode: CheckoutSubmitSchema })
```

companion read 统一走 selector primitive：

```tsx
const bundle = useSelector(form, Form.Companion.field("warehouseId"))
```

compare 只作为 control-plane stage label 处理标准化 outcome 或关键工件摘要。禁止生成 compare 调用。业务代码只保留 startup trial：

```ts
const startupOutcome = await Logix.Runtime.trial(CounterProgram, { mode: "startup" })
```

示例中的 `Outcome` 变量只表示 control-plane 调用返回值，不能抽象成 public report object、业务类型或业务依赖对象。

## 5) Returned-carrier typing 规则

需要 `Form.Companion.field/byRowId` 的 exact lower-result typing 时，让 `define` callback 返回 carrier 或 carrier tuple。

```ts
const InventoryForm = Form.make("inventory", config, ($) => {
  const warehouse = $.field("warehouseId").companion({
    deps: ["countryId"],
    lower(ctx) {
      return { candidates: { items: [] } }
    },
  })

  return [warehouse] as const
})
```

returned carrier 只用于类型元数据回传。React 读取永远写 `useSelector(handle, Form.Companion.field(...))` 或 `useSelector(handle, Form.Companion.byRowId(...))`。

`void` callback 写法 runtime-valid，但 exact companion selector result 必须诚实降级。不要把它写成已自动收集 metadata。

## 6) 评审清单

让 SubAgent 或低能力模型评审时，要求逐项回答：

| check | pass 条件 |
| --- | --- |
| owner lane | source、companion、final truth、host read、verification 没有混用 |
| public surface | 没有新增 Form hook family、public path carrier、public row owner token、public scenario/report noun |
| selector route | 所有 React read 都经 `useSelector(handle, selector)` |
| action route | 缺失 action contract 时没有发明 string action、submit action 或 payload shape |
| type honesty | `fieldValue` literal path、returned-carrier companion typing、`void` callback honest-unknown 表述准确 |
| verification boundary | `check / trial / compare` 只作为 runtime control plane，不进入业务 authoring；没有生成 compare 调用 |
| evidence boundary | 没有第二 report object、raw evidence default compare、benchmark truth owner |
| reopen discipline | 发现摩擦先归为 docs / examples / diagnostics，只有 proof 失败才建议重开 public API |

推荐输出字段：

- `verdict`: `safe` / `docs-risk` / `diagnostic-risk` / `reopen-needed`
- `wrong_api_found`
- `owner_lane_confusions`
- `selector_route_confusions`
- `verification_boundary_confusions`
- `recommended_followup`
