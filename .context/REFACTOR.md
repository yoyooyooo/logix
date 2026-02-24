# Refactor Ledger

> 目标：在不破坏现有功能与测试的前提下，持续提升代码结构、可扩展性、可维护性与性能。
> 分支：`main`
> 基线来源：`origin/main`（同步时间：2026-02-23）
> 说明：自 2026-02-23 起，每个重构 PR 的详细记录单独放在 `.context/prs/*.md`，本文件只保留总览索引。

## 状态定义

- `UNREAD`：尚未阅读源码。
- `ENTRY_READ`：已阅读入口/主路由文件，完成初步定位。
- `DEEP_READ`：已深入阅读核心实现与关键调用链。
- `REFACTORED`：已完成重构并通过本地质量门。

## PR 索引（详细记录见 `.context/prs/`）

- `pr-32.md`：SelectorGraph 核心链路收敛与热路径判断优化
- `refactor-logix-core-process-trigger-stream-factory-20260223.md`：ProcessRuntime 触发器流模块化（已合并 PR #33）
- `refactor-logix-core-runtime-kernel-selection-split-20260223.md`：RuntimeKernel 选择/证据纯函数模块化（已合并 PR #34）
- `refactor-logix-core-cross-module-perf-20260223.md`：事务提交回读消除 + moduleStateChange 静态 readQuery 通道（已合并 PR #35）
- `refactor-logix-core-effects-single-watcher-20260223.md`：Effects 单 watcher 路由与 handler snapshot（已合并 PR #36）
- `refactor-logix-core-process-concurrency-queue-20260223.md`：Process 并发队列原地更新（已合并 PR #37）
- `refactor-logix-core-platform-event-index-20260223.md`：Process 平台事件分发索引化（已合并 PR #38）
- `refactor-logix-core-module-statechange-dedupe-20260223.md`：moduleStateChange 去重路径 Ref.modify 收敛（已合并 PR #39）
- `refactor-logix-core-selectorgraph-reads-by-root-20260223.md`：SelectorGraph 按 rootKey 分组 reads（已合并 PR #40）
- `refactor-logix-core-module-statechange-readquery-diag-20260223.md`：moduleStateChange 诊断路径 readQuery 化（已合并 PR #41）
- `refactor-logix-core-dirtyset-id-fastpath-20260223.md`：StateTransaction dirtySet id-only 快路径（已合并 PR #42）
- `refactor-logix-core-process-latest-mode-inplace-20260223.md`：Process/TaskRunner latest 运行槽统一 + serial/parallel 游标队列（已合并 PR #43）
- `refactor-logix-core-txnqueue-wake-dedupe-20260223.md`：txnQueue wake 通知去重 + 空闲切换防丢唤醒（已合并 PR #44）
- `refactor-logix-core-fieldpath-coderabbit-followups-20260223.md`：CodeRabbit follow-up：field-path id fast-path 分支覆盖 + comparator 不变量显式化（已合并 PR #45）
- `refactor-logix-core-triggerstreams-coderabbit-hardening-20260223.md`：CodeRabbit follow-up：moduleStateChange fallback 缺流守卫 + diagnostics 分支收敛（已合并 PR #46）
- `refactor-logix-core-platform-event-reregister-20260223.md`：CodeRabbit follow-up：platformEvent 重装索引同步与陈旧映射清理（已合并 PR #48）
- `refactor-logix-core-selectorgraph-readless-batching-20260223.md`：SelectorGraph readless 索引 + dirty root 按 rootKey 批处理（已合并 PR #49）
- `refactor-logix-core-txnqueue-acquire-fastpath-20260223.md`：txnQueue 非阻塞抢槽 fast-path + blocked-waiter 原子注册（已合并 PR #47）
- `refactor-logix-core-action-topic-routing-20260224.md`：`$.onAction(tag)` 走 action tag 主题流（已合并 PR #50）
- `refactor-logix-core-dispatch-pressure-source-20260224.md`：dispatch 主/主题 hub 背压诊断来源细化（已合并 PR #51）
- `refactor-logix-core-rowid-updateall-dirtyset-gate-20260224.md`：RowId updateAll 按 dirtySet 门控（已合并 PR #52）
- `refactor-logix-core-selectorgraph-rowid-rootkey-plan-20260224.md`：SelectorGraph 提交扫描去分配 + RowId rootKey 匹配计划缓存（已合并 PR #53）
- `refactor-logix-core-staticirdigest-cache-20260224.md`：converge staticIrDigest 冷路径缓存化（已合并 PR #54）
- `refactor-logix-core-convergeir-precomputed-digest-20260224.md`：ConvergeStaticIr build 预计算 digest 并运行期复用（已合并 PR #55）
- `refactor-logix-core-concurrency-policy-resolve-cache-20260224.md`：并发策略解析缓存化 + txnQueue/dispatch 解析复用（本轮进行中）

## 已看过模块

### 全局级（结构盘点）

- `apps/*`：`ENTRY_READ`（目录与规模已盘点，源码未逐文件阅读）
- `packages/*`：`ENTRY_READ`（目录与规模已盘点，源码未逐文件阅读）
- `examples/*`：`ENTRY_READ`（目录与规模已盘点，源码未逐文件阅读）
- `scripts/*`：`ENTRY_READ`（目录已盘点，源码未逐文件阅读）

### 已深读文件（第一轮）

- `apps/logix-galaxy-api/src/project/project.repo.live.ts`：`DEEP_READ` + `REFACTORED`
- `apps/logix-galaxy-fe/src/galaxy-api/client.ts`：`DEEP_READ` + `REFACTORED`
- `apps/logix-galaxy-fe/src/routes/project.tsx`：`DEEP_READ`（待拆分 UI 组件）
- `packages/domain/src/internal/crud/Crud.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-query/src/Query.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-form/src/internal/form/impl.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/LatestFiberSlot.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/process/selectorDiagnostics.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/module.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/state-trait/rowid.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.ModuleAction.MissingStreams.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.InvalidKind.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Concurrency.LatestVsSerial.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Concurrency.DropVsParallel.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/test-helpers.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.SelectorDiagnostics.Helpers.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/Contracts/Contracts.021.LimitUnboundedConcurrency.test.ts`：`DEEP_READ` + `REFACTORED`
- `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`：`DEEP_READ` + `REFACTORED`

