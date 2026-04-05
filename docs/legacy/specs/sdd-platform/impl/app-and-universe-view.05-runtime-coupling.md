# 5. 与 Runtime 的耦合点

在当前主线中，平台与 Runtime 在模块体系上的关键契约是：**都以 ModuleDef 为核心**，但关注点不同：

- Runtime：
  - 使用 ModuleDef 构建 Layer 和 processes，采用 Env 扁平合并策略；
  - 不理会 exports 与 middlewares 的具体语义；
  - 将 `links` 和 `processes` 合并执行。
- 平台：
  - 使用 ModuleDef 构建 Universe View 与依赖图；
  - **严格区分 `links` (业务) 和 `processes` (基建)**；
  - 使用 exports 进行封装约束检查；
  - 使用 middlewares 元信息帮助 AOP/UI 配置。

重要的是：即便 Runtime 暂不做 Env 裁剪，平台层仍然可以通过 ModuleIR 做出严谨的“可见性”约束与错误报告，这是当前主线的设计取舍之一。
