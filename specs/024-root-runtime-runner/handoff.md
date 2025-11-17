# 交接文档：024 · Root Runtime Runner（Program Runner）

> 目标：为脚本/CLI/测试提供统一的“根模块运行入口”，并让 `@logix/test` 彻底复用同一套生命周期语义（不再维护独立的 Scenario/TestRuntime 模型）。

Date: 2025-12-25  
Scope: `specs/024-root-runtime-runner/`

## ✅ 当前状态

- 入口裁决：`Runtime.openProgram`（scope-bound）+ `Runtime.runProgram`（一次性）
- `@logix/test` 已切到新模型：只认 **program module**（`ModuleDef.implement(...)` 的产物）
- 迁移验收口径：以 `packages/logix-test/src` 为范围（见 `specs/024-root-runtime-runner/tasks.md` 的 T035）
- 质量门与性能证据：见本 spec 的 `tasks.md` 后续任务（T040/T0xx）

## 0. 当前裁决（必须坚持）

### 0.1 Program Runner：命名与语义

- **两个入口**（语义不重叠）：
  - `openProgram(root, options?)`：返回 `ProgramRunContext`；生命周期绑定 `ctx.scope`；适合交互式 runner / 平台受控窗口（如 TrialRun）。
  - `runProgram(root, main, options?)`：一次性封装 `open → main → dispose`；用于脚本/CLI/测试“一键跑完”。
- **Runner 不做隐式退出**：退出条件必须由 `main(ctx,args)` 显式表达（等待状态/事件/外部信号/超时等）。
- **释放收束**：`closeScopeTimeout` 默认 1000ms；超时抛 `DisposeTimeout`，并携带可行动提示（未 unregister listener / 未 join fiber / 未关闭资源句柄等）。
- **错误分类（必须可解释）**：区分 `boot` / `main` / `dispose` 三段错误；载荷 Slim 且可序列化；至少可关联 `moduleId + instanceId`。

### 0.2 `@logix/test`：对齐策略（彻底切新模型）

- **输入唯一化**：只接受 program module（`ModuleDef.implement({ initial, logics, imports, processes })` 的产物），不再存在 `Scenario/TestProgram.make/TestRuntime` 生命周期模型。
- **多模块协作**：靠 `imports` 表达（`program.implement({ imports: [...] })`），不通过 `Scenario` 聚合。
- **长期流程 / Link**：靠 `processes` 表达（`program.implement({ processes: [...] })`），不通过 `_op_layer` 分类 hack。
- **Service mock / Env 注入**：靠 `options.layer`（透传给 core Runtime），不在测试包里引入第二套装配语义。
- **Vitest 语法糖**：`itProgram` / `itProgramResult`（对齐 `Runtime.runProgram` 命名），替代 `itScenario`。

## 1. 关键落点（代码 / SSoT）

- core 入口：`packages/logix-core/src/Runtime.ts`
- runner 内核：`packages/logix-core/src/internal/runtime/runner/ProgramRunner.ts`
- `@logix/test` 新入口：`packages/logix-test/src/api/TestProgram.ts`、`packages/logix-test/src/Vitest.ts`
- runtime SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/05-runtime-and-runner.md`
- test-package SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-core/impl/07-test-package.md`

## 2. 迁移指南（必须包含 Before/After）

> 说明：本仓不提供兼容层；迁移以“改写为 program module + runner”直达终态。

### 2.1 单模块测试：`TestProgram.make(...).run(...)` → `TestProgram.runProgram(program, ...)`

Before（旧模型示意）：

```ts
import { TestProgram } from "@logix/test"

const program = TestProgram.make({
  main: { module: RootModule, initial, logics: [RootLogic] },
})

const result = await program.run(async (api) => {
  await api.dispatch("increment")
  await api.assert.state((s) => s.count === 1)
})
```

After（新模型）：

```ts
import * as Logix from "@logix/core"
import { TestProgram } from "@logix/test"
import { Effect } from "effect"

const program = RootModule.implement({ initial, logics: [RootLogic] })

const result = await Effect.runPromise(
  TestProgram.runProgram(program, (api) =>
    Effect.gen(function* () {
      yield* api.dispatch("increment")
      yield* api.assert.state((s) => s.count === 1)
    }),
  ),
)
```

> 关键点：`api.ctx.$` 与脚本/Logic 一致，可用 `yield* api.ctx.$.use(OtherModule)` 取 handle（含 handle-extend）。

### 2.2 多模块 + Link/长期流程：`Scenario/modules/layers` → `imports/processes`

Before（旧模型示意）：

```ts
import { TestProgram } from "@logix/test"
import { Layer } from "effect"

const program = TestProgram.make({
  modules: [HostModule, TargetModule],
  layers: [
    // 或者依赖 `_op_layer` 的分类推断把某些 layer 当作 process layer
    Layer.scopedDiscard(LinkLogic),
  ],
})
```

After（新模型）：

```ts
import { TestProgram } from "@logix/test"
import * as Logix from "@logix/core"

const program = HostModule.implement({
  initial,
  logics: [HostLogic],
  imports: [TargetModule.impl],
  processes: [Logix.Link.make({ modules: [HostModule, TargetModule] }, ($) => /* ... */)],
})

yield* TestProgram.runProgram(program, (api) => /* ... */)
```

> 关键点：`imports` 只表达实例关系；长期流程（含 Link）只能放 `processes`，不要再写 `_op_layer` 分类逻辑。

### 2.3 Vitest 语法糖：`itScenario` → `itProgram`

After（推荐）：

```ts
import { itProgram } from "@logix/test/Vitest"

itProgram("runs root program", RootProgram, (api) =>
  api.dispatch("increment"),
)
```

## 3. 常见误用与排查提示

- **“脚本为什么不退出？”**：runner 不会自动推断退出。检查 `main` 是否存在显式退出条件；其次检查是否有卡死的 finalizer（DisposeTimeout 会给出可行动建议）。
- **DisposeTimeout 不是强制 kill**：超时只是“可解释失败 + 告警”，不保证能杀掉卡死的 finalizer；如进程仍悬挂，应继续定位未关闭的句柄/监听器/fiber。
