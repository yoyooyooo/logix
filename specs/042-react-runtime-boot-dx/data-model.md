# Data Model: React 冷启动/解析策略（概念模型）

**Feature**: `042-react-runtime-boot-dx`  
**Created**: 2025-12-27  
**Note**: 本特性不引入持久化数据；此文件描述“策略配置/诊断/基线证据”的概念模型，供实现与文档对齐。

## 1. 启动/解析策略（Boot/Resolve Policy）

### 1.1 Provider 冷启动策略

- **ProviderBootPolicy**
  - `mode`: `"sync" | "suspend" | "defer"`
  - `fallback`: ReactNode（当 mode 为 `suspend/defer` 且 Provider 尚未就绪时显示；layer 未就绪 / preload 未完成等所有等待态统一复用；与现有 `RuntimeProviderProps.fallback` 语义合并）
  - `readyDefinition`: “cache-critical 配置已确定 +（若有 layer）layer 已绑定完成 +（若启用 preload）预加载已完成”（ready 后再渲染 children，避免 mount 后再触发 cache 重建或模块半初始化）
  - `defaultRecommendation`: `suspend`（以 `fallback` 承接等待态，默认避免渲染期同步阻塞；调用方可显式切回 `sync` 或选择 `defer`）
  - `configSnapshot?`: ConfigSnapshotPolicy（Provider 初始化时配置快照的装配策略；即 2.1 建议的组合语义）
  - `preload?`: ModulePreloadPolicy（仅在 mode=`defer` 时生效：在 commit 后预初始化关键模块）

- **ConfigSnapshotPolicy**
  - `mode`: `"sync" | "async"`
  - `syncBudgetMs?`: number（仅 mode=sync 时生效；超预算必须回退 async，并记录诊断）
  - `sourcePrecedence`: `runtime(layer override) > configProvider(env) > default`（沿用现有快照模型）
  - `cacheCriticalFields`: `"frozen" | "live"`（`frozen` 表示子树 mount 后不允许变更会触发 cache 重建的字段；`live` 允许变更但必须显式声明其后果与迁移/回退策略）
  - `cacheVersionDerivation`: “仅由 cache-critical 字段派生”（例如当前实现里仅 `gcTime` 影响 `ModuleCache`，因此 versionKey 应由 `gcTime` 派生；非 critical 字段刷新不触发 cache dispose）
  - `childMountGate`: `"none" | "waitForCacheCriticalReady"`（当选择 async 且 cacheCriticalFields=frozen 时，通常需要 gate 子树直到关键字段就绪）

### 1.2 Module 解析策略

- **ModuleImplInitPolicy**
  - `mode`: `"sync" | "suspend"`
  - `requireExplicitKeyInSuspend`: boolean（dev/test 强制；prod 可告警/诊断）
  - `initTimeoutMs?`: number（suspend 的 pending 上界）
  - `gcTimeMs`: number（沿用 ModuleCache 概念）

- **ModuleTagResolvePolicy**
  - `mode`: `"sync" | "suspend"`
  - `syncBudgetMs?`: number

### 1.3 Cooperative Yield（让异步路径尽早 pending）

- **YieldPolicy**
  - `strategy`: `"none" | "microtask" | "macrotask"`
  - `delayMs?`: number（当 strategy 需要延迟时）
  - `onlyWhenOverBudgetMs?`: number（可选，自适应：首次默认 yield；“首次”应以 runtime/session 维度记忆以对 HMR/remount 鲁棒；后续若历史统计稳定低于阈值则可跳过 yield）
  - `microtaskDefault`: `Effect.yieldNow()`（默认推荐，用于打断同步前缀并尽快进入 pending）

## 1.4 DX Guardrails（开发期告警）

- **RenderPhaseSyncGuardrails**
  - `warnThresholdMs`: number（默认建议 5ms，仅 dev/test 生效）
  - `surfaces`: `["provider", "moduleImplSync", "moduleTagSync"]`（告警覆盖点）
  - `actionHint`: `"switchToSuspend" | "enableYield" | "addBudget"`（输出到 warning 的修复建议模板）
  - `warningFormat`: “包含 source/duration/fix/docs 指针”（告警内容需可复制粘贴、可行动）

## 1.5 Defer（延后）交付形态（Provider gating + preload）

> `defer` 作为本轮交付能力：目标是把“冷启动/首次解析”的主要同步成本从渲染关键路径挪到 commit 后，并通过统一 `fallback` 交付就绪态，避免泄漏半初始化句柄。

- **DEFAULT_PRELOAD_CONCURRENCY**
  - `5`（保守默认值；与 Plan/Tasks 对齐）

- **ModulePreloadPolicy**
  - `handles`: ReadonlyArray<ModuleHandle>（预加载句柄列表；典型为路由 Layout 层的“本页必用模块”，由 Provider 在 commit 后预初始化）
  - `scope`: `"provider"`（预加载实例的生命周期绑定到 Provider 子树/ModuleCache）
  - `concurrency?`: number（可选，并发上限；默认 `DEFAULT_PRELOAD_CONCURRENCY`）
  - `yield?`: YieldPolicy（预加载阶段也可复用 yield 策略，避免微妙的同步前缀阻塞）

## 2. 诊断事件（Slim & 可序列化）

> 事件字段必须可序列化，且复用稳定标识（moduleId/instanceId/txn/op）。

- **react.runtime.config.snapshot**
  - `source`: `"runtime" | "config" | "default"`
  - `mode`: `"sync" | "async"`
  - `durationMs?`: number
  - `fallbackReason?`: string

- **react.module.init**
  - `mode`: `"sync" | "suspend"`
  - `moduleId`: string
  - `instanceId?`: string
  - `key`: string
  - `durationMs?`: number
  - `yield`: `{ strategy: string; delayMs?: number }`

- **react.moduleTag.resolve**
  - `mode`: `"sync" | "suspend"`
  - `tokenId`: string
  - `durationMs?`: number
  - `fallbackReason?`: string

- **react.module.preload**
  - `mode`: `"defer"`
  - `handleKind`: `"ModuleImpl" | "ModuleTag"`
  - `moduleId?`: string
  - `tokenId?`: string
  - `key?`: string
  - `durationMs?`: number
  - `yield`: `{ strategy: string; delayMs?: number }`

## 3. 性能基线（Perf Boundary / Evidence）

- **Metric 命名空间建议**
  - `react.provider.configSnapshotMs`
  - `react.module.preloadMs`
  - `react.module.initMs`
  - `react.moduleTag.resolveMs`

- **Evidence（可选）**
  - `react.yield.strategy`（string）
  - `react.policy.source`（string：runtime/config/default/prop）