## 模块清单与阅读进度

### Apps

- `apps/api-reference`（2 文件）：`UNREAD`
- `apps/docs`（44 文件）：`UNREAD`
- `apps/logix-galaxy-api`（48 文件，后端）：`ENTRY_READ`（`project.repo.live.ts` 已深读并重构）
- `apps/logix-galaxy-fe`（18 文件，前端）：`ENTRY_READ`（`galaxy-api/client.ts` 已深读并重构）
- `apps/speckit-kanban-api`（15 文件，后端）：`UNREAD`
- `apps/speckit-kanban-fe`（8 文件，前端）：`UNREAD`
- `apps/studio-fe`（9 文件，前端）：`UNREAD`

### Packages

- `packages/domain`（11 文件）：`ENTRY_READ`（`internal/crud/Crud.ts` 已深读并重构）
- `packages/i18n`（12 文件）：`UNREAD`
- `packages/logix-core-ng`（13 文件）：`UNREAD`
- `packages/logix-core`（469 文件，核心运行时）：`ENTRY_READ`（`StateTransaction.ts`、`TickScheduler.ts`、`ProcessRuntime.make.ts`、`process/concurrency.ts`、`process/selectorDiagnostics.ts`、`ModuleRuntime.impl.ts`、`SelectorGraph.ts`、`Process.Trigger.Timer.test.ts`、`Process.Trigger.PlatformEvent.test.ts`、`Process.Trigger.ModuleStateChange.test.ts`、`Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`、`Process.Trigger.ModuleAction.MissingStreams.test.ts`、`Process.Trigger.InvalidKind.test.ts`、`Process.ErrorPolicy.Supervise.test.ts`、`Process.Concurrency.LatestVsSerial.test.ts`、`Process.Concurrency.DropVsParallel.test.ts`、`Process.SelectorDiagnostics.Helpers.test.ts`、`TickScheduler.fixpoint.test.ts`、`Runtime/ModuleRuntime/SelectorGraph.test.ts`、`test-helpers.ts` 已深读并重构）
- `packages/logix-devtools-react`（48 文件）：`UNREAD`
- `packages/logix-form`（66 文件）：`ENTRY_READ`（`internal/form/impl.ts` 已深读并重构）
- `packages/logix-query`（23 文件）：`ENTRY_READ`（`Query.ts` 已深读并重构）
- `packages/logix-react`（113 文件）：`UNREAD`
- `packages/logix-sandbox`（1153 文件，Playground 基础设施）：`UNREAD`
- `packages/logix-test`（21 文件）：`UNREAD`
- `packages/speckit-kit`（47 文件）：`UNREAD`

### Examples

- `examples/effect-api`（15 文件，后端示例）：`UNREAD`
- `examples/logix`（62 文件）：`UNREAD`
- `examples/logix-form-poc`（10 文件）：`UNREAD`
- `examples/logix-react`（66 文件，前端示例）：`UNREAD`
- `examples/logix-sandbox-mvp`（55 文件，前端示例）：`UNREAD`

### Scripts

- `scripts/checks`：`UNREAD`
- `scripts/codemod`：`UNREAD`
- `scripts/ir`：`UNREAD`
- `scripts/migrate`：`UNREAD`
- `scripts/public-submodules`：`UNREAD`

## 候选重构点（待确认）

- `packages/logix-sandbox`：体量最大，优先做模块边界和依赖方向梳理，拆解大文件。
- `packages/logix-core`：核心路径改动需同步性能证据与诊断事件约束，先做“无行为改动”的结构整理与可读性提升。
- `packages/logix-react` / `packages/logix-devtools-react`：检查重复桥接逻辑与 Hook 层职责边界。
- `apps/*-api`：统一服务层组织、错误语义和依赖注入边界。
- `apps/*-fe` 与 `examples/*`：去重复的 UI/状态桥接样板代码。

## 当前已识别重构点（来自已深读模块）

- `apps/logix-galaxy-api/src/project/project.repo.live.ts`
  - 重复出现 `projectExists + NotFoundError` 模板逻辑。
  - 重复出现 `project_groups` 存在性校验逻辑。
  - `owner` 数量校验重复，导致规则修改时需要多点改动。
- `apps/logix-galaxy-fe/src/galaxy-api/client.ts`
  - 多个 API 方法重复拼接 `authorization` / `content-type` 与 `JSON.stringify`。
  - 请求构造样板重复，新增接口时易出现 header/body 漏配。
- `apps/logix-galaxy-fe/src/routes/project.tsx`
  - 单文件职责过重（状态选择、权限判定、表单 state、渲染混杂），下一轮建议组件拆分。
- `packages/domain/src/internal/crud/Crud.ts`
  - `query/save/remove` 三条动作链重复“拿 api 服务 + 缺失错误 + 异常转消息”流程。
  - 重复模板导致后续扩展 CRUD 动作时容易漏掉一致性处理。
- `packages/logix-query/src/Query.ts`
  - 构造流程可读性偏低（多段内联闭包与类型断言混杂），可拆分辅助函数降低认知负担。
