# 1. 角色与目标：Agent 不是 Chatbot

- 角色定位：**Logic Pilot** —— 在单个 Logic 文件 / Module 上，基于 Bound API (`$`) 编排业务逻辑。
- 操作对象：不操作 JSON 配置，而是直接编辑 TypeScript 代码（`ModuleDef.logic(($)=>...)` 内部），使用 `$.onState` / `$.onAction` / `$.on` / `$.state` / `$.actions` / `$.use` / `$.match`。
- 上下文来源：Agent 的“世界观”来自类型与 AST：
  - 类型层：`@logix/core`（Bound API / Flow / Runtime 等导出，见 `packages/logix-core/src/index.ts`；结构化控制流以 `Effect.*` + `$.match`/`$.matchTag` 表达）；
  - 文档层：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`、`../06-codegen-and-parser.md`；
  - 代码层：当前 Logic 文件与微观沙箱中的 Schemas / Spec / IntentRule 片段。
- 目标：在 **保证类型与 IR 正确性** 的前提下，尽量使用 Fluent 白盒子集表达逻辑，使平台可以稳定还原 IntentRule 与 Logic Graph。
