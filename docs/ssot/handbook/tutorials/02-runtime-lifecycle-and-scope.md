---
title: Runtime 生命周期与 Scope 教程 · 剧本集（boot/run/close 从 0 到 1）
status: draft
version: 1
---

# Runtime 生命周期与 Scope 教程 · 剧本集（boot/run/close 从 0 到 1）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味与平台/工具开发对齐。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

## 0. 最短阅读路径（10 分钟上手）

如果你只想快速理解“为什么程序不会自然退出 / closeScopeTimeout 到底在干什么”，按这个顺序：

1. 读 SSoT：`docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md`（心智模型 + API 口径）
2. 看 public 入口：`packages/logix-core/src/Runtime.ts`（`openProgram` / `runProgram`）
3. 看 close 语义：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.closeScope.ts`
4. 看错误类型：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.errors.ts`
5. 对照测试用例（最可信的“可运行说明书”）：
   - `packages/logix-core/test/Runtime/Runtime.runProgram.basic.test.ts`
   - `packages/logix-core/test/Runtime/Runtime.runProgram.disposeTimeout.test.ts`
   - `packages/logix-core/test/Runtime/Runtime.runProgram.transactionGuard.test.ts`

> 只读到这里，你就足以解释：  
> - 为什么 runner 不会“自动判断退出时机”；  
> - 为什么 scope 关闭是“可解释链路”的一部分；  
> - 为什么 disposeTimeout 不是“强行杀进程”，而是“强制暴露挂死原因”。

## 1. 心智模型（把这几个词放进同一个坐标系）

### 1.1 三段生命周期：boot / main / dispose

把 `Logix.Runtime.runProgram` 当作一台非常明确的三段式机器：

1. **boot**：触碰 program module tag（实例化模块、启动 logics/processes）
2. **main**：执行你提供的 `main(ctx, args)`（一次性任务/交互循环/服务主循环都可以）
3. **dispose**：关闭 scope，触发所有资源 finalizer；并且要么成功收束，要么给出结构化失败（含 hint/suggestions）

### 1.2 Scope 不是“流程结束”，而是“资源生命周期”

Effect 的 `Scope` 解决的是“资源有没有被释放”的问题，而不是“业务流程有没有结束”的问题：

- 业务流程结束（main 返回）≠ 资源已经释放（scope close 成功）
- scope close 成功 ≠ 进程一定退出（宿主可能仍有句柄/监听器未释放）

Logix 的 runner 把“scope 释放是否成功、为何失败”变成强制可解释的一等公民：失败必须有 `_tag`、`entrypoint`、`hint`，以及（超时情况下）`suggestions`。

### 1.3 为什么 runner 不会自动退出

Logix 的常见逻辑形态是长期任务（watchers/subscriptions/Link/Stream.run*）：

- 它们通常会持有 fiber、listener、timer、socket 等资源；
- 即使 `main` 已经返回，这些资源只要还没被释放，进程就可能继续“活着”；
- runner 无法也不应该“猜”你到底是想要常驻，还是想要跑完就退。

因此：**退出条件必须由你在 `main` 里显式表达**（或通过 signals 触发 shutdown）。

### 1.4 两个入口：`openProgram` vs `runProgram`

你只需要记住一句话：

- `openProgram`：资源化入口，返回一个 **scope-bound 的 `ProgramRunContext`**（boot 已完成，可立即交互）
- `runProgram`：一次性入口，封装 **boot → main → dispose** 并提供 CLI/脚本友好选项（signals/exitCode/reportError/args）

`openProgram` 适合平台 runner / 交互式场景（先 boot，再做一堆事，再统一 close）；`runProgram` 适合脚本/测试/一次性命令。

### 1.5 `ProgramRunContext` 是什么

`ProgramRunContext` 把“你在 main 里真正需要的东西”压到最小：

- `ctx.scope`：本次运行的根 scope（CloseableScope）
- `ctx.runtime`：ManagedRuntime（跑 Effect 的执行器）
- `ctx.module`：ModuleRuntime（dispatch/getState/changes 等领域能力）
- `ctx.$`：Bound API（脚本侧对齐 Logic 访问方式；`$.use(...)` 会保留 handle-extend）

经验法则：脚本/平台侧尽量优先用 `ctx.$` 做模块交互；它的表面积更贴近业务写法，也更不容易绕开 “imports-scope / Nearest Wins” 等约束。

### 1.6 `onError` / `reportError` / `exitCode` 的边界

这些开关经常被混用，建议按职责拆开：

