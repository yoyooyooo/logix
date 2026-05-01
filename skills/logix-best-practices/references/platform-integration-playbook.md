---
title: 对齐实验手册（CLI / React / Worker / Sandbox）
---

# 对齐实验手册（CLI / React / Worker / Sandbox）

## 1) 宿主无关原则

- Runtime 负责执行语义，宿主负责承载交互与生命周期。
- 组合根只做 imports/processes/layer，不承载业务编排真相源。
- 宿主切换不应改变业务控制律（同输入同语义）。

## 2) CLI 集成

- 用独立入口组装 Runtime 并执行场景。
- 结束时必须释放资源（dispose/close）。
- 错误输出包含诊断码与触发边界，便于回链。

## 3) React 集成

- hooks 运行在 RuntimeProvider 子树内。
- 实例身份由 key/scope 明确，不依赖隐式全局单例。
- selector 订阅优先细粒度，避免不必要重渲染。
- 读侧只走 `useSelector(handle, selector)`，领域包不定义第二 canonical hook family。

## 4) Worker 集成

- worker 是消息驱动入口，不是第二套业务引擎。
- 协议必须可序列化，错误回传保留诊断信息。
- 生命周期（启动/健康检查/释放）应可观测。

## 5) Playground / Sandbox 的正确定位

- Playground / Sandbox 是对齐实验入口。
- Sandbox Runtime 负责在受控环境执行 Logix/Effect，并输出结构化证据。
- 目标是回答“当前运行行为是否与 Spec/Intent 对齐”。
- 本页术语只属于对齐实验与观测消费层，不进入业务 authoring surface，也不要求生成 public scenario/report/evidence 对象。

## 5.1) Playground 项目目录最佳实践

Playground 项目分两层：用户可见 virtual source tree 和作者侧 project declaration tree。

标准 virtual source tree：

```text
/src/main.program.ts
/src/logic/<domain>.logic.ts
/src/services/<service>.service.ts
/src/fixtures/<fixture>.fixture.ts
/src/preview/App.tsx
```

规则：

- Logic-first 项目默认用 `/src/main.program.ts` 作为 `program.entry`。
- `*.program.ts` 只做 Program 装配入口：导入 logic/service/fixture，构建 `Program`，必要时导出 `main`。
- `*.logic.ts` 放 Logix logic units、action 声明邻近代码和领域运行行为。
- `*.service.ts` 放普通可编辑 service 实现，仍进入同一 `ProjectSnapshot`。
- `*.fixture.ts` 只放需要给读者或 Agent 修改的 example-local 数据。
- `/src/preview/App.tsx` 只在显式 preview-capable 项目中出现。
- 新 Logic-first 示例不要再使用裸 `/src/program.ts` 作为推荐入口。

标准作者侧 project declaration tree：

```text
examples/<host>/src/playground/projects/<project-id>/
  index.ts
  files.ts
  drivers.ts
  scenarios.ts
  service-files.ts
  sources/
    src/main.program.ts
    src/logic/<domain>.logic.ts
    src/services/<service>.service.ts
    src/fixtures/<fixture>.fixture.ts
    src/preview/App.tsx
```

规则：

- `index.ts` 导出唯一 `definePlaygroundProject(...)`。
- `files.ts` 把 `sources/**` 映射为标准 virtual paths。
- `drivers.ts` 和 `scenarios.ts` 是 Playground 产品元数据，用于无 UI demo，不进入 core/react/sandbox public authoring surface。
- Driver/Scenario 默认不作为 runtime source file 展示给读者；读者使用它们，docs/example 作者定义它们。
- docs 与 examples 必须复用同一 project declaration authority，避免复制平行 source map。

## 5.2) Playground 编辑器最佳实践

- Playground editor surface 默认使用 Monaco，包括 source、service、fixture、JSON payload 和 advanced raw dispatch。
- Textarea 只能作为 Monaco 加载失败时的 bounded fallback。
- TypeScript-family source 必须启用 Monaco TypeScript language service。
- Monaco models 使用 `ProjectSnapshot.files` 的 virtual path 派生 URI，例如 `file:///src/main.program.ts`。
- 当前 snapshot 的所有 source files 都要同步到 Monaco models，保证虚拟源码树内部 import 可补全、可诊断。
- `@logixjs/*`、`effect`、React 与必要 transitive type 通过本地生成 type bundle 或等价 `extraLibs` 注入。
- Monaco diagnostics 是 editor feedback，不替代 `Runtime.check` / `Runtime.trial`。
- Monaco/LSP 状态属于 Playground host/editor state，不进入 runtime truth。

## 6) 对齐实验最小契约

结构化对齐结果至少包含：

- tickSeq 锚定的事件流（Action/State/Service/Lifecycle/Flow）。
- 关键步骤后的状态快照（no-tearing，同次观测只读同 tickSeq）。
- 错误/告警与对应锚点。

对齐消费侧至少能：

- 将事件回溯到 IntentRule/LogicGraph。
- 将状态与 Scenario 预期对比并输出差异。
- 形成结构化对齐报告。

## 7) 对齐实验 DoD

- 结构化输出：必须有 events / snapshots / anchors。
- 决策链可解释：必须能解释中间决策链。
- 跨宿主语义一致：不能只在单一宿主偶然可用。

## 8) 延伸阅读（Skill 内）

- `references/llms/03-long-running-coordination-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/08-builder-ir-basics.md`
