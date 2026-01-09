# `@logixjs/core` · Runtime / Program Runner

> **定位**：补齐「根模块运行入口」的 API 语义与心智模型（Node 脚本 / CLI / 测试 / 平台 Runner 的统一表面积）。  
> **代码落点**：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/runner/*`。  
> **相关规格**：`specs/024-root-runtime-runner/contracts/api.md`。

## 1. 为什么需要 Program Runner

在业务仓库里，“能跑起来”通常意味着：

- **能一键启动**：装配 Root 模块、启动 logics / processes；
- **能可解释地退出**：主流程结束后能释放资源并自然退出（或失败时给出可行动提示）；
- **不引入第二套语义**：测试、脚本、CLI 应复用同一套生命周期内核，避免漂移。

`Runtime.openProgram/runProgram` 的职责就是把“启动/释放”从每个脚本/测试里剥离出来，形成统一入口。

## 2. 心智模型（≤5 关键词）

启动 / 退出 / 释放 / 显式条件 / 作用域

- Runner **不会**自动推断退出时机：常驻逻辑（watchers / subscriptions / Link）通常不会自然结束。
- Runner 只负责：
  - **boot**（触碰 program module tag，启动实例与长期流程）；
  - **dispose**（关闭 scope 并收束释放）。
- **退出条件**必须由调用方在 `main` 中显式表达（或通过信号触发 shutdown）。

## 3. 两个入口：`openProgram` vs `runProgram`

### 3.1 `Runtime.openProgram(root, options?)`

资源化入口（scope-bound）：

- 返回 `ProgramRunContext`，且在返回前已完成 boot（可立即交互使用）。
- 生命周期绑定 `ctx.scope`：
  - 上层 scope 关闭时，runner 会关闭 `ctx.scope` 并触发资源释放；
  - 释放过程受 `closeScopeTimeout` 约束（默认 1000ms）。
- **事务边界**：禁止在同步事务窗口内调用（防止把 IO/async 引入事务体）。
- **strict by default**：模块解析不允许进程级兜底（多 root / 多实例场景下兜底会破坏隔离语义）。

适用场景：

- 交互式脚本 / REPL：同一棵 Runtime 上分段执行多个子程序；
- 平台 Runner：需要先 boot，再做可控窗口内的检查/采集（例如 Trial Run）。

### 3.2 `Runtime.runProgram(root, main, options?)`

一次性入口：

- 等价于：`openProgram → main(ctx,args) → dispose(ctx.scope)`；
- 无论 `main` 成功/失败，都会执行释放；
- 支持 Node/CLI 友好特性：
  - `args`：向 `main(ctx,args)` 注入参数，避免脚本侧读 `process.argv`；
  - `handleSignals`：捕获 SIGINT/SIGTERM 触发 graceful shutdown（关闭 `ctx.scope`，不主动 `process.exit`）；
  - `exitCode/reportError`：可选设置 `process.exitCode` 与默认错误输出策略（便于 CLI 统一行为）。

## 4. `ProgramRunContext`（Runner 运行上下文）

`openProgram/runProgram` 返回/注入的上下文：

- `ctx.scope`：本次运行的根作用域（CloseableScope）
- `ctx.runtime`：ManagedRuntime（用于运行 Effect）
- `ctx.module`：program module 的 `ModuleRuntime`（dispatch/getState/changes/actions$...）
- `ctx.$`：Bound API（脚本侧统一入口；`$.use(module)` 会合并 handle-extend）

经验法则：

- `module` 偏“领域能力”（状态/动作/订阅），`runtime` 偏“执行能力”（运行 Effect / fork fibers）。
- 在脚本里优先用 `ctx.$`：它对齐 Logic 的访问方式，并确保 handle-extend 可用。

## 5. 释放收束：`closeScopeTimeout`

释放是“可解释链路”的一部分：

- `closeScopeTimeout` 默认 1000ms；
- 若 finalizer 卡住导致释放超时，runner 必须以结构化 `DisposeTimeout` 失败并给出可行动提示；
- 同时透传 `RuntimeOptions.onError` 作为顶级告警入口（不改变退出策略，仅用于上报）。

注意：超时失败并不意味着“进程一定能退出”——卡死的 finalizer 仍可能持有句柄导致进程悬挂；DisposeTimeout 的建议字段应引导定位（未 unregister listener / 未 join fiber / 未关闭资源句柄等）。

## 6. 错误分类（Taxonomy）

Runner 需要区分三个阶段：

- **BootError**：启动/装配失败（entrypoint=`boot`）
- **MainError**：主流程失败（entrypoint=`main`）
- **DisposeError / DisposeTimeout**：释放失败或超时（entrypoint=`dispose`）

原则：

- 错误载荷必须 **Slim 且可序列化**；
- 必须携带可关联的稳定标识（至少 `moduleId + instanceId`）；
- 默认路径不增加额外诊断成本，失败路径提供最小可解释信息。

## 7. 对齐关系（避免漂移）

- **025 Trial Run**：必须复用 `Runtime.openProgram` 的 boot 内核（不复制装配逻辑），在其上叠加窗口控制与证据导出。
- **`@logixjs/test`**：测试入口必须复用 `@logixjs/core` runner 语义：
  - 输入应是 **program module**（`ModuleDef.implement(...)` 的产物），而不是独立的 Scenario 生命周期模型；
  - 多模块/Link 场景通过 `imports` / `processes` 表达，不通过 `_op_layer` 分类 hack；
  - service mock 通过 `RuntimeOptions.layer` 注入。