- `packages/logix-form/src/internal/form/impl.ts`
  - `rules` 编译与 `manifest` 生成路径中重复存在依赖前缀处理逻辑，维护成本高且易漂移。
  - 相同语义在多处闭包内重复实现，不利于后续扩展和一致性校验。
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `recordPatchFull` 的 patch record 构建使用内联对象扩展，分支噪音高且不利于后续字段扩展。
  - `commit` 同时承担 dirtySet 计算 + transaction 构建 + 提交流程，职责边界不够清晰。
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - `flushTick` 的预算分桶路径使用“先分数组再 slice 再回填 Map”，在高频 tick 下产生额外数组分配与多次遍历。
  - `urgent/nonUrgent` 分桶规则分散在多个局部数组变量上，扩展预算策略时易引入语义漂移。
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - `process:dispatch` / `process:trigger` 事件构造在多处重复，eventSeq/timestamp 维护点分散。
  - `moduleAction` trigger 在 meta/non-meta 两条分支重复构造对象，维护成本高。
  - `moduleStateChange` trigger 逻辑长期内联在 `makeTriggerStream` 内，selector diagnostics 与触发流构建耦合，主分发函数可读性下降。
  - `makeModuleStateChangeTriggerStream` 内 warning 决策、hint 拼装、sample reset 混在单个闭包中，可读性与后续扩展性受限。
- `packages/logix-core/src/internal/runtime/core/process/selectorDiagnostics.ts`
  - 需要作为 selector diagnostics 的单一语义入口维护（阈值、窗口、cooldown、hint 文案），避免未来在多个触发器实现中复制粘贴。
  - 采样统计（calls/sampled/slow/max）若继续散落在调用方，容易造成 reset 时机与 hint 快照读取点漂移。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `RuntimeServiceBuiltins` 注入在 `txnQueue` / `operationRunner` / `transaction` / `dispatch` 四处重复，容易出现新增服务时的维护漂移。
  - `currentOpSeq` 读取与归一化在 `onCommit` / `deferredConvergeFlush` 双点重复，锚点逻辑不易统一治理。
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - 单 selector 快路径把“脏根判定 + selector eval + trace 发射”内联在 `onCommit`，与多 selector 路径重复维护，演进时容易出现语义漂移。
  - 根键命中过滤使用 `Array.includes`，在 selector 高频提交链路存在可避免的线性匹配开销。
- `packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`
  - 手写 `Scope.make + Layer.buildWithScope + Scope.close` 与其他 Process 测试重复，易导致生命周期处理不一致。
  - 手写轮询骨架与“取 runtime snapshot”逻辑分散，影响后续统一超时/重试策略演进。
- `packages/logix-core/test/Process/test-helpers.ts`
  - `collectProcessErrorEvent` 手写 scope/buildWithScope 路径在 `typecheck:test`（CI）下推导为 `Effect<..., any, any>`，与声明的 `Effect<..., never, never>` 不一致。
  - helper 间职责重复：已存在 `withProcessRuntimeScope` 却未复用，导致生命周期与类型推导路径分叉。

## 已完成重构项

- `apps/logix-galaxy-api/src/project/project.repo.live.ts`
  - 新增统一辅助函数：`requireProjectExists`、`requireGroupExists`、`countProjectOwners`、`ensureProjectHasAnotherOwner`。
  - 复用 `requireProjectMemberDirectRoleOrNotFound`，移除重复 SQL 查询片段。
  - 多处调用点改为统一校验入口，降低分支散落与维护成本。
- `apps/logix-galaxy-fe/src/galaxy-api/client.ts`
  - 新增统一请求辅助函数：`requestJson`、`requestAuth`、`requestAuthJson`。
  - 全量替换重复请求样板，保持原有 API 形状与调用方式不变。
- `packages/domain/src/internal/crud/Crud.ts`
  - 抽取 `runWithApi`，统一处理：服务注入缺失提示、业务异常到失败 action 的映射。
  - `query/save/remove` 三条动作链改为复用同一执行骨架，减少重复分支并提升可扩展性。
- `packages/logix-query/src/Query.ts`
  - 抽取 `buildRefreshTargetSchema` / `buildQueriesSchema` 等构造辅助函数，收敛 `make` 内部嵌套闭包。
  - 统一 query 名称收集与校验流程，清理控制器构建段落的结构噪音，保持行为与 API 不变。
- `packages/logix-form/src/internal/form/impl.ts`
  - 抽取共享 helper：`isRelativeRuleDep`、`prefixRuleDeps`、`prefixRuleInputDeps`。
  - 统一 `rules` 编译与 `manifest` 路径中的 deps 前缀逻辑，并通过 `allowNumericRelativeDep` 显式保留原有差异语义。
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 抽取 `normalizePatchStepId` / `buildPatchRecord`，统一 patch 可选字段归一化，保持 full instrumentation 语义不变。
  - 抽取 `buildDirtySet` / `buildCommittedTransaction`，让 `commit` 聚焦事务提交流程与单次写入路径。
  - 性能证据：`.context/perf/logix-core-state-txn-20260222/before.local.default.json`、`.context/perf/logix-core-state-txn-20260222/after.local.default.json`、`.context/perf/logix-core-state-txn-20260222/summary.md`。
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` + `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - 新增 `StateTransaction.commitWithState`，在保持 `commit` 对外语义不变的前提下返回已提交 `finalState`。
  - `ModuleRuntime.transaction` 改为复用 `commitWithState`，移除提交后 `SubscriptionRef.get(stateRef)` 回读，减少一次热路径状态读取。
- `packages/logix-core/src/internal/state-trait/rowid.ts` + `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - 新增 `shouldReconcileListConfigsByDirtySet`：基于 `dirtySet + fieldPathIdRegistry + listConfigs` 判定是否需要执行 `rowIdStore.updateAll`。
  - `ModuleRuntime.transaction` 在 commit 热路径改为“命中相关 dirty roots 才做 RowId 全量对齐”，对 list-heavy 模块减少无关提交的 RowId 遍历成本。
  - 保守语义：`dirtyAll` / 无 registry / 无法映射 rootId 时强制回退 `updateAll`，避免漏同步。
- `packages/logix-core/test/internal/StateTrait/RowId.UpdateGate.test.ts`
  - 新增 8 条纯函数回归，覆盖 dirtyAll、缺失 registry、祖先/后代路径命中、无关路径跳过、未知 rootId 保守回退等分支。
- `packages/logix-core/src/internal/field-path.ts` + `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 新增 `dirtyPathIdsToRootIds`（id-only fast path），并让 `StateTransaction.buildDirtySet` 直接走 numeric-id 专用分支，减少事务提交阶段对 string/path 输入类型的通用分支判定。
  - 抽取 `makeDirtyAllSet` / `buildSpecificDirtySetFromIds`，统一 `dirtyPathsToRootIds` 与 fast path 的 root 收敛与 hash 计算逻辑，保持 `DirtyAllReason/rootIds/keyHash` 语义一致。
