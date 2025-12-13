---
name: project-guide
description: 当在 intent-flow 仓库内进行架构设计、v3 Intent/Runtime/平台规划演进、典型场景 PoC 或日常功能开发时，加载本 skill 以获得“docs/specs 为主事实源”的最短导航。
---

# intent-flow · project-guide

## 目标

- 用最少上下文定位：SSoT 在哪、代码落点在哪、示例在哪。
- 默认先用 auggie 做语义检索，再补读必要文档。

## 新会话最短启动（建议顺序）

1. 用 auggie 定位你要改的“符号/能力/包”在哪（优先于 `rg`）。
2. 读 v3 导航入口：`docs/specs/intent-driven-ai-coding/v3/README.md`
3. 读概念与术语：`docs/specs/intent-driven-ai-coding/v3/99-glossary-and-ssot.md`
4. 读 runtime 编程模型：`docs/specs/runtime-logix/core/02-module-and-logic-api.md`
5. 读 `$`/Flow/IntentBuilder：`docs/specs/runtime-logix/core/03-logic-and-flow.md`
6. 看类型裁决与真实导出：`packages/logix-core/src/index.ts`
7. 看 PoC 场景与 Pattern：`examples/logix/src/scenarios/*`、`examples/logix/src/patterns/*`

## 默认 auggie 查询模板（复制即用）

- “`@logix/core` 的 Bound API `$` 类型/实现在哪里（`$.onState`/`$.state.mutate`/`$.use`）？”
- “`Runtime.make` 如何把 `ModuleImpl`/Layer/Devtools 组合起来？相关文件/符号在哪？”
- “`LogicMiddleware` / `EffectOp middleware` 的注册点与执行链路在哪里？”
- “`examples/logix` 里哪个场景最接近：表单联动/搜索+详情/长任务/审批流/跨模块协作？”

## Logix v3 速查（避免翻源码冷启动）

- 心智模型：`Module`（契约）→ `Module.logic(($)=>...)`（行为）→ `Module.implement`（实现体/Layer）→ `Logix.Runtime.make` / `RuntimeProvider`（运行与集成）
- 最小写法骨架：
  - `import * as Logix from "@logix/core"`；Effect/Schema 从 `effect` 导入
  - `const M = Logix.Module.make("Id", { state, actions, reducers? })`
  - `const L = M.logic(($) => /* Effect.gen(...) 或 { setup, run } */)`
  - `const Impl = M.implement({ initial, logics: [L], imports?, processes? })`
- 推荐入口（按“从能写代码到能跑通”顺序）：
  - 编程模型与 `$`：`docs/specs/runtime-logix/core/02-module-and-logic-api.md`、`docs/specs/runtime-logix/core/03-logic-and-flow.md`
  - 真实导出与类型裁决：`packages/logix-core/src/index.ts`
  - 可运行场景范式：`examples/logix/src/scenarios/*`、`examples/logix/src/patterns/*`
- 写 Logic 时优先使用白盒子集：`$.onState` / `$.onAction` / `$.on` + `.update/.mutate/.run*`，需要服务就 `$.use(ServiceTag)`。
- React/Sandbox/Devtools 场景：先用 auggie 查 `RuntimeProvider` / `useModule` / `SandboxClient` / `LogixDevtools` 的“示例文件路径”，再对照对应包与示例落地。

## SSoT 优先级（冲突裁决）

1. 概念层（术语/边界）：`docs/specs/intent-driven-ai-coding/v3/*`（尤其 `99-glossary-and-ssot.md`）
2. Runtime 规范（编程模型）：`docs/specs/runtime-logix/core/*`
3. Runtime 类型与实现（最终裁决）：`packages/logix-core/src/*`（公共出口：`packages/logix-core/src/index.ts`）
4. 场景与示例（推荐写法验证）：`examples/logix/*`
5. 平台交互（平台侧 SSOT）：`docs/specs/intent-driven-ai-coding/v3/platform/*`

## 常见任务落点（先定目录再动手）

- Runtime API/类型/语义：`packages/logix-core/src/*` + `docs/specs/runtime-logix/core/*`
- React 适配：`packages/logix-react/*` + `docs/specs/runtime-logix/core/07-react-integration.md`
- Devtools：`packages/logix-devtools-react/*` + `docs/specs/runtime-logix/core/09-debugging.md`
- Sandbox/Alignment Lab：`packages/logix-sandbox/*`（同时参考 runtime-logix 与 drafts 的 sandbox 主题）
- 用户文档（产品视角）：`apps/docs/content/docs/*`

## 改动纪律（保证可交接）

- 影响契约/API/术语：先改 `docs/specs`，再落代码，再同步 `apps/docs`。
- PoC 里验证出的“通用写法/反例”：回写到 `docs/specs/runtime-logix/*`。

## 进一步阅读

- `references/project-architecture.md`：更细的目录地图与决策落点。
