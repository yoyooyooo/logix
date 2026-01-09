# Research: 045 Dual Kernel Contract（当前内核 + core-ng）

本研究用于把“多内核并行/最终切换”的关键裁决收敛为可落地的实现边界，避免为了并行而引入长期额外成本或并行真相源。

## Decision 0：Kernel Contract 的表达载体（RuntimeKernel / RuntimeServices）

**Chosen**：

- 以 `@logixjs/core` 既有的 **RuntimeServices（RuntimeKernel）机制** 作为 Kernel Contract 的主要表达载体：
  - `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- “内核替换”优先落到 **服务实现选择（serviceId → implId）**，且必须满足：
  - 选择发生在 runtime / instance 创建时（一次性），热路径零分支；
  - 选择结果可生成 **可序列化证据**（供 Devtools/TrialRun/Evidence diff 消费）。

**Rationale**：

- 本仓已经存在：
  - 可序列化的 overrides（runtime_default / provider / instance scopes）；
  - 统一的 selection 逻辑与 evidence 生成；
  - ModuleRuntime 的“仅在构造期选择一次”语义。
- 因此 045 不需要再引入第二套“内核选择协议”，只需要把“core-ng 作为外部实现包能提供实现代码”这一点补齐为可注入装配点。

**Implications**（面向实现阶段）：

- `@logixjs/core-ng` 不直接替换 `@logixjs/core` 的公共 API；它通过 Layer/Tag 注入方式提供某些 runtime service 的实现（并由 `@logixjs/core` 在构造期选择）。
- 若未来 core-ng 需要替换更深的循环（例如 trait converge 内核/执行 VM），应通过“进一步拆分 serviceId”或“在 transaction service 内部替换子引擎”实现；但 045 本身只先固化契约与装配点，不强行预设全部切分粒度。

## Decision 1：包名与依赖拓扑（core / core-ng / react）

**Chosen**：

- `@logixjs/core` 继续是唯一对外入口（Module/Logic/Runtime/Debug/Observability 等 API + Kernel Contract）。
- 新包 `@logixjs/core-ng` 只提供“另一套内核实现”的注入入口（Layer/工厂），不复制对外 DSL。
- `@logixjs/react` 只依赖 `@logixjs/core`，运行时切换发生在“创建 runtime 时选择装配哪套内核实现”。

**Dependency DAG（硬约束）**：

- `@logixjs/react` → `@logixjs/core`
- `@logixjs/core-ng` → `@logixjs/core`
- `@logixjs/core` ✗→ `@logixjs/core-ng`（禁止反向依赖；core-ng 必须是可选实现包）

**Rationale**：

- 把切换点压到“runtime 装配”而不是“业务 import”，迁移更轻；`@logixjs/react`/Devtools/Sandbox 不需要跟着选边。
- core-ng 作为可选依赖，允许并行演进但不会污染默认路径的心智模型与打包链路。

**Alternatives considered**：

- `@logixjs/core-ng` 做成 `@logixjs/core` 的平级克隆（同形 API、二选一 import）  
  Reject：会导致生态分裂（两套类型/入口），并把迁移成本扩散到所有上层包与示例。

## Decision 2：多内核“共存”的边界（避免额外浪费）

**Chosen**：

- 支持“按 runtime（DI 树）选择内核实现”；同进程创建多个 runtime 用于对照/灰度/试跑。
- 不追求“跨内核共享实例/共享同一棵 DI 树/同一实例热切换执行引擎”。

**Rationale**：

- 共享实例意味着要把大量内部状态抽象成“可跨实现共享的中间层”，会显著抬高实现与验证成本，并引入隐蔽串扰风险。
- 对照验证的核心是隔离：两棵 DI 树更容易保证证据可解释、无跨会话污染。

**Semantic Note**：

- “两套内核同时可跑”在本特性里等价于“同进程创建两棵 `ManagedRuntime`（两棵 DI 树）”；实例/状态不共享、也不要求共享。

**Cost note**：

- “多 runtime 并行”只用于 dev/test/trial-run，不作为长期产品形态；因此额外成本主要是测试矩阵与证据跑道，而不是日常开发复杂度。

## Decision 3：是否需要拆一个更底层的包（服务 core 与 core-ng）

**Chosen（当前阶段）**：不新拆 `@logixjs/core-contract` 之类的更底层包。

**Rationale**：

- 当前仓库仍在快速演进，拆包会引入额外的发布/导出/子模块治理与迁移成本。
- `@logixjs/core-ng` 依赖 `@logixjs/core` 的“契约导出”（Tag/类型/schema）足够表达替换点；只要保持契约导出稳定，core-ng 不需要接触 core 的 internal 实现。

**Revisit triggers（出现任一项再考虑拆底层包）**：

- `@logixjs/core-ng` 因依赖 `@logixjs/core` 被迫引入大量“当前内核实现代码”导致不可接受的 bundle 体积/启动成本；
- 出现难以治理的循环依赖（尤其是 devtools/sandbox 侧）；
- 需要把“契约版本”独立发布，并支持多实现包在不锁步升级 `@logixjs/core` 的情况下演进。

## Decision 4：Kernel Contract 的最小闭环（面向实现阶段）

**Chosen**：Kernel Contract 首先覆盖“装配/事务/派生收敛/观测”四类能力，且都必须满足：

- 事务窗口禁 IO/async；
- 统一最小 IR（Static IR + Dynamic Trace）为唯一事实源；
- 稳定锚点（`instanceId/txnSeq/opSeq/...`）可复现；
- diagnostics=off 近零成本；light/full Slim 可序列化；
- 可在 RunSession/TrialRun 下隔离、可 Mock、可导出证据。

**Notes**：

- 具体 Runtime Services 的拆分与命名以 `specs/020-runtime-internals-contracts/` 的服务化方向为参考，但本特性不修改旧 spec，只在实现阶段做落点对齐。

## Decision 5：证据与性能门槛（避免“为并行付出长期税”）

**Chosen**：

- 所有“契约抽象层/装配点”引入的成本，都必须走 `$logix-perf-evidence` 固化为可复现 before/after/diff。
- Browser 必须至少有 1 条自动化跑道（headless）作为门槛之一，避免仅 Node 视角误判。

**Rationale**：

- 本特性最怕的不是功能做不出来，而是“切换点引入隐性热路径分支/分配”，长期拖慢所有上层。

## Open Questions（留到 plan/tasks，不阻塞本阶段）

- core-ng 初期是否允许“能力不全但显式失败”，还是必须提供“显式回退到当前内核”的桥？（默认倾向：显式失败，避免静默漂移）
- `@logixjs/sandbox` 的内核 bundle（`bundle-kernel.mjs`）是否要同步支持打包 `@logixjs/core-ng`？（可作为后续扩展点）
