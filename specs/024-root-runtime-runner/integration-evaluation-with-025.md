# 024 & 025 联合评估与 API 设计评审报告

**日期**: 2025-12-24
**范围**: `specs/024-root-runtime-runner` + `specs/025-ir-reflection-loader`
**状态**: 综合评估（中文版）

## 1. 核心结论 (Executive Summary)

Spec 024 和 025 高度互补，结构对齐，共同构成了 **平台运行时接口 (Platform Runtime Interface)** 的两大支柱：

- **024 (Runner)** 定义了 **“如何运行” (How to Run)**：负责执行与生命周期管理。
- **025 (Loader)** 定义了 **“如何理解” (How to Understand)**：负责反射与预检 (Pre-flight)。

这两者共同解决了动态模块的“黑盒”问题：024 确保我们可以安全地启动/停止模块，而 025 确保我们可以在不执行完整业务逻辑（甚至不读取源码）的情况下检查其需求和形态。

**总体判断**: 集成方案稳健。“程序模块 (Program Module)”（024 的主体）与 “Manifest/TrialRun”（025 的产出）界限清晰。主要风险在于 **Trial Run 的实现细节**——必须确保 025 的“受控构建环境”能忠实模拟 024 提供的“运行时上下文”，避免代码重复导致的逻辑漂移。

## 2. 结构对齐分析

### “程序模块”作为原子公约数

两个 Spec 对最小工作单元（Root Module / Program Module）的定义完全一致：

- **024**: 将其视为一个需要 `ProgramRunContext` 才能运行的可执行载荷。
- **025**: 将其视为一个可检查的主体，能产出 `ModuleManifest` 和 `EnvironmentIR`。
- **对齐点**: 完美。025 明确将 024 的 program module 命名为“首个消费者”，确保了平台检查的对象（025）正是运行时执行的对象（024）。
- **Manifest 字段对齐**: `ModuleManifest` 字段名/语义与 `@logixjs/core` 的 `ModuleDescriptor` 子集对齐（`moduleId/actionKeys/logicUnits/schemaKeys/meta/source`），避免平台/CI 侧引入映射层导致口径漂移。

### 生命周期协议

- **024**: 强调 **显式退出策略 (Explicit Exit Strategy)**。主程序何时结束由用户决定。
- **025**: 强调 **强制/受控终止 (Forced Termination)**。Trial Run 何时结束由系统策略（超时/Scope 关闭）强制决定。
- **对齐点**: 互补。系统既需要标准的执行模式（用户主导），也需要检查模式（系统主导）。025 的 Trial Run 实际上是一个“专用 Runner”，它在更严格的沙箱策略下包裹了模块。

### 零全局状态 (宪法检查)

两者都严格遵守“无进程级单例”的原则。

- **024**: 要求多实例隔离。
- **025**: 要求确定性身份 (Deterministic Identity) 和可复现的 IR 提取（依赖注入 runId）。
- **对齐点**: 强。它们共同强化了架构边界：`Runtime` 和 `Scope` 是边界，进程不是。

## 3. 作战协同 (Run vs Trial Run)

这两个特性为平台启用了一个强大的 **“Pre-flight -> Flight”** 工作流：

1.  **静态检查 (025 Manifest)**: CI/Studio 静态加载模块（通过 025 反射），检查 Schema 兼容性和结构。快速且安全。
2.  **预检 (Pre-flight Check - 025 Trial Run)**: 平台在 BuildEnv + Trap/Mock Layer 的受控环境中执行 _Trial Run_（full boot，不执行 `main`）。确认：
    - 所需服务存在 (Environment IR)。
    - 无违规的构建期副作用。
3.  **正式执行 (024 Runner)**: 验证通过后，平台将模块交给 **Root Runtime Runner** (024)，此时已有信心依赖满足且结构合法。

---

## 4. 024 Root Runtime Runner API 设计评审

针对 `specs/024-root-runtime-runner` 中提出的 API 设想，以下是详细评估与建议。

### ✅ 设计亮点 (Pros)

1.  **生命周期权责分离 (Lifecycle vs Exit Strategy)**
    - **点评**: 这是一个非常成熟的设计决策。传统的 Runner 往往试图“自动猜测”何时退出（比如监听 event loop 空闲），这在复杂应用中极不可靠。024 明确规定 Runner _只管_ 启动资源 (`boot`) 和清理资源 (`dispose`)，而“什么时候该结束”完全交给调用者的 `main` 函数逻辑（无论是等待 deferred、监听信号还是直接结束）。这彻底消除了“僵尸进程”和“意外早退”的歧义。

