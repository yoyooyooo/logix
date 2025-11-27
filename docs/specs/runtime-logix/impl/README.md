# runtime-logix · 实现备忘录 (Implementation Notes)

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: 运行时实现层的补充说明与技术备忘，不作为对外 API 契约，仅服务于后续落地与演进。

本目录用于沉淀 **Logix Engine 运行时侧** 的实现细节、技术决策与潜在风险分析。  
核心目标：

- 把「架构规范」背后的 **具体实现思路** 写清楚，避免后续开发时各自揣测导致跑偏；
- 在进入实现阶段前，提前暴露「难点 / 隐患 / 取舍」，形成可审阅的技术决策记录；
- 为未来 v4 等版本的演进预留空间（如 Env 强隔离、Lazy 模块加载等），但不绑死当前实现。

## 使用方式

- 当我们在讨论 **App/Module/Store 模块体系、Logic Middleware、Store 生命周期、调试/诊断机制** 等「架构级」能力时，**务必同步在本目录下补一份实现备忘**：
  - 描述预期的 Effect/Layer/Scope 组合方式；
  - 标出可能的坑（性能、可观测性、错误语义、与平台解析的耦合点等）；
  - 若有多种实现路径，明确当前“首选方案”与备选方案。
- 本目录中的文档可以比 core/ 下的规范 **更细、更偏工程实现**，但一旦发现与核心规范冲突，应先修 core/ 规范，再修这里。

## 规划中的子文档

建议按能力领域拆分实现备忘：

- `app-runtime-and-modules.md`  
  记录 `Logix.app` / `Logix.module` / `ModuleDef` 的 flatten 规则、`imports/providers/processes/exports` 的展开顺序，以及 v3 使用 Env 扁平合并的具体实现方案；分析未来 Env 裁剪 / Lazy 模块加载的可能路径与风险。

- `logic-middleware-and-aop.md`  
  记录 Logic Middleware (`Logic.Meta` / `Middleware` / 组合与注入方式) 的实现草图：如何在 `Logic.make` 周期内挂载 Module/App 级 `middlewares`，如何保证 A/E/R 泛型不被破坏，以及平台如何可靠识别可解析子集。

- `store-lifecycle-and-scope.md`  
  记录 Store 生命周期钩子 (`lifecycle.onInit/onDestroy`) 与 Effect Scope 的绑定关系：Local Store vs Global Store 的 Scope 管理、finalizer 的注册时机与错误处理策略。

> 注：以上文件名仅为建议，可根据实际实现拆分/合并。关键是做到：**每一块复杂能力，在规范确定后，都有一份对应的实现说明文档可查**。
