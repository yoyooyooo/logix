# 9. Program Runner（脚本/CLI/测试入口）

- **Program module / Root module（根模块）**
  - 指一次“可运行程序”的根模块（`ModuleDef.implement(...)` 的产物，含 imports/processes/layer）；
  - 运行时以它作为 Runtime Tree 的入口进行装配与启动。

- **Program runner**
  - 指 `@logixjs/core` 提供的标准根模块运行入口：`Runtime.openProgram` / `Runtime.runProgram`；
  - 负责 boot（启动实例与长期流程）与 dispose（释放收束），但不隐式推断退出策略。

- **ProgramRunContext**
  - runner 提供给调用方的运行上下文（`scope/runtime/module/$`）；
  - 其中：
    - `scope` 是一次运行的生命周期边界；
    - `module` 是 program module 的实例能力；
    - `$` 是脚本侧对齐 Logic 的统一访问面（`$.use(module)` 合并 handle-extend）。

- **Exit strategy（显式退出策略）**
  - 指在 `runProgram` 的 `main(ctx,args)` 中显式表达“何时结束”的策略；
  - 常见形式：等待状态/动作/外部信号/超时等。

- **closeScopeTimeout（释放收束超时）**
  - 指 runner 在关闭 `ctx.scope` 时用于“避免无解释悬挂”的超时预算（默认 1000ms）；
  - 超时会以 `DisposeTimeout` 失败并给出可行动提示（未 unregister listener / 未 join fiber / 未关闭资源句柄等）。

- **handleSignals（Node-only）**
  - 指在 `runProgram/openProgram` 中捕获 SIGINT/SIGTERM 并触发 graceful shutdown 的选项；
  - 语义：关闭 `ctx.scope`，不主动调用 `process.exit`。

- **Boot/Main/Dispose error taxonomy**
  - runner 区分三段错误：BootError（装配/启动）、MainError（主流程）、DisposeError/DisposeTimeout（释放）；
  - 目标是让平台/Devtools 能稳定定位失败阶段，并串联可解释链路。
  - 其价值在于：让多实例、多 root、深层嵌套下的实例选择保持确定性与可解释性。

- **strict（严格解析）**
  - 指调用方声明依赖必须来自某个更近作用域（例如 imports-scope）；若该作用域缺失提供者，必须失败并给出可修复诊断；
  - 用于把“模块关系（imports）”变成强约束，而不是弱约定。

- **global/root（显式 root 解析）**
  - 指调用方显式选择 Root Provider 语义解析依赖：忽略更近层级的 override；
  - 用于表达“需要单例语义才显式选择 root”的原则（避免把 strict 入口当作隐式单例兜底）。
