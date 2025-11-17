# 6. Parser：执法者与反馈循环

Parser 是 Code-First 路径下的“执法者”，负责在类型与 AST 层面执行上述约束，并为 Agent 提供结构化反馈。

## 6.1 职责与输入输出

- 输入：
  - 单个 Logic 文件的 TypeScript 文本（或 AST）；
  - 可选：对应的 IntentRule / Spec 元信息，用于验证上下文一致性。
- 行为：
  - 扫描 `yield* $.onState(...) / $.onAction(...) / $.on(stream)...` 形态的 Fluent 链；
  - 尝试将其还原为 `{ source, pipeline, sink }` 结构的 IntentRule；
  - 识别常见违规模式并给出错误码（例如 `ERR_ASYNC_HANDLER` / `ERR_SPLIT_CHAIN` / `ERR_UNSUPPORTED_OP`）。
- 输出：
  - 成功：`{ rules: IntentRule[], errors: [] }`，每条规则附带位置与简要说明；
  - 失败：`{ rules: PartialIntentRule[], errors: ParseError[] }`，提供足够信息帮助 Agent/人类定位问题。

> 实现建议：
> 首版 Parser 可以基于 `ts-morph` 实现为 CLI 工具：
> `pnpm tsx scripts/intent-fluent-parser.ts --file path/to/logic.ts`，
> 只支持最小 Fluent 子集与少量错误码即可，后续再迭代。

## 6.2 与 Agent 的交互模式

- 在 Copilot / Agent 场景中，一次完整的交互应包含：
  1. Agent 生成/修改 Logic 代码（遵守本补篇约束）；
  2. 平台调用 Parser 对最新代码做静态验证；
  3. 若通过：返回 IntentRule 集合与 Graph 预览；
  4. 若失败：将结构化错误（错误码 + 位置 + 简短说明）反馈给 Agent，让其自愈修复。
- Parser 不负责“替用户改代码”，只负责做**判定与解释**；修复行为始终由 Agent 或人类承担。
