# 6. 与运行时容器的关系

总结一下 Module / Logic / Live / ModuleImpl 与运行时容器之间的关系：

- 概念层：
  - Module = 领域模块定义（不含实例）；
  - Logic = 在该 Module 上运行的一段长逻辑程序；
  - Live = Module 的运行时 Layer（一次性、即可注入即可用）；
  - ModuleImpl = 带初始状态、逻辑、默认依赖（imports）与可选进程（processes）的模块实现蓝图，可在不同 Runtime / React Tree 中多次复用。
- 运行时层：
  - 每个 Module.live / ModuleImpl.layer 会构造一个与该 Module 绑定的运行时实例；
  - 所有挂在该 Module 上的 Logic 程序运行在同一个运行时实例上（共享 State / actions$ / changes$）；
  - 依赖解析与跨模块协作遵循 **strict 默认 + 显式 root provider**：
    - **strict（默认）**：`$.use(ChildModule)` 仅用于访问“当前模块实例 scope”内由 `imports` 提供的子模块；
    - **root/global（显式）**：使用 `Root.resolve(Tag)`（或 Logic 内语法糖 `$.root.resolve(Tag)`）获取“当前 Runtime Tree 根”提供的单例（ServiceTag / ModuleTag）；
    - **跨模块胶水/IR**：使用 `Logix.Process.link(...)`（`Link.make(...)` 等价别名）显式描述协作关系（避免通过 Tag 猜实例）。
    - **长期进程（Process）**：通过 `processes` 声明，并由 `ProcessRuntime` 统一安装/监督（统一触发/并发/错误策略与 `process:*` 诊断事件）；支持三类安装点：
      - app-scope：Root ModuleImpl 的 `processes`（随 Runtime 启停）
      - moduleInstance-scope：ModuleImpl 的 `processes`（随实例 Scope 启停，多实例严格隔离）
      - uiSubtree-scope：React `useProcesses(...)`（随 UI 子树挂载/卸载）
  - 在分形 Runtime 模型下：
    - 推荐通过 `Logix.Runtime.make(root, { layer, onError })` 以某个 Root program module（或其 `.impl`）为入口构造一颗 Runtime（App / Page / Feature 均视为“Root + Runtime”）；
    - Root ModuleImpl 可以通过 `imports` 引入子模块实现，通过 `processes` 声明长期进程（Process；含 `Process.link/Link.make`）；
    - 应用级 AppRuntime（基于 `LogixAppConfig` / `makeApp`）仅作为底层实现存在（基于 Layer 合成与 processes fork），主要服务于平台/运行时内部，不再建议业务直接调用。

对日常业务开发而言，只需通过 Module / Logic / Live / ModuleImpl / `$` 五个概念进行思考与编码。
需要深入运行时生命周期、Scope、调试等能力时，再参考 `../runtime/05-runtime-implementation.md` 与 `../impl/*` 系列文档。

## 6.1 Root Provider（单例）心智模型（吸收 Angular/Nest 思想，但保留 Effect 优势）

核心类比：

- Angular `providedIn: "root"` ≈ Logix “在 Runtime Tree 根提供 Layer + 显式 `Root.resolve(Tag)`”；
- Angular/Nest 的“层级 injector + 最近 wins” ≈ Logix “React `RuntimeProvider.layer` / `useModule(ModuleTag)` 的就近覆盖（Nearest Wins）”；
- Logix 的关键差异：我们保留了 Effect 的函数式 DI（Layer/Context/Tag/Scope），并把“是否跨 scope / 是否拿 root 单例”做成 **显式入口**，而不是隐式回退。

行为约束（简版）：

- `$.use(ModuleTag)`：**strict 默认**，只从当前模块实例 scope 解析（要求 imports 提供），缺失即失败；
- `Root.resolve(Tag)`：**固定 root**，不受更近 scope 的 override 影响；用于 root 单例语义（包含 ModuleTag）。
- `$.root.resolve(Tag)`：Logic 内等价入口，固定从 root provider 解析（忽略局部 override），并携带 entrypoint 诊断字段。

如何在测试中 mock Root Provider：

- 在创建这棵 Runtime Tree 时注入 Layer（例如 `Logix.Runtime.make(root, { layer })`），而不是依赖嵌套 `RuntimeProvider.layer`；
- `RuntimeProvider.layer` 仅用于“当前运行环境”的局部覆写（影响 `useRuntime` / `useModule(ModuleTag)` 等入口），不会影响 `Root.resolve`。
- 若测试需要可控的宿主调度（microtask/macrotask/raf/timeout），优先使用 `Logix.Runtime.make(root, { hostScheduler })` 在 Runtime 构造时一次性注入，避免 `Layer.mergeAll(...)` 只做最终 Env 覆盖却无法影响 build-time 捕获的服务（例如 TickScheduler）。
