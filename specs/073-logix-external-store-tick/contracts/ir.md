# Contracts: IR（ExternalStoreTrait + DeclarativeLinkIR）

> 本文约束本特性的“统一最小 IR”落点：Static IR 可导出、可比对、可冲突检测；Dynamic Trace 只携带 Slim 引用信息。

## 1) Static IR：ExternalStoreTrait

ExternalStoreTrait 必须进入 `StateTraitProgram` 的静态图谱（Graph/Plan），以便：

- 被 TickScheduler 识别为“强一致输入节点”；
- 可进行依赖闭包与增量调度（未来）；
- 可被 Devtools/Alignment Lab 解释（不可成为黑盒）。

实现侧硬约束（避免漂移）：

- ExternalStoreTrait 的 `source` 必须在 **trait build/install** 阶段确定并可导出；TickScheduler/RuntimeStore 不得通过“运行期订阅形状/闭包内容”猜 source.kind。
- 推荐机制：ExternalStore sugars（尤其 `fromModule`）统一携带 internal descriptor（moduleId + `ReadQueryStaticIr`），由 StateTrait.build 读取并生成 Static IR `source` 字段（见 `plan.md#Trait 下沉`）。

最小字段：

- `traitId` / `storeId`（稳定标识）
- `source`（来源类型；必须可识别，禁止“闭包黑盒订阅”）
- `targetFieldPath`（写回路径）
- `priority` / `coalesceWindowMs`（调度元数据，可选）
- `meta`（可序列化白名单）

### 1.1 Module-as-Source（Module → ExternalStoreTrait）

当某个 ExternalStore 来源于“另一个模块的 selector”（对外心智：`ExternalStore.fromModule(...)`），必须在 Static IR 中显式编码其依赖事实源，避免退化为 runtime 黑盒 subscribe：

- 依赖锚点：`moduleId`（必选）+ `instanceKey?`（可选；按 scope/handle 解析）
- 读取事实源：`selectorId` + `readsDigest?`（若是 ReadQuery/static lane）

可识别性门禁（必须实现）：

- `moduleId` 必须在 trait install/build 阶段可解析；若无法解析（例如“动态 moduleRef/宿主黑盒句柄”），必须 **fail-fast**（Runtime Error），禁止静默降级为黑盒订阅。
- `selectorId` 必须稳定可复现：`ReadQuery.compile(selector)` 若落到 `fallbackReason="unstableSelectorId"`，必须 **fail-fast**（否则 Static IR 的锚点不可比对/不可回放）。
- 若 selector 无法产出 `readsDigest`（dynamic lane 或缺 deps），允许退化为 “module-topic edge”（依赖整模块变更而非 selector-topic），但仍必须保持 IR 可识别（`moduleId + selectorId` 可导出），并在 diagnostics=light/full 下给出 Warn（提示性能可能退化）；不得变成 runtime 黑盒 subscribe。

概念形态：

```ts
type ExternalStoreSource =
  | { readonly kind: "external"; readonly storeId: string }
  | {
      readonly kind: "module"
      readonly moduleId: string
      readonly instanceKey?: string
      readonly selectorId: string
      readonly readsDigest?: { readonly count: number; readonly hash: number }
    }

type ExternalStoreTraitStaticIr = {
  readonly traitId: string
  readonly storeId: string
  readonly source: ExternalStoreSource
  readonly targetFieldPath: string
  readonly priority?: "urgent" | "nonUrgent"
  readonly coalesceWindowMs?: number
  readonly meta?: Record<string, unknown>
}
```

语义补充：

- TickScheduler 必须将 `source.kind="module"` 视为“跨模块依赖边”（module readQuery → trait writeback），并尝试在同 tick 内稳定化下游写回（FR-012 / SC-005）。
- 写侧安全仍由下游模块的 ExternalStoreTrait 承担（external-owned + txn-window），不引入“跨模块 direct write”逃逸。

## 2) Static IR：DeclarativeLinkIR（跨模块依赖）

DeclarativeLinkIR 是 TickScheduler 可识别的跨模块依赖表达。它必须满足：

- **依赖事实源唯一**：reads 只能来自 ReadQuery/static deps（可 gate），禁止从闭包捕获/动态路径推导“隐式依赖”。
- **写侧可追踪且受限**：writes 只允许降解为可追踪写入（`dispatch`），禁止 direct state write（避免通过 IR 描述写逃逸）。
- **可裁剪**：IR 必须可 JSON 序列化与裁剪（大对象图、闭包、Effect 本体不得进入 IR）。

