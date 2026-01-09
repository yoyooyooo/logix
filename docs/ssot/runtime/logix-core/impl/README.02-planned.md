# 规划中的子文档

建议按能力领域拆分实现备忘，并随着实现推进逐步填充：

- `01-app-runtime-and-modules.md`  
  记录 AppRuntime（`makeApp`）/ `Logix.Module.make`（ModuleDef）/ `Module` 的 flatten 规则、`imports/providers/processes/exports` 的展开顺序，以及 Env 扁平合并的具体实现方案；分析未来 Env 裁剪 / Lazy 模块加载的可能路径与风险。

- `02-logic-middleware-and-aop.md`  
  记录 Logic Middleware (`Logic.Meta` / `Middleware` / 组合与注入方式) 的实现草图：如何在 Logic 构造周期内挂载 Module/App 级 `middlewares`，如何保证 A/E/R 泛型不被破坏，以及平台如何可靠识别可解析子集。

- `03-module-lifecycle-and-scope.md`  
  记录 Store 生命周期钩子 (`lifecycle.onInit/onDestroy`) 与 Effect Scope 的绑定关系：Local Store vs Global Store 的 Scope 管理、finalizer 的注册时机与错误处理策略。

- `04-watcher-performance-and-flow.md`  
  记录 `$.onAction / $.onState / $.on` watcher 与 Flow/Logic/ModuleRuntime 之间的调用链、性能模型，以及当前在浏览器环境下的压测基线与调优建议。

- `05-trait-provenance-and-static-governance.md`  
  记录 023 的 traits 静态治理：Contribution → Finalize → Snapshot（`provenanceIndex`）→ Install 的实现链路，以及为何拒绝 Runtime Listeners、如何支撑 Devtools 回溯“规则是谁定义的”。

> 注：以上文件名与拆分方式可以根据实际实现调整，关键是做到：**每一块复杂能力，在规范确定后，都有一份对应的实现说明文档可查**。
