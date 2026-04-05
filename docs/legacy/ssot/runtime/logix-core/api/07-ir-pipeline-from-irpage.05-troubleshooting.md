# 5. 常见失败与如何定位（从这条链路反推）

- **`缺少 Observability.trialRunModule`**：通常是 sandbox kernel 没更新（`@logixjs/core` bundle 版本落后）；错误会在 wrapper 里直接抛出。
- **`MissingDependency`**：`TrialRunReport.environment.missingServices/missingConfigKeys` 是你应当优先处理的事实源；修复通常是：
  - 在 `options.layer` 注入缺失服务（或把依赖访问移到 run 段）；或
  - 在 `buildEnv.config` 提供缺失 config（或为 Config 加默认值）。
- **`TrialRunTimeout` / `DisposeTimeout`**：分别指向 boot 阶段阻塞与 scope 释放收束悬挂；属于“可解释挂死”的强约束，必须修到能收束。
- **`Oversized`**：说明你在 `maxEvents`/`diagnosticsLevel=full` 下导出了过多事件或过重 meta；按 hint 调小预算或拆分保存。
- **Sandbox 编译报错（子路径/禁止 internal）**：属于 Sandbox 的安全边界；按错误提示改用根导入或修正子路径。
