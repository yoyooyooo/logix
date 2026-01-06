# Platform · Implementation Notes (平台实现备忘录)

> **Status**: Living (Implementation Planning)
> **Scope**: 平台侧解析 / 出码 / 可视化 等能力的实现草图与技术备忘，不直接面向业务使用者。

本目录用于沉淀 **平台视角** 下的实现细节与技术决策，特别是与 Logix Runtime 紧耦合的部分，例如：

- Universe View / Galaxy View 如何消费 `ModuleDef`（`Logix.Module.make(...)` 返回）/ Root program module / `IntentRule` 等结构化信息；
- Parser 如何从 TS 代码中还原 IntentRule / Logic Graph，并与平台 UI 做双向同步（Full‑Duplex）的“可解析子集”定义；
- 平台如何基于 Module/App/Store 拓扑做依赖检查、风险分析（循环依赖、跨域过多联动等）与可视化提示。

## 使用方式

- 当我们在讨论 **平台与 runtime 的集成协议** 时（例如 App/Module/Store 模块树 → Universe View、IntentRule ←→ TS 代码、AOP 中间件在平台 UI 中的配置方式），除了更新主规范（`docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md`、`docs/specs/sdd-platform/ssot/ir/00-codegen-and-parser.md` 等），还应在本目录下补一份「平台实现视角」的技备文档：
  - 描述解析/生成的核心数据流与关键 AST Pattern；
  - 明确哪些代码写法被视为“可解析子集”，哪些会退化为 Gray/Black Box；
  - 记录与 Logix Runtime 的耦合点（例如：如何利用 `ModuleDef.imports/providers/exports/processes/middlewares` 构建 Universe View）。

## 规划中的子文档

建议按功能域拆分实现备忘：

- `app-and-universe-view.md`
  记录平台如何从 `Logix.Module.make(...)`（ModuleDef）构建模块拓扑（Universe View）：
  - AST 解析入口（`Logix.Module.make(...)` / `Logix.provide(...)` / `imports/providers/processes/exports`）；
  - Drill‑down 规则（Module 展开为 Store / Process 节点）；
  - 依赖检查与错误提示策略（未 export Tag 的非法引用、循环依赖等）。

- `intent-rule-and-codegen.md`
  记录 IntentRule 与 TS 代码之间的映射实现：
  - Parser 如何识别 Fluent DSL（`$.onState` / `$.onAction` / `$.on`）/ Flow 组合并还原为 IntentRule；
  - Generator 如何从 IntentRule 生成标准化 `*.logic.ts` 代码；
  - 可解析子集的边界规则与 ESLint / 工具链约束。

- `logic-middleware-and-aop-ui.md`
  记录平台侧如何配置与展示 Logic Middleware / AOP：
  - 如何从 `ModuleDef.meta.aop.middlewares` 与代码中的 `Logic.compose(...)` / `secure(effect, meta)` 推导横切能力；
  - 在 Logic 图与节点属性面板上的映射方式。

> 注：本目录是平台实现者的“工作草稿区”。一旦某个实现细节上升为长期稳定的协议或规范，应同步回写到主规格文档，并在此处留链接说明。

## Fluent Intent / Universal $ 的平台实现注意事项

