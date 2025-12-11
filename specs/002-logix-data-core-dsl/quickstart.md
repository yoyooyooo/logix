# Quickstart: 从模块作者视角使用 `@logix/core` + `@logix/data`（隶属已归档 spec，仅供参考）

> 提示：本 Quickstart 隶属于已归档的 `specs/002-logix-data-core-dsl` 特性，描述的是早期「Module DSL ↔ `@logix/data`」集成路径。当前主线已由 StateTrait / `@logix/core` 统一承载字段能力，新示例请参考 `specs/001-module-traits-runtime/quickstart.md`。

**目标读者**：模块作者 / 业务开发者  
**前提**：已在仓库中安装并配置好 `@logix/core` 与 `@logix/data`，并使用 TypeScript + Effect v3。

本 Quickstart 以“计数器模块 + 远程 Profile 资源”为例，展示模块作者如何在 **同一个 Module 定义中** 同时使用 core 和 data：

- 定义 State 结构；
- 使用 DSL 为字段挂上 Computed / Source / Link 能力；
- 由 Runtime 自动挂载行为，并在 Devtools 中看到字段能力图。

> 具体 API 形状将在实现阶段敲定，本 Quickstart 更关注“使用者视角的步骤与心智模型”。

---

## 1. 定义模块 State 与字段能力

从模块作者视角，目标是“在一个地方把模块的状态和字段能力都说清楚”：

```ts
// 示例路径：packages/logix-core/examples/CounterWithProfileModule.ts

import * as Logix from "@logix/core"
import { Schema } from "effect"
import { Computed, Source, Link } from "@logix/data"

// 1) 定义模块 State Schema
const CounterWithProfileState = Schema.Struct({
  counter: Schema.Number,
  profile: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
  }),
  // 例如：从远程接口加载的 profile 资源状态
  profileResource: Schema.Any, // 实际实现中会用更精确的 Schema
})

// 2) 用 Module DSL 声明模块，并为字段加上能力（草图示意）
export const CounterWithProfileModule = Logix.Module.make("CounterWithProfile", {
  state: CounterWithProfileState,
  actions: {
    increment: Schema.Void,
    loadProfile: Schema.String, // 用户 ID
  },
  // 假设在实现阶段，我们会在这里接入 @logix/data 的字段能力 DSL：
  // data: ({ field }) => ({
  //   counter: Computed.for({ ... }),
  //   profileResource: Source.field({ resource: "user/profile" }),
  //   "profile.name": Link.to({ from: "profileResource.name" }),
  // }),
  // 当前 Quickstart 只强调“写法心智”，具体 API 形状在实现中细化。
})
```

从用户视角要点：

- 我只需要记得：**所有字段能力的声明，都跟模块定义待在一起**；  
- 我不用自己琢磨 Field / FieldCapability / StateGraph 的内部结构，只要通过 DSL 表达“这是 Computed / Source / Link”；  
- IDE 会基于 State Schema 给我字段路径和类型提示（例如在 `Link.to` 里能点出 `profileResource.name`）。

---

## 2. 在 Runtime 中使用模块（core 视角）

模块作者在应用入口或测试中，只需要像普通模块一样使用 Runtime：

```ts
// 示例路径：examples/logix-react/src/CounterWithProfileApp.tsx

import * as Logix from "@logix/core"
import { CounterWithProfileModule } from "./CounterWithProfileModule"

// 创建 Runtime（简化示意）
const runtime = Logix.Runtime.make(CounterWithProfileModule /*, { layer: ... } */)

// 在 React 中使用（示意，实际由 @logix/react 提供 Hook）
// const { state, dispatch } = useModule(runtime, CounterWithProfileModule)
```

从用户视角要点：

- 我不需要显式调用任何 `@logix/data` 的 API 来“挂载能力”——Runtime 会在内部自动调用 `@logix/data` 的扫描和 Plan；  
- 我只要用好 `Module` 和 Runtime / React hook 即可。

---

## 3. 在 Devtools 或调试脚本中查看字段能力图

对于想要理解字段联动关系的模块作者或调试者，可以通过 Devtools 或脚本查看 StateGraph：

```ts
// 示例路径：packages/logix-devtools-react/src/某个调试入口.ts

import { makeStateGraph } from "@logix/data/graph"
import { scanModuleSchema } from "@logix/data/internal" // 实际导出路径待实现阶段敲定

// 假设 Runtime 提供了获取模块 State Schema 与能力声明的接口
const { fields, capabilities } = scanModuleSchema({
  moduleId: "CounterWithProfile",
  // from Module DSL
})

const graph = makeStateGraph({
  moduleId: "CounterWithProfile",
  fields,
  capabilities,
})

// Devtools 可以使用 graph.nodes / graph.edges 渲染出字段能力拓扑图
```

从用户视角要点：

- 字段能力与 StateGraph 是“顺带获得”的：只要按 DSL 写模块，工具就能还原出清晰的数据流图；  
- 即使不开 Devtools，我也可以通过简单脚本打印或检查 graph，以确认 Computed / Source / Link 的声明是否合适。

---

## 4. 小结：data + core 的使用心智

站在模块作者 / 业务开发的角度，这一波改造完成后，希望你能用下面几句话概括 data + core 的结合方式：

1. **写模块还是用 `Logix.Module.make`，只是多了“字段能力”的声明入口**；  
2. **字段能力只描述「这个字段是什么能力」，具体怎么算 / 怎么拉数据交给 Runtime 和 data 去合作处理**；  
3. **运行时挂载与 Devtools 图形化都是在 Module 定义的基础上自动衍生出来的**，不需要你手动维护多份配置。
