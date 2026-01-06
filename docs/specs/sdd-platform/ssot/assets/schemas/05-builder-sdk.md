# 5. Logix Builder SDK (`@logix/builder`)

为了支持 **pattern-style 长逻辑封装**，Logix 体系提供了一套基于 Store / Logic / Flow 的 Builder SDK。它不是另一个运行时，而是帮助开发者（或 LLM）更容易写出「可被平台理解的 `(input) => Effect` 函数」。

详细设计仍参考：`.codex/skills/project-guide/references/runtime-logix/builder-sdk/01-builder-design.md`，但当前主线的约定是：

```typescript
import { Effect } from "effect";

// 示例：使用 Builder 定义一个 pattern-style 提交流程
// 对外暴露的只是 (input) => Effect 程序，本身不引入第二套 Flow/Logic 运行时。
export const runReliableSubmit = (input: { data: SubmitData }) =>
  Effect.gen(function* (_) {
    // 内部可以调用 Module Service 或其它 pattern-style 函数；
    // 如需与 Logix ModuleRuntime / Flow 交互，则由调用侧在 Module.logic 中通过 Bound API `$` 访问 state / flow / 结构化控制流（Effect.* + $.match）。
  });
```

**核心价值**：
1.  **同构体验**：pattern-style 函数在语言层面仍基于 Effect / Service / Config，与业务 Logic 使用的原语一致；区别只在于它被资产化为 `(input) => Effect`。
2.  **类型安全**：基于 TypeScript 与本地 `effect` d.ts 的强类型推导。
3.  **逻辑复用 (Composition)**：长逻辑本质是 `(input) => Effect`，可以像积木一样组合，并在平台层选择性资产化（挂接 id/configSchema 等 meta）。
4.  **图码同步**：通过 Logic / Flow / 结构化控制流在业务 Logic 中的标准调用（如 `flow.runLatest` / `$.match` 等），Parser 可以稳定识别逻辑骨架并渲染为图；pattern-style 函数则作为图中的 `effect-block` 节点出现。