- `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`
  - 新增 fast path 回归：前缀收敛、invalid id→`nonTrackablePatch`、missing id→`fallbackPolicy`，锁定 id-only 分支与既有 dirty reason 语义一致。
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
  - `moduleStateChange` 在非诊断路径切换为 `changesReadQueryWithMeta(ReadQuery.make(...))` 静态通道，复用 `SelectorGraph` 增量评估与缓存，减少逐提交 selector 重算。
  - 保留诊断路径（selector 采样/告警）既有实现与语义不变；仅在运行时不支持 `changesReadQueryWithMeta` 时回退旧路径。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
  - 新增 `should ignore commits when unrelated paths change` 回归用例，锁定 `moduleStateChange(path)` 在非相关字段更新下不触发行为。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增 `commitWithState` 与 `commit` 语义等价回归（事务元数据一致 + `finalState` 一致）。
  - 新增 `0-commit` 语义回归（基于 `Object.is` 引用相等：`commit`/`commitWithState` 均返回 `undefined` 且清空 `ctx.current`）。
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - 新增 `partitionModulesForBudget`，将 `flushTick` 预算分桶改为“线性遍历直接写 accepted/deferred Map”，去除 `urgent/nonUrgent` 数组分组与 `slice` 的额外分配。
  - 保持既有语义：`urgentStepCap` 超限仍优先触发 `cycle_detected`，否则仅在 nonUrgent backlog 溢出时标记 `budget_steps`。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增回归用例：`StateTransaction full patch records should normalize optional metadata fields`，锁定 stepId/traitNodeId/from 的可选字段语义。
- `packages/logix-core/test/internal/Runtime/TickScheduler.fixpoint.test.ts`
  - 在 urgent safety 场景补充 low 优先级 commit：验证 `urgentStepCap` 触发时 low backlog 首 tick 必须 defer，后续 tick 正常补齐，锁定分桶语义。
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - 抽取 `nextProcessEventMeta`、`makeDispatchEvent`、`makeTriggerEvent`，统一 process 事件构造并保持 eventSeq/timestamp 语义不变。
  - 收敛 `moduleAction` trigger 重复构造为 `buildModuleActionTrigger`，保持 `actions$`/`actionsWithMeta$` 分支语义一致。
  - 抽取 `resolveModuleRuntime`、`makeTimerTriggerStream`、`makeModuleActionTriggerStream`，收敛 `makeTriggerStream` 分支结构并保持 timer/moduleAction/moduleStateChange 语义不变。
  - 抽取 `ModuleStateChangeTriggerSpec` 与 `makeModuleStateChangeTriggerStream`，将 moduleStateChange 全链路（schema selector、去重、selector diagnostics、warning 事件）从 `makeTriggerStream` 分发函数中剥离，保持行为与错误语义不变。
  - 在 `makeModuleStateChangeTriggerStream` 内继续抽取 `initialSelectorDiagnosticsState`、`evaluateSelectorWarning`、`buildSelectorWarningHint`、`resetSelectorSampling`，收敛 selector diagnostics 的决策/文案/重置逻辑，保持阈值与触发时机不变。
  - 将 `makeTriggerStream` 从条件链改为 `switch(spec.kind)` 分发，并通过 `unreachableNonPlatformTriggerSpec(spec: never)` 建立编译期穷尽检查，降低未来新增 trigger kind 时遗漏分支的风险；对非类型安全输入显式返回 `process::invalid_trigger_kind`。
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`
  - serial/parallel 队列改为原地 `push/shift` + 原地状态更新，移除每次触发都复制队列数组的 O(n) 分配开销。
  - `drainSerial/drainParallel` 改为直接消费队头元素，保持 FIFO 与并发门限语义不变。
  - `peak/currentLength/queue overflow` 统计与告警语义保持不变。
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts` + `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
  - 引入 `LatestFiberSlot` 统一 latest 并发运行槽（`runId + fiber`），收敛两套并发取消/写回守卫实现。
  - latest 路径改为原地 Ref 状态更新，移除对象扩散与 `Fiber.poll` 分支，保持“新触发中断旧 run”语义不变。
  - serial/parallel 队列改为游标队列，避免 `Array.shift()` 导致的 O(n) 出队成本。
- `packages/logix-core/src/internal/runtime/core/process/selectorDiagnostics.ts`
  - 新增 `makeSelectorDiagnosticsConfig`、`initialSelectorDiagnosticsState`、`evaluateSelectorWarning`、`buildSelectorWarningHint`，将 moduleStateChange selector 诊断的阈值/决策/hint 文案抽离为单一 helper。
  - `ProcessRuntime.make.ts` 改为复用该 helper，仅保留采样计数与 warning 事件发射装配，保持 `process::selector_high_frequency` / `process::selector_slow` 判定与 hint 结构不变。
  - 新增 `makeSelectorSamplingTracker`，将 selector 采样统计与窗口内 reset 语义收敛为同一 helper，避免调用侧重复维护采样状态字段。
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - `moduleStateChange` 触发器改为通过 `makeSelectorSamplingTracker` 维护采样计数，并在 warning 评估前使用单次 `snapshot`，保持判定输入与 hint 输出一致。
  - warning 发射后沿用“仅重置 sampled/slow/max，不重置 calls”的既有语义，通过 `resetSampling` 显式表达。
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
  - `moduleStateChange` 的 diagnostics 路径改为优先复用 `changesReadQueryWithMeta(ReadQuery.make(...))`，让 selector 增量评估沿用 SelectorGraph 的 dirty-root 过滤与缓存。
  - 保留 fallback：当 runtime 不提供 `changesReadQueryWithMeta` 时，继续走 `changesWithMeta + dedupeConsecutiveByValue`，保持兼容语义。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts` + `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
  - publish 背压诊断改为“延迟构建 trigger”，无压场景避免额外 trigger 对象构造（保持原行为）。
  - action publish 链路按 `actionHub` 与 `actionTopicHub` 分别发射压力诊断触发源，并在 `trigger.details.source` 中补充 `dispatchEntry/channel/topicTag/fanoutCount/batchSize`。
  - 保持事务窗口与 publish 顺序语义不变，仅增强可解释性与定位颗粒度。
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts`
  - 增加主 hub 与 topic fan-out 两类压力路径断言，锁定 `concurrency::pressure` 的 trigger source 信息透出与兼容阈值行为。
- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts` + `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts`
  - `pressure cooldown` key 新增来源维度（`dispatchEntry/channel/topicTag/actionTag`），避免不同 topic 在同一窗口互相抑制。
  - 新增回归：`actionTopicHub/publish` 在不同 `topicTag` 下都应发出独立 pressure 事件。
- `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json` + `packages/logix-core/test/internal/Contracts/Contracts.021.LimitUnboundedConcurrency.test.ts`
  - 扩展并锁定 `concurrency::pressure` 的 `details.source` 合约字段，修复诊断契约漂移风险（保持 top-level `additionalProperties: false`）。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
  - 新增回归用例：`should not trigger for unrelated path updates in diagnostics mode`，锁定 diagnostics 模式下非相关路径更新不会误触发 process/warning。
- `packages/logix-core/test/Process/Process.SelectorDiagnostics.Helpers.test.ts`
  - 新增 helper 纯函数/状态机单测：覆盖 `evaluateSelectorWarning` 高频触发与 cooldown 抑制分支、`buildSelectorWarningHint` 文案关键字段、`makeSelectorSamplingTracker` 的采样掩码与 reset 语义。
  - 增补 reset 后采样节奏断言：验证 `calls` 不重置时下一次采样命中位置延续（mask=0x3 场景在第 12 次调用命中）。
- `packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`
  - 新增回归用例：非法 `timerId` 触发 `process:error`，并断言 `error.code === process::invalid_timer_id`、`hint` 包含 `DurationInput`。
  - 根据独立审查补强断言：非法 `timerId` 下 `process body` 不会被执行（`invokedCount === 0`），并增加一次额外 `yieldNow` 降低时序脆弱性。
  - 继续收敛测试骨架：将可控 interval 场景改为复用 `withProcessRuntimeScope`，去除手写 scope 生命周期样板并保持 `after > before` 断言语义不变。
- `packages/logix-core/test/Process/Process.Trigger.ModuleAction.MissingStreams.test.ts`
  - 新增回归用例：通过 `ModuleImpl.withLayer` 注入“仅含 `instanceId` 的 fake module runtime”打通 strict scope 依赖门禁，定向命中 `moduleAction` 缺失 stream 分支。
  - 覆盖 `diagnosticsLevel='off'` 时 `process::missing_action_stream` 与 `diagnosticsLevel='light'` 时 `process::missing_action_meta_stream` 的错误码与 `moduleId` hint。
  - 用有上限轮询替代固定 `yieldNow`，并补充“同 processId 无 `process::missing_dependency`、仅一条 `process:error`、message 包含缺失 stream 名称”的稳定性断言。
- `packages/logix-core/test/Process/Process.Trigger.InvalidKind.test.ts`
  - 新增回归用例：以 `as any` 注入畸形 trigger kind，锁定 `makeTriggerStream` default 分支的 `process::invalid_trigger_kind` 失败语义。
  - 断言错误 message 含原始 kind 值、同 processId 下不存在 `process::missing_dependency`、且 process body 不被执行（`invokedCount === 0`）。
- `packages/logix-core/test/Process/test-helpers.ts`
  - 抽取共享 helper：`withProcessRuntime`（统一组装 `ProcessRuntime.layer`）与 `collectProcessErrorEvent`（统一 `scope` 生命周期 + `process:error` 有上限轮询）。
  - `collectProcessErrorEvent` 支持 `onBeforeClose` 回调，允许在关闭 runtime scope 前采集额外观测值（如 `invokedCount`），避免测试严格性回退。
  - `Process.Trigger.ModuleAction.MissingStreams.test.ts` 与 `Process.Trigger.InvalidKind.test.ts` 改为复用 helper，减少重复样板并保持断言语义不变。
  - `Process.Trigger.Timer.test.ts`（invalid timer 分支）与 `Process.Trigger.ModuleStateChange.test.ts`（invalid dot-path 分支）也迁移为复用 helper，统一错误事件采集路径并保持既有断言语义不变。
  - 新增 `withProcessRuntimeScope`，统一封装 `Scope.make` + `Layer.buildWithScope` + `ProcessRuntimeTag` 解析与自动关闭，供“非 process:error”场景复用。
  - `collectProcessErrorEvent` 改为复用 `withProcessRuntimeScope`，收敛 helper 生命周期路径并修复 `pnpm typecheck:test` 的 `Effect<any, any>` 推导偏差。
- `packages/logix-core/test/Process/Process.Trigger.PlatformEvent.test.ts`
  - 改为复用 `withProcessRuntime` + `withProcessRuntimeScope`，去除手写 scope 生命周期样板，保持事件投递与 `invoked===1` 断言语义不变。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
  - 改为复用 `withProcessRuntime` + `withProcessRuntimeScope`，保持 dispatch 次数、warning 轮询与 `process::selector_high_frequency` 断言语义不变。
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
  - 在“selected value changes”场景中改为复用 `withProcessRuntimeScope`，移除手写 `Scope.make/buildWithScope/close` 样板，保持 `invoked === 2` 断言与时序语义不变。
- `packages/logix-core/test/Process/Process.ErrorPolicy.Supervise.test.ts`
  - 改为复用 `withProcessRuntime` + `withProcessRuntimeScope`，移除手写 scope 生命周期样板，保持 `runSeq` 重启/失败序列断言语义不变。
  - 将 runtime snapshot 轮询收敛到 helper 回调内，后续可与其他 Process 测试统一等待策略。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 抽取 `withRuntimeServiceBuiltins`，统一 `txnQueue` / `operationRunner` / `transaction` / `dispatch` 的 builtin 注入样板，保持 serviceId 与 builtinMake 映射语义不变。
  - 抽取 `readCurrentOpSeq`，统一 `onCommit` 与 `deferredConvergeFlush` 的 opSeq 读取归一化逻辑，保持 non-negative integer 语义不变。
  - 抽取 `readTickSchedulerFromRootContext` 与 `refreshTickSchedulerFromEnv`，统一 enqueue-time / onCommit 的 tickScheduler 缓存与 fallback 解析流程，保持 diagnostics 触发条件与 fallback 顺序不变。
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - 抽取 `shouldEvaluateEntryForDirtyRoots` 与 `evaluateEntry`，统一单 selector / 多 selector 的评估语义，减少 `onCommit` 热路径重复逻辑。
  - 为 entry 预构建 `readRootKeySet` 并在脏根过滤阶段使用 `Set.has`，避免重复 `Array.includes` 线性匹配。
  - 保持 `read_query::eval_error` 诊断与 `trace:selector:eval` 事件结构不变，仅做结构收敛与热路径常量优化。
  - 新增 `selectorsWithoutReads` 索引，显式维护 `reads=[]` selector，避免 `multi-selector + registry` 场景漏评估 readless selector。
  - `onCommit` 在 registry 路径改为按 `rootKey` 聚合 dirty roots 再批处理候选 selector，减少同 rootKey 下重复候选扫描与 overlap 判断。
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - 新增回归用例：`only recomputes selectors whose root keys overlap dirty roots in multi-selector mode`，锁定多 selector 路径下根键索引与 overlap 过滤语义。
  - 新增回归用例：`recomputes readless selector in multi-selector mode when registry is available`，锁定 readless selector 在 registry 路径仍会评估且不会误触发无关 static selector。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`
  - 将 effects 执行模型从“每 actionTag 一条 watcher”收敛为“单 watcher 路由”，每条 action 仅做一次 tag 解析与路由查找。
  - 为每个 actionTag 维护 `handlerSnapshot`，注册时刷新，执行时直接复用，去除每次 action 的 `Array.from(handlers.values())` 分配。
  - 保持既有契约：去重键 `(actionTag, sourceKey)`、run-phase 注册仅影响未来 action、handler 失败隔离诊断不变。