结合 `docs/specs/sdd-platform/ssot/ir/00-codegen-and-parser.md` 与 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`，平台侧在实现解析与出码时需要特别注意以下硬约束：

1. **解析入口：以 `$` 与 Module 为中心**
   - 解析器不再围绕 `Flow.from().pipe(...)`，而是以以下结构作为主入口：
     - `const X = Logix.Module.make("Id", { state, actions })`：定义领域模块与 Id；
     - `X.logic(($) => Effect.gen(function* (_) { ... }))`：标记 Logic 单元与 `$` 上下文；
     - `yield* $.use(ModuleOrService)`：构建依赖符号表（Module / Service）。
  - 平台应将“`Logix.Module.make(...)` + `.logic` + `$.use` + Fluent 链”视作完整的 **逻辑编排上下文**，其他代码仅作为补充信息显示。

2. **Fluent 链的白盒子集与 AST 模式**
   - 白盒模式仅覆盖以下直接调用形态（单语句，不经中转变量）：
     - `yield* $.onState(selector).debounce(...).update/mutate/run*(...)`；
     - `yield* $.onAction(predicate).throttle(...).update/mutate/run*(...)`；
     - `yield* $.on(streamExpr).filter(...).run*(...)`。
   - 实现时应优先用简单的模式匹配（例如“嵌套 CallExpression 链 + 最外层是 YieldExpression”），避免构建复杂的控制流分析；
   - 一旦链条被拆成中间变量或包裹在高阶函数里，即视为 Raw Mode，解析器只记录最外层 Effect Block 的位置信息。

3. **Symbol Table：`$.use` 驱动的依赖拓扑**
   - 解析器必须建立“局部变量名 → StoreId / ServiceId”的符号表：
     - `const $User = yield* $.use(User)` → `$User` 绑定到 StoreId `"User"`；
     - `const tracker = yield* $.use(Analytics)` → `tracker` 绑定到 Service `"Analytics"`。
   - 在解析 Fluent 链时，通过该符号表判断：
     - 某个 `$.on($User.changes(...))` 的 Source 属于哪个 Store；
     - `.run*` 的 handler 内出现的 `$User.dispatch(...)` / `$.state.update/mutate(...)` / `tracker.track(...)` 的归属（Store/Service）。
   - 若代码未通过 `$.use` 获取依赖（例如直接使用 Tag），平台可以选择：
     - 要么完全不解析该部分（标记为 Raw）；
     - 要么在 Universe/Galaxy 视图中降级为“未建模依赖”，但不对其做语义推断。

4. **IntentRule IR 的生成与回写**
   - 对白盒 Fluent 链，解析器应生成完整的 IntentRule：
     - `source`：从 `$.onState/$.onAction/$.on` + 符号表推导；
     - `pipeline`：从 `.debounce/.throttle/.filter/.map` 等算子推导；
     - `sink`：以终端算子 `.update/.mutate/.run*` 为准；对 `.run*` 仅在可识别的“直接调用”形态下提取结构，其余降级为 Gray/Black Box。

- IR 层统一使用 `IntentRule` 结构来表达语义，不再依赖任何 `Intent.*` 命名空间；
- Graph → Code 时，平台修改 Fluent 链（而不是生成额外的适配 API），保证代码与 IR 的单一事实源仍是 `$`。

5. **Eject / Raw Mode 的平台行为**
   - 一旦用户在画布中选择“Eject to Code”：
     - 平台应将 Fluent 链转换为底层 `$.flow.fromX().pipe(..., run*)` 或其他 Effect 组合；
     - 在对应节点上标记为 Raw Mode，并在 IR 中保留最小元信息（所属 Store/Logic、可能的 Source/Sink 概略）；
     - 后续编辑不再尝试将该节点还原为 Fluent Card，仅提供“打开代码”入口。
   - 解析器不得在 Raw Mode 上做复杂的“反向恢复 Fluent”尝试，以避免实现复杂度失控。

6. **Ghost Annotation 的使用边界**
   - `@intent-sink` 等幽灵注解仅用于极端场景（例如 Sink 通过高阶函数动态传入），不应成为主流路径；
   - 平台实现上应遵循：
     - 优先依赖结构化 Fluent 链与 `$.use`；
     - 仅在无法静态推导时读取注释，并在 UI 上显式提示“此规则依赖注释，请谨慎修改”；
     - 若后续代码被改写为标准 Fluent 写法，应自动移除或标记注释为过期。

7. **与 Runtime 的契约对齐**
   - 平台假设 runtime 对以下约束负责：
     - StoreHandle 无跨 Store 写接口（只有 `read/changes/dispatch`），保证 IR 中“谁写谁”的关系可靠；
     - Fluent 链在运行时等价于 Flow/Effect 组合，不会引入额外的隐形控制流。
     - 若实现中需要突破上述约束（例如新增新的 `$.on*` 变种或新的白盒终端），必须同步更新：
     - `docs/specs/sdd-platform/ssot/ir/00-codegen-and-parser.md`（解析规则）；
     - `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`（Bound API 契约）；
     - 本 README（平台实现备忘）。

以上条目旨在保证：**只要业务代码遵守 Fluent DSL 的写法，平台就能在可控复杂度下提供稳定的 Graph ↔ Code 双向同步；一旦业务脱离这套写法，平台则有清晰的降级策略，而不会“半懂半不懂”。**
