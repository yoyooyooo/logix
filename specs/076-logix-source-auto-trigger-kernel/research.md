# Research Notes（现状与反模式）

## 现状入口（Many）

### 1) Query：手写 auto-trigger watcher

- `packages/logix-query/src/internal/logics/auto-trigger.ts`
  - 监听 `setParams/setUi/refresh` action
  - 自行维护 debounce fibers / lastKeyHash
  - 反向依赖 trait/source contract（当前通过 `$.traits.source.refresh`；目标口径是 `callById('logix/kernel/sourceRefresh')`；`call(KernelPorts.sourceRefresh)` 仅作为 TS sugar）

问题：

- 动态控制律散落在 Logic：Devtools 很难看到“结构”，只能看运行期事件；
- debounce/计时器在业务层实现，容易形成影子时间线；
- 触发条件来自 action，而不是来自 state 的真实 dirtyPaths（抽象层级偏上，难以统一治理）。

### 2) Core：TraitLifecycle.makeSourceWiring（反射式解释）

- `packages/logix-core/src/internal/trait-lifecycle/index.ts#makeSourceWiring`
  - 读取 trait program entries
  - 依赖 `meta.triggers/meta.deps`
  - `refreshOnKeyChange(changedPath)` 对 `sourceOnKeyChange` 做线性扫描 + deps 匹配

问题：

- 仍是“从静态 meta 里推断动态”的反射式解释；
- 线性扫描在大量 source 场景不可控；
- changedPath 的粒度/来源不统一（不同 feature 包各自决定何时调用 refreshOnKeyChange）。

## 选项对比（One 的候选）

### A) 保留 triggers/debounceMs，但把 wiring 下沉到 runtime

优点：迁移成本小。  
缺点：仍把动态语义埋在 trait meta，语义集合难以扩展（delay/retry/timeout 仍无处安放），且容易继续漂移。

### B) 移除 triggers/debounceMs，把所有触发策略交给 Workflow（075）

优点：分层最纯粹；所有时间算子进入 Π。  
缺点：Query/Form 的默认体验变差（每个 source 都要写 Program），且会把“绑定语义”过度外包到业务层。

### C) 折中：将 `Π_source` 作为内核受限控制律，复杂工作流升级到 Workflow

裁决：选择 C。

- 内核固化少量、稳定、可解释的默认触发语义（onMount/onDepsChange + debounce）；
- 同时提供明确升级路径：关闭 auto-trigger → 用 Workflow（WorkflowDef/FlowProgram）取代；
- 且必须对齐 073 tick：任何“时间”都要进入证据链，避免影子时间线。