- `packages/logix-core/test/internal/Runtime/Effects.DedupeAndDiagnostics.test.ts`
  - 新增回归用例：`should route handlers by actionTag without cross-triggering`，锁定多 actionTag 路由语义。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
  - 引入 `wakePendingRef` + `offerWakeIfNeeded`，将 wake 通知改为“有任务且未挂起 wake 时才发信号”，避免每次 enqueue 都 `Queue.offer(wakeQueue)`。
  - consumer loop 在切换 idle 前新增一次 “sleep 前重检” 路径，规避“队列刚变空时并发入队导致漏唤醒”的竞态窗口。
  - `acquireBacklogSlot` 改为“先抢槽、仅阻塞时才解析并发策略用于压力诊断”，降低非阻塞路径的策略解析开销。
  - `acquireBacklogSlot` 的 `wait` 分支改为在单次 `Ref.modify` 内原子注册 `waiters + 1`，修复“阻塞判定与 waiter 注册分离”导致的漏唤醒窗口。
  - 保持不变量：单消费者串行执行、urgent 优先、nonUrgent 不饿死、背压计数与释放时机不变。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts`
  - 新增回归用例：`drains burst enqueue after idle transition without losing wake-ups`，锁定 wake 去重后 burst 入队不会丢任务或卡死。
  - 新增回归用例：`should not miss wake-up when release happens during blocked acquire diagnostics path`，锁定 blocked diagnostics 窗口中的 release/waiter 竞态。

## 独立审查记录

- 2026-02-24（logix-core / action topic routing 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c8b59-5ee9-7160-b848-882754311412`）基于当前工作树 diff 两轮只读审查（初审 + 修复后复审）
  - 结论：初审发现 1 条中风险（`actionsByTag$` fallback 路径未保持 `_tag/type` OR 语义）；修复并补回归后复审通过，无阻塞问题，可合并
  - 残余风险：建议后续补 `dispatchBatch` topic fan-out 顺序的定向回归测试，进一步锁定顺序兼容性