2.  **Bound API (`$`) 的一等公民地位**
    - **点评**: 在 Context 中直接提供 `$` 是点睛之笔。在编写脚本或 CLI 工具时，开发者最痛的就是“我有 Runtime handle，但我还得自己去组装 `ModuleHandle` 甚至自己去 `Symbol.for` 拿扩展”。直接把 `ctx.$.use(MyModule)` 暴露出来，让脚本体验与业务代码体验一致，极大降低了编写测试脚本和运维脚本的门槛。

3.  **对齐测试语义**
    - **点评**: 明确提出与 `@logixjs/test` 共享心智模型非常有价值。长期以来，测试环境和生产环境的启动方式微妙不同是导致“测不准”的根源。统一 Runner 语义意味着测试只是 Runner 的一个特殊配置（带有 Mock 和 Spy 的 Runner）。

### ⚠️ 改进建议与探讨 (Suggestions)

1.  **命名裁决：采用 `runProgram`（已采纳）**
    - **裁决**: 024 对外入口采用 **`Runtime.runProgram(module, mainFn, options?)`** + **`Runtime.openProgram(module, options?)`**。
      - `runProgram` 强调这是完整的“程序生命周期”（Boot → Main → Dispose）。
      - `openProgram` 作为资源化入口（返回 scope-bound context），用于交互式 runner / 多段程序复用同一棵 runtime。
    - **备注**: 不提供任何对外别名；旧命名一律通过迁移文档与批量替换完成切换（不保留兼容层）。

2.  **Explicit Scope Management in Main**
    - **风险**: 如果 `main` 函数是一个普通的 Promise/Effect，用户可能会忘记它是在一个特定的 Scope 中运行的。
    - **采纳**: `ProgramRunContext` 暴露 `scope`（CloseableScope），并在文档中明确：
      - Runner 负责创建根 Scope、provide 给 `main`，并在 `main` 结束后自动关闭；
      - **User Main 不需要自己管理 Root Scope 的开关**（除非宿主需要做高级集成，如 SIGINT/shutdown 统一收束）。

3.  **Error Propagation Strategy**
    - **关注点**: 当 `main` 成功但后台有悬挂资源（如未 detach 的 interval）时，Runner 关闭 Scope 会导致什么？
    - **采纳**: 定义“可解释释放收束”的超时机制：提供 `closeScopeTimeout`（默认 1 秒 / 1000ms）。
      - 若关闭 scope 在窗口内完成：满足 “024 的 1 秒自然退出”。
      - 若 finalizer 卡住导致关闭超时：Runner 以 **DisposeTimeout** 失败，并通过 `RuntimeOptions.onError` 发出告警；不做“强杀”决策（由宿主决定是否 `process.exit`）。

4.  **CLI 参数注入**
    - **场景**: `User Story 1` 提到命令行友好。
    - **采纳**: `Runtime.runProgram` 支持注入结构化 `args`，并将 `main` 签名定义为 `main(ctx, args)`（避免 `process.argv` 等全局读取导致的不可测；也更利于测试与 025 的可控分支演练）。

## 5. 风险与缓解建议 (Risks & Mitigations) - 综合 025

1.  **主程序干扰 (Main Program Interference)**
    - **风险**: 025 试运行通过时，可能因为 025 只是 mock 了环境但没有执行“真正的”初始化逻辑导致漏测。或者反过来，025 一不小心执行了 024 定义的 `main` 函数导致副作用泄漏。
    - **缓解**: 建议 024 的 API 明确 `main` 函数是作为 `runProgram` 的**第二个参数**传入，而不是模块定义的一部分。这样模块本身只定义“能力与结构”，而“主程序”是外部脚本定义的。
      - 即：`Module` = Static Definition + Capabilities
      - `Script` = `Runtime.runProgram(MyModule, (ctx) => { ... use ctx use capability ... })`
      - 这样 025 只需要加载 `MyModule` 进行试运行，完全不涉及 `Script` 中的业务逻辑，天然隔离。

2.  **内核复用**
    - **建议**: 024 和 025 应共享同一个 `openProgram/boot` 内核（共享实现，避免漂移）；025 的 Trial Run 通过 `options.layer` 注入 Trap/Mock + budgets/timeout 实现“受控副作用”与可解释失败，而不是另起一套 `{ dryRun: true }` 变体（如需 boot-only/dryRun 作为扩展，后续单独立项）。

## 6. 总结

`024` 的 API 设计方向正确，特别是“显式主流程 + 自动资源管理”的模式非常适合现代 Effect 运行时。强烈建议采用 **`Module + MainFn` 分离** 的调用签名设计（即 `runProgram(Module, MainFn)`），这能直接化解 025 试运行时的副作用隔离难题，并提升脚本的可复用性。