> 注：Module-as-Source 的“字段同步”不需要 DeclarativeLinkIR 直接写 state；它通过 ExternalStoreTraitStaticIr 的 `source.kind="module"` 表达跨模块 reads，并由 ExternalStoreTrait 执行写回（更符合 SRP 与写侧防逃逸约束）。

### 2.1 实现侧 Type Definition（落点）

- `StateTraitProgram`：`packages/logix-core/src/internal/state-trait/model.ts`
- `StaticIrNode`（state-trait 的通用静态节点形状，含 reads/writes）：`packages/logix-core/src/internal/state-trait/ir.ts`
- `ReadQueryStaticIr`（selector readsDigest）：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`（public re-export：`packages/logix-core/src/ReadQuery.ts`）
- `DeclarativeLinkIR`（本特性新增，internal）：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

### 2.2 DeclarativeLinkIR（V1，JSON 可序列化）

> 说明：DeclarativeLinkIR **不是用户输入**，而是运行时/编译器在受控 builder 下生成的 internal IR；因此可以保证写侧不逃逸。

```ts
type ReadsDigest = { readonly count: number; readonly hash: number }

type DeclarativeLinkNodeId = string

type DeclarativeLinkIR = {
  readonly version: 1
  readonly nodes: ReadonlyArray<
    | {
        readonly id: DeclarativeLinkNodeId
        readonly kind: "readQuery"
        readonly moduleId: string
        readonly instanceKey?: string
        /** MUST reuse `ReadQueryStaticIr` (no parallel selector-like IR). */
        readonly readQuery: ReadQueryStaticIr
      }
    | {
        readonly id: DeclarativeLinkNodeId
        readonly kind: "dispatch"
        readonly moduleId: string
        readonly instanceKey?: string
        readonly actionTag: string
      }
  >
  readonly edges: ReadonlyArray<{ readonly from: DeclarativeLinkNodeId; readonly to: DeclarativeLinkNodeId }>
}
```

约束补充：

- `kind:"readQuery"` 的 `readQuery.lane` MUST 为 `static`，且 `readsDigest` 必须存在（否则不允许进入 DeclarativeLinkIR；需要读依赖时必须先通过 ReadQuery/static lane 建模）。

### 2.3 跨内核复现约束（core-ng）

DeclarativeLinkIR 只描述“依赖图形状”，不携带运行时语义。要在不同内核（例如 `core-ng`）中复现等价的强一致行为，除了 IR 形状，还必须满足以下 **Runtime Service 语义约束**（本特性视为合同的一部分）：

- tick 边界：默认 microtask；允许显式 `Runtime.batch(...)` 提供更强边界。
- lanes：区分 urgent/nonUrgent；预算超限只允许推迟 nonUrgent；urgent 遇到循环/超限必须安全中断（避免冻结 UI），并输出可解释证据。
- budget 与降级：fixpoint 预算（ms/steps/txnCount）一致；降级必须通过 `trace:tick.result.stable=false`（含 degradeReason）可解释。
- token 不变量：`tickSeq`（或等价 token）未变化时，对外可见 snapshot 不得变化；变化时订阅者必须最终收到通知。
- 事务窗口纪律：事务窗口禁 IO；写入必须可追踪（dispatch/txn），禁止 direct write 逃逸。

结论：IR 不是唯一事实源；异构内核要达到语义等价，必须实现同一组 TickScheduler/RuntimeStore 服务合同（见 `plan.md` 与 `contracts/diagnostics.md`）。

## 3) Dynamic Trace：只携带锚点与摘要

Dynamic Trace（如 `trace:tick`）必须遵守 Slim 原则：

- 只携带 `tickSeq` 与必要锚点（moduleId/instanceId/txnSeq/opSeq）；
- 若需要展示 IR 详情，必须通过 Static IR export（digest 引用）或 on-demand 拉取，而不是把 IR 塞进事件流。

## 4) Export / Evidence（Alignment Lab）

本特性要求能导出：

- ExternalStoreTrait 的静态表（storeId/targetFieldPath/调度元信息）
- DeclarativeLinkIR（nodes/edges + `ReadQueryStaticIr`）

导出必须：

- JSON 可序列化；
- 带版本号；
- 带 digest（用于比对与缓存）；
- 能在 Node.js/browsers 的 trial-run 中复用（不依赖 process-global 单例）。

版本升级策略（约定）：

- `version` 单调递增；解析器必须先按 `version` 分发到对应 schema（禁止“猜字段”）。
- 同一 `version` 内允许新增可选字段；解析器应忽略未知字段（向前兼容解析）。
- 遇到未知 `version` 必须 fail-fast 并提示升级（避免静默误解释导致证据漂移）。
