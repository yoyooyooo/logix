# Data Model: 事务性能控制（实体与状态）

**Feature**: `specs/019-txn-perf-controls/spec.md`  
**Contracts**: `specs/019-txn-perf-controls/contracts/*`  
**Created**: 2025-12-20

> 目标：为“增量派生/校验、同步合并提交、显式 batch/低优先级、以及诊断解释链路”提供统一的数据模型（不含实现细节）。

## Entity: TransactionWindow

表示一次同步事务窗口（同一 instance 内的串行执行单元），聚合一个或多个写入操作，并在窗口结束最多产生一次可观察提交。

**Fields**
- `instanceId: string`：稳定实例标识。
- `txnSeq: number`：单调递增事务序号（同一 instance 内）。
- `txnId: string`：可复现事务标识（例如 `${instanceId}::t${txnSeq}`）。
- `origin: TxnOrigin`：触发源（dispatch/devtools/source-refresh/…）。
- `startedAtMs: number`：事务开始时间（元信息，不作为身份来源）。
- `durationMs?: number`：事务窗口耗时（诊断开启时采集）。
- `opCount?: number`：写入操作数（诊断开启时采集）。

**Relations**
- 1 TransactionWindow → 0..N `WriteOperation`
- 1 TransactionWindow → 0..1 `CommitEvent`
- 1 TransactionWindow → 0..N `TraitConvergeDecision`
- 1 TransactionWindow → 0..N `ValidationRun`

## Entity: WriteOperation

事务窗口内的一次“可追踪写入”。用于归因 dirty-set 与增量派生/校验。

**Fields**
- `opSeq: number`：单调递增操作序号（同一 txn 内）。
- `kind: string`：写入类别（reducer/update/mutate/…）。
- `originDetail?: object`：可序列化的补充信息（可选，Slim）。
- `patchCount?: number`：本次写入记录的 patch 数量（如有）。
- `dirtySet: DirtySet`：影响域证据（字段路径集合或 dirtyAll）。

**Invariants**
- `dirtySet` MUST 可序列化且稳定（可比较）。
- `dirtySet` MUST 是 O(写入量) 生成的证据，不从全量 state 推导。

## Entity: DirtySet

表示一次事务（或单个 write op）影响到的字段路径集合，用于增量 converge/validate 与诊断归因。

**Fields**
- `dirtyAll: boolean`：是否退化为全量影响（未知写入或证据不足）。
- `paths?: ReadonlyArray<string>`：字段路径集合（已 canonicalize）。
- `reason?: DirtyAllReason`：当 `dirtyAll=true` 时的原因枚举。

**Notes**
- 字段路径 canonical 规则应与 runtime 的 field-path 工具保持一致（忽略索引等）。

## Entity: CommitEvent

表示一次“对外可观察提交”的元信息（订阅通知 + `state:update` 诊断事件的统一抽象）。

**Fields**
- `commitSeq: number`：提交序号（同一 instance 内单调递增，可选）。
- `commitMode: CommitMode`：普通 / batch / lowPriority（或组合策略）。
- `priority: UpdatePriority`：提交对外可见性优先级（Normal/Low）。
- `dirtySet: DirtySet`：本次提交的聚合影响域。
- `patchSummary?: PatchSummary`：可选的 patch 统计（Slim）。
- `convergeSummary?: ConvergeSummary`：可选的 converge 统计（Slim）。
- `validateSummary?: ValidateSummary`：可选的 validate 统计（Slim）。

## Entity: BatchWindow

显式开启的同步聚合窗口：窗口内多次写入对外只产生一次 CommitEvent。

**Fields**
- `batchId: string`：可复现标识（同一 instance 内单调序号或组合）。
- `openedAtTxnSeq: number`：开启时所处的 txnSeq（可选）。
- `closedAtTxnSeq?: number`：关闭时所处的 txnSeq（可选）。
- `maxDelayMs?: number`：最大延迟上界（若 batch 允许跨 tick 延迟，可选；默认不建议）。

**Invariants**
- BatchWindow 内不得执行 IO/await；仅包裹同步写入。

## Entity: UpdatePriority

用于可见性调度的优先级标签。

**Values**
- `normal`
- `low`

## Entity: CommitMode

用于解释“为何对外只看到一次提交/为何被延迟”的调度模式标签。

**Values**
- `normal`：默认同步事务提交。
- `batch`：显式批处理窗口内的聚合提交。
- `lowPriority`：低优先级可见性调度导致的延迟/合并（主要在消费层生效）。

## Entity: TraitConvergeDecision

表示一次 converge 决策与执行证据（增量/全量/回退原因/缓存证据等），与 013 的 schema 对齐。

**Fields**
- `requestedMode: string`：请求模式（auto/dirty/full）。
- `decidedMode: string`：实际执行模式（dirty/full/noop）。
- `reasonCodes: ReadonlyArray<string>`：决策原因（Slim）。
- `budgetMs: number`：预算。
- `decisionDurationMs?: number`：决策耗时（诊断开启时）。
- `executionDurationMs?: number`：执行耗时（诊断开启时）。
- `dirtySetEvidence?: DirtySet`：本次 converge 使用的影响域证据（如有）。
- `cacheEvidence?: object`：缓存命中/未命中证据（Slim，见 013）。

## Entity: ValidationRun

表示一次 validate 运行证据：最小检查集、耗时、结果摘要。

**Fields**
- `scope: string`：validate 作用域（transaction / explicit / other）。
- `dirtySetEvidence: DirtySet`：用于缩小校验范围的影响域证据。
- `checkCount: number`：实际执行的 check 数量。
- `durationMs?: number`：执行耗时（诊断开启时）。
- `errorCount?: number`：错误数量摘要（Slim）。

## Enum: DirtyAllReason

**Values**
- `unknownWrite`
- `customMutation`
- `nonTrackablePatch`
- `fallbackPolicy`