- 2026-02-23（logix-core / SelectorGraph readless+batching 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c8b07-a145-7380-86a6-98109815f3ce`）基于 `/Users/yoyo/Documents/code/personal/intent-flow.perf-core-loop10` 工作树 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：建议后续补 `releaseEntry` 清理路径与 unknown dirty root 回退分支的定向回归
- 2026-02-23（logix-core / field-path CodeRabbit follow-up 轮次）
  - 审查方式：1 个独立 subagent（explorer，`agent_id=019c8abc-4ae2-7a90-84c6-d9883da9f00f`）基于相对 `origin/main` 的 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：若未来新增“未经过 registry 校验”的 `dirtyPathIds` 入口，`buildSpecificDirtySetFromIds` 的显式不变量会更早抛错，需要在新入口保持同等校验
- 2026-02-23（logix-core / triggerStreams CodeRabbit follow-up 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c8ac9-aae3-7961-9378-12b836bcc6b5`）基于相对 `origin/main` 的 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：guard 当前仅校验 `changesWithMeta` 是否为函数，缺流回归暂未覆盖 `diagnosticsLevel='off'` 场景
- 2026-02-23（logix-core / txnQueue acquire fast-path 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c8ae8-116e-7100-92b7-5a3c32343533`）基于 `/Users/yoyo/Documents/code/personal/intent-flow.perf-core-loop9` 工作树 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：建议后续补“blocked diagnostics 期间取消等待 fiber”场景，进一步锁定 `waiters` 计数回收边界
- 2026-02-23（logix-core / SelectorGraph 核心链路收敛轮次）
  - 审查方式：1 个独立 subagent（explorer，`agent_id=019c865e-f79d-7d33-8fb7-9a53d89bb7bf`）基于当前工作树 diff 做只读审查
  - 结论：无阻塞问题，可合并（单/多 selector 评估语义保持；`readRootKeySet` 为热路径常量优化；新增多 selector 回归测试覆盖关键边界）
  - 残余风险：建议后续补充 `dirtyAll` 与 registry 缺失路径的组合回归，持续监控 `dirtyPathsToRootIds` 与 registry 同步性
- 2026-02-23（logix-core / cross-module perf 轮次）
  - 审查方式：1 个独立 subagent（explorer，`agent_id=019c8913-60ca-7480-bfa1-d301eaf46445`）基于相对 `origin/main` 的 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：fallback 路径首个无关提交可能误触发一次（仅无 `changesReadQueryWithMeta` 场景），后续可补 `prevRef` 预热与实现约束测试
- 2026-02-23（logix-core / effects single-watcher 轮次）
  - 审查方式：1 个独立 subagent（explorer，`agent_id=019c8928-3959-7a11-ab25-40f82a31cc55`）基于相对 `origin/main` 的 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：`effects::watcher_crashed` 当前使用 `actionTag='*'`，后续可增强为回传具体 tag
- 2026-02-23（logix-core / process concurrency queue-mutation 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c894f-df72-75b0-9168-6802eaf562e3`）基于当前分支 diff 做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：建议后续补齐 selectorgraph/runtime-kernel 相关缺口测试（非本轮改动范围）
- 2026-02-22（domain 轮次）
  - 审查方式：1 个独立 subagent（explorer）基于 `origin/main...HEAD` diff 做只读审查
  - 结论：无阻塞问题（未发现行为回归/边界错误）
  - 残余风险：`runWithApi` 成为 CRUD 动作链公共入口，后续扩展动作时建议补充针对 helper 路径的回归测试
- 2026-02-22（logix-query 轮次）
  - 审查方式：1 个独立 subagent（explorer）基于 `origin/main...HEAD` diff 做只读审查
  - 结论：无阻塞问题
  - 残余风险：无
- 2026-02-22（logix-form 轮次）
  - 审查方式：2 个独立 subagent（explorer）；第 1 次提示“数字 deps 语义漂移”，第 2 次基于 `origin/main` 对比复核确认无行为变化
  - 结论：无阻塞问题
  - 残余风险：共享 helper 的 `allowNumericRelativeDep` 选项若后续被误用，可能引入语义漂移
- 2026-02-22（logix-core / StateTransaction 轮次）
  - 审查方式：1 个独立 subagent（explorer）基于当前分支改动做只读审查
  - 结论：无阻塞问题（行为一致性、optional 字段语义、commit/dirtySet 边界均通过）
  - 残余风险：perf 结果呈 mixed，当前样本不支持“确定性提升/回退”硬结论，后续可按更高采样参数复测
- 2026-02-22（logix-core / ProcessRuntime 轮次）
  - 审查方式：1 个独立 subagent（explorer）基于当前分支改动做只读审查
  - 结论：无阻塞问题（事件序号/时间戳语义、moduleAction trigger 语义未漂移）
  - 残余风险：diagnostics=off 场景仍固定 `txnSeq=1`（与既有语义一致），未来若需更强锚点需依赖 meta stream
- 2026-02-22（logix-core / ProcessRuntime 轮次复核）
  - 审查方式：1 个独立 subagent（default）基于最终改动做只读复核
  - 结论：无阻塞问题，可合并
  - 残余风险：`moduleAction` 在 diagnostics=off 路径仍固定 `txnSeq=1`（保持既有语义）
- 2026-02-22（logix-core / ModuleRuntime 轮次）
  - 审查方式：1 个独立 subagent（default）基于当前改动做只读审查
  - 结论：无阻塞问题，可合并
  - 残余风险：helper 收敛后建议补充更直接的定向测试（`RuntimeServiceBuiltins` 注入与 `deferredConvergeFlush.captureOpSeq`）
- 2026-02-22（logix-core / ModuleRuntime tickScheduler 轮次）
  - 审查方式：1 个独立 subagent（default）基于当前改动做只读审查
  - 结论：无阻塞问题，可合并（fallback 顺序与 diagnostics 触发条件保持不变）
  - 残余风险：建议补充“fallback 顺序 + `tick_scheduler::missing_service` 触发条件”的定向测试
- 2026-02-22（logix-core / ProcessRuntime triggerStream 轮次）
  - 审查方式：1 个独立 subagent（default）基于当前改动做只读审查
  - 结论：无阻塞问题，可合并（timer/moduleAction/moduleStateChange 语义保持）
  - 残余风险：建议补充对 `process::invalid_timer_id` 及 moduleAction 缺失 stream 错误码/hint 的定向断言
- 2026-02-22（logix-core / Process timer invalid-id 回归测试轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前改动做只读审查
  - 结论：可合并；经补强 `invokedCount === 0` 后无阻塞问题
  - 残余风险：当前事件采样仍依赖 microtask 调度，若后续启动链路引入额外异步边界，建议演进为可重试等待 helper