- `options.onError`：**运行时统一上报口**（Effect cause）——不负责“决定退出策略”，只负责“把失败送出去”
- `options.reportError`：Node/CLI 的默认 `console.error` 行为开关（仅在 `exitCode=true` 的分支里启用）
- `options.exitCode`：是否写 `process.exitCode`（不主动 `process.exit()`，避免抢夺宿主控制权）

## 2. 核心链路（从 0 到 1：跑起来 + 能收束）

这一节只讲一条主线：`Logix.Runtime.runProgram(root, main, options)` 究竟做了什么。

### 2.1 public → internal 的入口跳转

- public：`packages/logix-core/src/Runtime.ts`
  - `Runtime.openProgram(...)` → `ProgramRunner.openProgram(...)`
  - `Runtime.runProgram(...)` → `ProgramRunner.runProgram(...)`
- internal（核心实现）：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`

### 2.2 runProgram 的分步语义（按真实代码顺序）

实现见：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`

1. **同步事务窗口禁入（Transaction Guard）**
   - 如果当前处在同步 StateTransaction body，直接抛错拒绝。
   - 目的：避免把 IO/async/子 runtime 引入事务窗口，破坏“事务窗口禁止 IO”的硬约束。

2. **解析 runner options（含默认值）**
   - `closeScopeTimeout` 默认 `1000ms`
   - `handleSignals` 默认 `true`
   - `exitCode` 默认 `false`
   - `reportError` 默认 `true`
   - 代码：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.options.ts`

3. **创建 identity（用于错误分类与可关联链路）**
   - 初始：`{ moduleId, instanceId: "unknown" }`
   - boot 成功后会用真实 `moduleRuntime.instanceId` 回填

4. **创建 scope + runtime，并把 runtime.dispose 绑定到 scope 的 finalizer**
   - 这一步是“资源化”的关键：无论 main 成功失败，最终都能走到 dispose 收束。

5. **（Node-only）可选安装 signals 处理**
   - `SIGINT/SIGTERM` 会触发 `Scope.close(scope)`
   - finalizer 会移除监听器，避免泄漏
   - 代码：`ProgramRunner.signals.ts`

6. **boot：触碰 program module tag**
   - 本质：`runtime.runPromise(rootImpl.module)`
   - boot 失败 → 包装为 `BootError`（并在可选 `exitCode/reportError` 逻辑下输出）

7. **构造 `ProgramRunContext`**
   - `ctx.$` 通过 `BoundApiRuntime.make` 创建，保证 `$.use(...)` 的 handle-extend 能正常工作（见用例）

8. **执行 main**
   - `ctx.runtime.runPromise(main(ctx, args))`
   - main 失败 → 包装为 `MainError`

9. **finally：关闭 scope 并强制“可解释收束”**
   - 调用 `closeProgramScope({ scope, timeoutMs, identity, onError })`
   - close 失败会变成 `DisposeError` / `DisposeTimeoutError`（并把 mainError 作为 `error.mainError` 附加到释放错误上，方便定位“先失败后挂死”的组合问题）

> 你可以把这段 finally 理解为：  
> **我们宁可让程序失败，也不能允许“默默挂死但看不懂为什么”。**

### 2.3 openProgram 的差异点（为什么它是 Effect，而不是 Promise）

实现见：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`

`openProgram` 的关键差异只有两点：

1. **它是 scope-bound 的 Effect**
   - `openProgram` 本身运行在调用方提供的 outer scope 下；
   - 它会把 `kernel.close(...)` 注册成 outer scope 的 finalizer（因此外层 close 时必然触发收束）。

2. **它返回“已 boot 的 context”**
   - 适合“先 boot + 多步交互 + 最后统一 close”的平台场景（例如 TrialRun / IR 提取）

### 2.4 closeScopeTimeout 到底做了什么（以及为什么要 microtask yield）

实现见：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.closeScope.ts`

算法很简单，但有几个关键点：

1. `forkDaemon(Scope.close(scope, Exit.void))` 启动一个后台 fiber 做释放。
2. 循环 `Fiber.poll`：
   - 如果释放完成：成功返回
   - 如果释放失败：包装为 `DisposeError` 并 die
3. 若超时（`elapsedMs >= timeoutMs`）：
   - 构造 `DisposeTimeoutError`（包含 `timeoutMs/elapsedMs/suggestions`）
   - 若提供 `onError`：以 `Cause.die(error)` 形式上报（并 catch 掉 onError 自己的失败）
   - `Fiber.interruptFork` 尝试中断释放 fiber（避免继续占用资源）
   - `die(error)` 强制失败（让上层看到结构化错误）

**为什么要 microtask yield，而不是 TestClock yield？**

- close 过程是 perf-critical 的 tight loop：成功路径必须尽量便宜；
- 同时在测试里可能启用了 TestClock：如果用 TestClock 的 yield，可能被“时间没推进”卡住；
- 因此这里用 host scheduler 的 **microtask** 做 yield，既便宜又不依赖 TestClock。

> 重要提醒：DisposeTimeoutError 不是“强行杀进程”。  
> 它的目标是强制把“为什么没收束”暴露出来；进程能否退出取决于宿主句柄是否真的被释放。

### 2.5 错误分类（Taxonomy）= 诊断协议的一部分

实现见：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.errors.ts`

