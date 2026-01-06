# 3. Fluent 白盒子集与 Effect 纯度（硬约束）

Agent 输出的代码必须遵守当前主线确定的“白盒子集”和 Effect 约定。违反这些约束，Parser 将直接拒绝生成 IntentRule：

1. **Fluent 链形态（白盒子集）**
   - 仅以下形态被视为白盒 Fluent 链，并被 Parser 还原为 IntentRule：
    - `yield* $.onState(selector).debounce(300).update(...)`
    - `yield* $.onAction(predicate).throttle(200).runLatest(effect)`
    - `yield* $.on(streamExpr).filter(...).runExhaust(effect)`
   - 约束：
     - 链必须写在**单条 `yield*` 语句**中，不得拆成中间变量：
      - ✅ `yield* $.onState(...).debounce(300).runLatest(...);`
      - ❌ `const flow = $.onState(...).debounce(300); yield* flow.runLatest(...);`（Parser 视为 Raw Block）。
     - 中间算子必须来自受支持子集：`debounce` / `throttle` / `filter` 等，后续可扩展，但 Agent 不得擅自创造新算子名。

2. **Effect 纯度：禁止在 Logic 中使用 async/await**
   - Logic 与 Handler 内部不得直接使用 `async/await` 或返回 Promise 的函数：
     - `run* / run*Task` 的 handler 必须返回 `Effect.Effect`（通常由 `Effect.gen(function*(){ ... })` 构造），不得是 `async () => { ... }`。
     - 若需要调用 Promise API，应视为 Service 封装问题：由人类/平台在 Service 层使用 `Effect.tryPromise` / `Effect.promise` 包裹；Agent 只调用 `yield* api.method(...)`。
   - Parser 在遇到 `async` 形式的 Handler 时，应当返回 `ERR_ASYNC_HANDLER`，并提示 Agent 改写为 `Effect.gen + yield*` 形式。

3. **IR-first：优先使用 Fluent 子集表达 IntentRule**
   - Agent 的首要目标不是“写出任何能跑的代码”，而是**用 Fluent 子集表达 IntentRule**：
     - 在保证类型与业务语义正确的前提下，应优先选择 `$.onState/$.onAction/$.on + pipeline + .update/.mutate/.run*` 与 `$.match` 的组合；
     - 只有在需求确实无法落在 Fluent 子集内，或用户明确要求“Eject 到代码”时，才允许生成 Raw Block（例如直接编排 `Flow.*` / 复杂 `Effect`）。
   - Prompt 层推荐加入显式指令：**“除非万不得已，不要写 Parser 无法识别的结构（如拆链/任意 `async` handler）。”**
