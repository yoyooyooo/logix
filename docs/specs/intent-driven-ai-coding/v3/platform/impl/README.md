# Platform · Implementation Notes (平台实现备忘录)

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: 平台侧解析 / 出码 / 可视化 等能力的实现草图与技术备忘，不直接面向业务使用者。

本目录用于沉淀 **平台视角** 下的实现细节与技术决策，特别是与 Logix Runtime 紧耦合的部分，例如：

- Universe View / Galaxy View 如何消费 `ModuleDef` / `Logix.app` / `Logix.module` / `IntentRule` 等结构化信息；
- Parser 如何从 TS 代码中还原 IntentRule / Logic Graph，并与平台 UI 做双向同步（Full‑Duplex）的“可解析子集”定义；
- 平台如何基于 Module/App/Store 拓扑做依赖检查、风险分析（循环依赖、跨域过多联动等）与可视化提示。

## 使用方式

- 当我们在讨论 **平台与 runtime 的集成协议** 时（例如 App/Module/Store 模块树 → Universe View、IntentRule ←→ TS 代码、AOP 中间件在平台 UI 中的配置方式），除了更新 v3 主规范（`platform/README.md`、`06-codegen-and-parser.md` 等），还应在本目录下补一份「平台实现视角」的技备文档：
  - 描述解析/生成的核心数据流与关键 AST Pattern；
  - 明确哪些代码写法被视为“可解析子集”，哪些会退化为 Gray/Black Box；
  - 记录与 Logix Runtime 的耦合点（例如：如何利用 `ModuleDef.imports/providers/exports/processes/middlewares` 构建 Universe View）。

## 规划中的子文档

建议按功能域拆分实现备忘：

- `app-and-universe-view.md`  
  记录平台如何从 `Logix.app` / `Logix.module` / `ModuleDef` 构建模块拓扑（Universe View）：  
  - AST 解析入口（`Logix.app(...)` / `Logix.module(...)` / `Logix.provide(...)` / `imports/providers/processes/exports`）；  
  - Drill‑down 规则（Module 展开为 Store / Process 节点）；  
  - 依赖检查与错误提示策略（未 export Tag 的非法引用、循环依赖等）。

- `intent-rule-and-codegen.md`  
  记录 IntentRule 与 TS 代码之间的映射实现：  
  - Parser 如何识别 `Intent.andUpdate*` / `Intent.Coordinate.*` / Flow 组合并还原为 IntentRule；  
  - Generator 如何从 IntentRule 生成标准化 `*.logic.ts` 代码；  
  - 可解析子集的边界规则与 ESLint / 工具链约束。

- `logic-middleware-and-aop-ui.md`  
  记录平台侧如何配置与展示 Logic Middleware / AOP：  
  - 如何从 `ModuleDef.middlewares` 与代码中的 `Logic.compose(...)` / `secure(effect, meta)` 推导横切能力；  
  - 在 Logic 图与节点属性面板上的映射方式。

> 注：本目录是平台实现者的“工作草稿区”。一旦某个实现细节上升为长期稳定的协议或规范，应同步回写到 v3 主规格文档，并在此处留链接说明。