Runner 只认四类结构化错误：

- `_tag: "BootError"`（entrypoint=`boot`）
- `_tag: "MainError"`（entrypoint=`main`）
- `_tag: "DisposeError"`（entrypoint=`dispose`）
- `_tag: "DisposeTimeout"`（entrypoint=`dispose`，含 `suggestions[]`）

共同字段（`toJSON()` 保证可序列化）：

- `moduleId` / `instanceId`：用于回链到运行时树与事件锚点
- `entrypoint`：失败发生在哪个阶段
- `hint`：最短可行动提示

你在平台/CI/Devtools 中应当依赖 `_tag + entrypoint` 做分流，而不是用脆弱的字符串匹配。

### 2.6 signals（Node-only）= “优雅退出”的统一入口

实现见：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.signals.ts`

signals 处理是“可选但统一”的：

- 开启：监听 `SIGINT/SIGTERM`，触发 `Scope.close(scope)`（不调用 `process.exit()`）
- 关闭：测试/浏览器/非 Node 环境不应安装（避免污染宿主）
- 释放：finalizer 负责移除监听器，避免“跑一次 CLI 就泄漏一次监听器”的隐患

### 2.7 同步事务窗口禁入（为什么要这么硬）

在 Logix 的纪律里：

- 同步事务窗口（StateTransaction body）禁止 IO；
- 但 `openProgram/runProgram` 会触碰模块装配、启动 logics/processes、以及后续的资源释放，这些都可能引入 async/IO；
- 因此必须 fail-fast。

证据用例：`packages/logix-core/test/Runtime/Runtime.runProgram.transactionGuard.test.ts`

## 3. 剧本集（按场景直接复用）

### A. 一次性脚本（最小闭环）

你要的结果：boot 跑起来 → 做点事 → 能收束退出。

参考用例：`packages/logix-core/test/Runtime/Runtime.runProgram.basic.test.ts`

要点：

- `handleSignals: false`（测试/一次性脚本通常关掉，避免污染宿主）
- `main` 里显式表达退出条件（例如“做完 N 次 dispatch 就返回”）

### B. CLI 命令（exitCode + reportError）

你要的结果：让调用方（shell/CI）能可靠地看 exit code，并在失败时有默认输出。

建议：

- `exitCode: true`：让 runner 写 `process.exitCode`
- `reportError: true`：让 runner 做最小 `console.error`（同时你也可以用 `onError` 上报到更专业的通道）
- `handleSignals: true`：让 Ctrl+C 触发 scope close（优雅退出）

> 注意：runner 不会 `process.exit()`；这是一条硬边界（避免抢夺宿主控制权）。

### C. 平台/集成场景（openProgram：先 boot，再多步交互）

你要的结果：把“启动/释放”做成统一壳子，中间可以做任意平台动作（反射、trial-run、导出工件）。

建议：

- 用 `openProgram` 拿到 `ctx`（已 boot）
- 多步执行（提取 manifest/staticIr、做试跑窗口采集、导出 evidence）
- 最后统一 close 外层 scope（触发 `kernel.close` 收束）

关联能力：

- `docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md`
- `docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`（试跑产物的 digest/diff/anchors）

### D. 单元测试（推荐直接读测试文件当教程）

推荐路径：直接把这些测试当“可运行教程”读一遍：

- `Runtime.runProgram` 的基本语义：`packages/logix-core/test/Runtime/Runtime.runProgram.basic.test.ts`
- dispose 成功/失败都要释放资源：`packages/logix-core/test/Runtime/Runtime.runProgram.dispose.test.ts`
- dispose 超时要结构化失败 + onError 告警：`packages/logix-core/test/Runtime/Runtime.runProgram.disposeTimeout.test.ts`
- 同步事务窗口禁入：`packages/logix-core/test/Runtime/Runtime.runProgram.transactionGuard.test.ts`
- `ctx.$` 需要保留 handle-extend：`packages/logix-core/test/Runtime/Runtime.runProgram.handleExtend.test.ts`

测试里的共同写法（建议记住）：

- `it.scoped(() => Effect.gen(function* () { ... }))`
- `Effect.promise(() => Logix.Runtime.runProgram(...))`（因为 `runProgram` 返回 Promise）
- `handleSignals: false`（避免测试进程挂信号监听）

### E. Trial Run（025）与 runner 的关系

TrialRun 是“平台/CI 需要的受控试跑”，它与 runner 的关系可以用一句话概括：

> **TrialRun 复用 runner 的 boot + scope close 语义，但不执行 main。**

关键对齐点（建议按顺序读）：

1. `docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md`（口径 + 错误分类）
2. `docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md`（runner 心智模型）
3. `docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`（从 sandbox 页面反推全链路）

TrialRun 的两个超时（很容易和 closeScopeTimeout 混淆）：

- `trialRunTimeoutMs`：试跑窗口超时（指向 boot/装配阻塞或 long-lived 的启动逻辑）
- `closeScopeTimeout`：释放收束超时（语义复用 runner）

### F. DisposeTimeout 排障清单（最常见：为什么“跑完不退”）

DisposeTimeout 的三类常见根因（对应 `suggestions[]`）：

1. **事件监听器没卸载**：`process.on` / `emitter.on` / DOM listener（浏览器）
2. **fiber 没 join/interrupt**：长期 watcher / `Stream.run*` / `Effect.forkDaemon`（没绑 scope）
3. **资源句柄没关闭**：timer / socket / file handle

抓手（最短路径）：

- 先看 `DisposeTimeoutError.toJSON()`（`entrypoint="dispose"` + `suggestions`）
- 再沿着 scope-finalizer 查：`rg "addFinalizer\\(" packages/logix-core/src | head`
- 如果是 Node 侧句柄：优先查 timers/sockets 是否在 finalizer 里 `clearTimeout/close`

> 经验：**先修“资源绑 scope”**（forkScoped / Layer.scopedDiscard），再谈“更长 timeout”。  
> 加 timeout 只能掩盖问题，无法让系统更可解释。

## 4. 代码锚点（Code Anchors）

### 文档（SSoT）

- Runner API：`docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md`
- TrialRun 对齐：`docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md`
- Scope/层级解析：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.08-scope-resolution.md`
- Scope 释放语义：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.03-scope-disposal.md`

### 代码（public + core）

- public 入口：`packages/logix-core/src/Runtime.ts`
- runner 主实现：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`
- scope close：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.closeScope.ts`
- 错误类型：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.errors.ts`
- signals：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.signals.ts`
- options 默认值：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.options.ts`
- exitCode/reportError：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.exitCode.ts`

### 测试（证据）

- `packages/logix-core/test/Runtime/Runtime.runProgram.basic.test.ts`
- `packages/logix-core/test/Runtime/Runtime.runProgram.dispose.test.ts`
- `packages/logix-core/test/Runtime/Runtime.runProgram.disposeTimeout.test.ts`
- `packages/logix-core/test/Runtime/Runtime.runProgram.transactionGuard.test.ts`
- `packages/logix-core/test/Runtime/Runtime.runProgram.handleExtend.test.ts`

## 5. 验证方式（Evidence）

### 5.1 最小回归：跑 core 的单测

在仓库根目录执行：

```bash
pnpm -C packages/logix-core test
```

（可选）只跑 runner 相关用例：

```bash
pnpm -C packages/logix-core vitest run Runtime.runProgram
```

### 5.2 最小复现：写一个一次性脚本

如果你在业务仓库里要复现“跑完不退 / disposeTimeout”，推荐把逻辑做成最小 module + `Runtime.runProgram`，让问题收敛到 runner 维度（而不是散落在脚本 try/finally 里）。

## 6. 常见坑（Anti-patterns）

1. **在 reducer / 同步事务窗口里调用 `openProgram/runProgram`**：会 fail-fast（这不是“限制”，而是纪律）
2. **测试里开启 `handleSignals`**：会污染测试进程（安装/移除 listener 的时序很难保证与用例隔离）
3. **把 closeScopeTimeout 当成“强行杀进程”**：它只负责把挂死变成可解释错误；真正的解决是“资源绑 scope”
4. **手写 `ManagedRuntime.make + try/finally`**：会不断复制错误分类/信号处理/退出策略，最终漂移且不可交接
5. **以为 main 返回就一定释放完**：main 返回只是流程结束；资源释放要看 scope close 是否成功

