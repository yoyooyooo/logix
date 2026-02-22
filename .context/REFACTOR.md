# Refactor Ledger

> 目标：在不破坏现有功能与测试的前提下，持续提升代码结构、可扩展性、可维护性与性能。
> 分支：`refactor/logix-core-process-modulestatechange-helper-20260222`
> 基线来源：`origin/main`（同步时间：2026-02-22）

## 状态定义

- `UNREAD`：尚未阅读源码。
- `ENTRY_READ`：已阅读入口/主路由文件，完成初步定位。
- `DEEP_READ`：已深入阅读核心实现与关键调用链。
- `REFACTORED`：已完成重构并通过本地质量门。

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
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`：`DEEP_READ` + `REFACTORED`

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
- `packages/logix-core`（469 文件，核心运行时）：`ENTRY_READ`（`StateTransaction.ts`、`ProcessRuntime.make.ts`、`ModuleRuntime.impl.ts`、`Process.Trigger.Timer.test.ts` 已深读并重构）
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
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - `process:dispatch` / `process:trigger` 事件构造在多处重复，eventSeq/timestamp 维护点分散。
  - `moduleAction` trigger 在 meta/non-meta 两条分支重复构造对象，维护成本高。
  - `moduleStateChange` trigger 逻辑长期内联在 `makeTriggerStream` 内，selector diagnostics 与触发流构建耦合，主分发函数可读性下降。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `RuntimeServiceBuiltins` 注入在 `txnQueue` / `operationRunner` / `transaction` / `dispatch` 四处重复，容易出现新增服务时的维护漂移。
  - `currentOpSeq` 读取与归一化在 `onCommit` / `deferredConvergeFlush` 双点重复，锚点逻辑不易统一治理。

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
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增回归用例：`StateTransaction full patch records should normalize optional metadata fields`，锁定 stepId/traitNodeId/from 的可选字段语义。
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
  - 抽取 `nextProcessEventMeta`、`makeDispatchEvent`、`makeTriggerEvent`，统一 process 事件构造并保持 eventSeq/timestamp 语义不变。
  - 收敛 `moduleAction` trigger 重复构造为 `buildModuleActionTrigger`，保持 `actions$`/`actionsWithMeta$` 分支语义一致。
  - 抽取 `resolveModuleRuntime`、`makeTimerTriggerStream`、`makeModuleActionTriggerStream`，收敛 `makeTriggerStream` 分支结构并保持 timer/moduleAction/moduleStateChange 语义不变。
  - 抽取 `ModuleStateChangeTriggerSpec` 与 `makeModuleStateChangeTriggerStream`，将 moduleStateChange 全链路（schema selector、去重、selector diagnostics、warning 事件）从 `makeTriggerStream` 分发函数中剥离，保持行为与错误语义不变。
- `packages/logix-core/test/Process/Process.Trigger.Timer.test.ts`
  - 新增回归用例：非法 `timerId` 触发 `process:error`，并断言 `error.code === process::invalid_timer_id`、`hint` 包含 `DurationInput`。
  - 根据独立审查补强断言：非法 `timerId` 下 `process body` 不会被执行（`invokedCount === 0`），并增加一次额外 `yieldNow` 降低时序脆弱性。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 抽取 `withRuntimeServiceBuiltins`，统一 `txnQueue` / `operationRunner` / `transaction` / `dispatch` 的 builtin 注入样板，保持 serviceId 与 builtinMake 映射语义不变。
  - 抽取 `readCurrentOpSeq`，统一 `onCommit` 与 `deferredConvergeFlush` 的 opSeq 读取归一化逻辑，保持 non-negative integer 语义不变。
  - 抽取 `readTickSchedulerFromRootContext` 与 `refreshTickSchedulerFromEnv`，统一 enqueue-time / onCommit 的 tickScheduler 缓存与 fallback 解析流程，保持 diagnostics 触发条件与 fallback 顺序不变。

## 独立审查记录

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

## 未看过模块

- 除本文件“已深读文件（第一轮）”外，其他模块仍未完成深读，后续将继续按优先级推进。

## 下一步（第一轮）

1. 继续收敛 `makeModuleStateChangeTriggerStream` 内部 selector diagnostics 段落到局部 helper（例如 warning 决策与 hint 构造），保持语义不变。
2. 补 `moduleAction` 缺失 stream 的错误码/hint 定向回归测试（补齐上一轮独立审查建议）。
3. 按“本地类型+测试、性能交 PR CI”节奏推进，并持续更新本台账中的“阅读状态 / 重构点 / 已完成项 / 未看模块”。
