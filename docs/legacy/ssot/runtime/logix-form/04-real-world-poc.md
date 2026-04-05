# 实战示例：从“可运行示例”反推最佳落点（历史文件名保留）

> **Status**: Aligned (010-form-api-perf-boundaries)
> **Goal**: 用仓库内真实可运行的 Demo 作为“工程裁决”，避免用纯声明 d.ts 产生并行真相源。

本仓库已经有两套可运行入口，优先以它们作为示例/最佳实践的事实源：

- **可运行 Demo（React）**：`examples/logix-react/src/demos/form/*`
- **用户文档（产品视角）**：`apps/docs/content/docs/form/*`

## 1) 你应该从哪个 Demo 开始

- 最小闭环（controller + hooks）：`examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- ToB 案例集（动态列表/联动/Schema/Query）：`examples/logix-react/src/demos/form/FormCasesDemoLayout.tsx`
- 动态数组（trackBy + 行级校验 + 汇总 computed）：`examples/logix-react/src/demos/form/cases/case02-line-items.tsx`

## 2) 真实业务里的目录落点（推荐）

```text
src/features/order/
  OrderForm.ts           # Form.make(...) + traits/derived 声明
  OrderForm.runtime.ts   # （可选）独立 runtime 组装（本地 Devtools / 测试用）
  OrderForm.ui.tsx       # React 组件（useForm/useField/useFieldArray/useFormState）
```

关键裁决：

- **Form 声明独立成文件**：保证可复用、可被 Root imports 引入、便于测试
- **UI 只做订阅与事件派发**：不在组件里散落“手动 validate 的 useEffect”
- **跨模块协作靠 imports/link/source**：Form 不应该再自建平行的引擎/Store

## 3) Root Module 组合方式（imports）

Form 产出模块蓝图（`UserForm.impl` 为 `ModuleImpl`）：直接被 Root `imports` 引入即可。

```ts
import * as Logix from "@logixjs/core"
import * as Form from "@logixjs/form"
import { Schema } from "effect"

const Values = Schema.Struct({ name: Schema.String })
const UserForm = Form.make("UserForm", {
  values: Values,
  initialValues: { name: "" },
})

const RootModule = RootDef.implement({
  initial: { /* ... */ },
  imports: [UserForm.impl],
})

export const runtime = Logix.Runtime.make(RootModule, { devtools: true })
```

## 4) 动态列表的关键要点（避免错位）

动态数组必须同时满足两件事：

- **values 结构动作**：`arrayAppend/remove/move/swap`
- **辅助树同步搬运**：`ui.<listPath>` 与 `errors.<listPath>.rows`（以及 manual/schema rows）

这就是 `packages/logix-form/src/internal/form/arrays.ts` 里 `syncAuxArrays` 存在的原因：防止删除/重排后出现 touched/dirty/错误“跟错行”。

## 5) 性能边界：update vs mutate（高频写回）

- UI selector 只能减少 React 渲染 fan-out
- Runtime 的 converge/validate 仍依赖 patchPaths（dirtySet）来走增量

因此：

- Form 内置 reducers 会通过 reducer `sink(path)` 显式标注受影响路径
- 业务自定义高频写回优先 `$.state.mutate(...)` / `Form.Trait.*`（mutative 自动采集 patchPaths）

相关实现与解释链路：

- Form reducers：`packages/logix-form/src/internal/form/reducer.ts`
- patchPaths 生成：`packages/logix-core/src/internal/runtime/core/mutativePatches.ts`
- dirtyAll 退化点：`packages/logix-core/src/internal/runtime/ModuleRuntime.transaction.ts`