- 2026-02-22（logix-core / Process timer invalid-id 回归测试轮次复核）
  - 审查方式：同一独立 subagent（default）基于最终 diff 二次只读复核
  - 结论：无阻塞问题，可合并（`code/hint` 与 `invokedCount === 0` 覆盖有效）
  - 残余风险：`yieldNow` 次数固定仍属于低风险时序耦合，后续可演进为有上限轮询等待 helper
- 2026-02-22（logix-core / ProcessRuntime moduleStateChange helper 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于最终 diff 做只读审查
  - 结论：无阻塞问题，可合并（结构重排，语义保持）
  - 残余风险：建议后续把 trigger kind 分发切为 `switch + assertNever`，降低未来新增 kind 时遗漏分支的概率
- 2026-02-22（logix-core / selector diagnostics helper 轮次）
  - 审查方式：1 个独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于最终 diff 做只读审查
  - 结论：无阻塞问题，可合并（warning 判定/hint/reset 语义保持）
  - 残余风险：建议将 `SelectorDiagnosticsState` / `SelectorWarningDecision` 视情况上提，减少函数内类型噪音
- 2026-02-22（logix-core / trigger switch + assertNever 轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）两次只读审查（初审 + 修正后复核）
  - 结论：无阻塞问题，可合并（timer/moduleAction/moduleStateChange 行为保持，`switch` 穷尽分发成立）
  - 残余风险：建议补“畸形 trigger kind（as any）”回归测试，锁定 `process::invalid_trigger_kind` 语义
- 2026-02-22（logix-core / moduleAction missing streams 测试夹具轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前 diff 只读审查
  - 结论：无阻塞问题，可合并（测试可稳定命中 `missing_action_stream` / `missing_action_meta_stream`）
  - 残余风险：低；若未来启动链路异步边界变化，建议继续沿用“有上限轮询 + processId 精准过滤”的等待模式
- 2026-02-22（logix-core / invalid trigger kind 回归测试轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前 diff 只读审查
  - 结论：无阻塞问题，可合并（可稳定命中 `process::invalid_trigger_kind` 且排除 `missing_dependency` 误命中）
  - 残余风险：轮询上限与错误文案断言存在低维护成本，后续可抽统一等待 helper 并收敛 message 断言策略
- 2026-02-22（logix-core / process test helper 推广轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前 diff 只读审查
  - 结论：无阻塞问题，可合并（`invalid timer` / `invalid dot-path` 语义保持，helper 生命周期稳健）
  - 残余风险：`yieldNow + attempts` 参数仍是经验值，后续若启动链路变慢需调高上限或补更显式等待条件
- 2026-02-22（logix-core / selector diagnostics helper 外提轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前 diff 只读审查
  - 结论：无阻塞问题，可合并（warning 判定、hint 文案、采样阈值与 reset 时机保持等价）
  - 残余风险：建议后续为 `evaluateSelectorWarning` / `buildSelectorWarningHint` 增补纯函数单测，降低 helper 演进时语义漂移风险
- 2026-02-22（logix-core / selector diagnostics sampling tracker 轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前 diff 只读审查
  - 结论：无阻塞问题，可合并（sample mask / slow sample 统计 / warning 后 reset 语义保持）
  - 残余风险：`snapshot()` 在诊断路径有一次额外对象分配；后续可按 perf 证据评估是否需要进一步压缩分配
- 2026-02-22（logix-core / process test helper 平台事件推广轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于当前 diff 只读审查
  - 结论：无阻塞问题，可合并（scope 生命周期与 warning/平台事件断言语义保持）
  - 残余风险：测试仍依赖 `yieldNow` 固定轮询次数，极慢环境可能有低概率时序抖动
- 2026-02-22（logix-core / Process.Trigger.Timer + ModuleStateChange 测试骨架收敛轮次）
  - 审查方式：同一独立 subagent（default，`agent_id=019c850b-5174-7533-a09c-a04f7c5138bc`）基于 `origin/main...HEAD` 最新 diff 只读审查
  - 结论：无阻塞问题，可合并（`after > before` 与 `invoked === 2` 断言语义保持）
  - 残余风险：`yieldNow + TestClock.adjust` 仍有低风险时序耦合，后续可继续收敛为统一等待 helper
- 2026-02-23（logix-core / TickScheduler budget 分桶热路径优化轮次）
  - 审查方式：1 个独立 subagent（explorer，`agent_id=019c8632-7072-7112-90f2-ce7aa0452499`）基于 `origin/main...HEAD` 当前 diff 只读审查
  - 结论：无阻塞问题，可合并（热路径重构 + 回归测试补强）
  - 残余风险：初审提示“accepted Map 顺序可能影响观察链路”；已按审查意见调整为“urgent 优先、nonUrgent 后置”的分桶写入顺序并复跑全量门禁，当前残余风险低

## 未看过模块

- 除本文件“已深读文件（第一轮）”外，其他模块仍未完成深读，后续将继续按优先级推进。

## 下一步（第一轮）

1. 将 `test-helpers.ts` 继续推广到 `Process.Diagnostics.Chain.test.ts`、`Process.Events.Budget.Enforcement.test.ts` 等仍在手写 scope + 轮询的 Process 用例，进一步统一测试骨架。
2. 评估是否把 `selectorDiagnostics` helper 的纯函数测试进一步下沉到 internal/runtime 目录并补充窗口边界（window rollover）场景，以降低后续演进风险。
3. 按“本地类型+测试、性能交 PR CI”节奏推进，并持续更新本台账中的“阅读状态 / 重构点 / 已完成项 / 未看模块”。

- refactor-logix-core-devtoolshub-instance-key-pool-20260224.md：DevtoolsHub diagnostics off 快路径与 instance key 池化（分支 refactor/logix-core-devtoolshub-instance-key-pool，PR 待创建）
