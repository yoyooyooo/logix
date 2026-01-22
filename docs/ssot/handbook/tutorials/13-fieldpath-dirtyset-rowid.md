---
title: FieldPath / DirtySet / Patch Recording / RowId 教程 · 剧本集（状态证据的最小完备集）
status: draft
version: 1
---

# FieldPath / DirtySet / Patch Recording / RowId 教程 · 剧本集（状态证据的最小完备集）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把“状态变更证据链”的最小完备集（FieldPathId → DirtySet → Patch Recording → Debug state:update → Devtools）讲透，并解释为什么必须 id-first、为什么必须稳定 reason 枚举、以及 RowIdStore 如何解决 list index 不稳定的问题。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

建议按这个顺序读（先对齐“为什么”，再看“怎么做”）：

1. Digest/Diff/Anchors 教程（统一心智模型）：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`
2. 事务窗口与参考系（txnSeq/opSeq 的语义基础）：`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`
3. StateTransaction/Devtools 契约（实现备忘，SSoT 落点）：`docs/ssot/runtime/logix-core/impl/README.09-statetransaction-devtools.md`（1.1）
4. Converge Static IR（FieldPathId 的语义来源）：`packages/logix-core/src/internal/state-trait/converge-ir.ts`
5. FieldPath/DirtySet/PatchReason（最小证据结构）：`packages/logix-core/src/internal/field-path.ts`
6. Txn patch recording（full/light、256 上限、dirtyAllReason 降级）：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
7. RowIdStore（list 稳定身份层）：`packages/logix-core/src/internal/state-trait/rowid.ts`
8. 作为“可运行教程”的测试入口（挑关键剧本跑）：  
   - dirty-set reason 映射：`packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`  
   - patch bounded + dirty roots canonicalization：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`（StateTransaction 相关用例）  
   - RowId matrix：`packages/logix-core/test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts`

---

## 1. 心智模型：我们要一个“可解释、可 diff、可 gate、热路径不分配”的状态证据

如果你只想“把状态改了”，那确实只需要 `SubscriptionRef.set`。  
但 Logix 要做的是：**把“状态为何变化/哪些部分变化/变化是否可追踪/是否退化/能否重放/能否对比性能”变成可证明的事实源**。

这要求状态证据满足四个硬约束（对齐总体目标与宪法）：

1. **统一最小 IR**：Static IR + Dynamic Trace 双轨。  
   - Static IR：描述“可对齐的表”（fieldPaths/step tables）与其 digest。  
   - Dynamic Trace：描述“某次事务发生了什么”（dirty roots/patches/reasons）。
2. **标识去随机化**：对外可用于对比的锚点必须稳定（digest/ids/reason）。  
   - 允许 runtime instanceId/txnSeq 增长，但不能引入随机数作为协议锚点。
3. **热路径禁分配/禁 IO**：事务窗口里不要 materialize 大对象/字符串路径/重度 JSON；只记录整数与稳定枚举。
4. **退化必须可解释**：任何“追踪不了/对齐不了”的情况，必须显式降级并给出稳定 reason 码（禁止 silent fallback）。

> 本教程讲的 FieldPath/DirtySet/PatchRecording/RowId，就是为了满足这四条。

### 1.1 最小完备集（你需要记住的 6 个对象）

1. **FieldPath**：规范化后的 segments（`ReadonlyArray<string>`），是路径的 canonical 表示。
2. **FieldPathId**：`fieldPaths` table 的下标（整数），只在同一个 `staticIrDigest` 下有意义。
3. **DirtySet**：对外的“哪些根发生变化”证据（`dirtyAll+reason` 或 `rootIds+hash`）。
4. **PatchReason / DirtyAllReason**：稳定枚举，用于统计、diff、gate、排障。
5. **TxnPatchRecord（full 模式）**：有界 patch 记录（最多 256 条）；light 模式只保留摘要。
6. **RowIdStore**：list 的内部稳定身份层（对外仍是 index 心智，但内核用 RowId 做 writeback/gating/定位）。

### 1.2 “id-first” 的含义：不要在热路径里保存/传输可读路径

对外（Debug/Devtools）你最终会想看到 “`a.b.c` 变了”。  
但热路径里你应该记录的是：

- `dirty.rootIds = [12, 88, ...]`
- `dirty.keyHash = fnv1a32(rootIds)`
- `staticIrDigest = converge_ir_v2:...`

**可读路径（rootPaths）只允许在显示/序列化边界**基于 Static IR 反解，不能反过来让 runtime 依赖它（否则会引入性能税和并行真相源）。

---

## 2. 核心链路（从 0 到 1：Static IR → Txn → DirtySet/Patches → Debug → Devtools）

### 2.1 Static IR：fieldPaths table + digest，是 FieldPathId 的唯一语义来源

定义与导出：`packages/logix-core/src/internal/state-trait/converge-ir.ts`

核心结构：

- `ConvergeStaticIrRegistry.fieldPaths: FieldPath[]`
- `ConvergeStaticIrRegistry.fieldPathIdRegistry: FieldPathIdRegistry`
- `staticIrDigest = converge_ir_v2:${fnv1a32(stableStringify({ writersKey, depsKey, fieldPathsKey }))}`

这意味着：

- FieldPathId 不是“全局 id”，它是 **table index**；
- 你必须带着 `staticIrDigest` 才能对齐/反解；
- digest 的定义必须排除 instanceId/time/random（否则无法跨运行对比）。

### 2.2 FieldPathIdRegistry：把 FieldPath 映射到整数 id（并拒绝歧义）

实现：`packages/logix-core/src/internal/field-path.ts`

它提供两条映射路径：

1. **segments → id（强语义）**：`getFieldPathId(registry, ['a','b'])`
2. **dot-string → id（弱语义，仅边界输入）**：`pathStringToId.get('a.b')`

关键点：string path **只被视为 dot-separated 的边界输入**。  
当 schema key 本身包含 `.` 时，string path 会与“嵌套路径”歧义，registry 会主动把该 string key 标记为 ambiguous，并让 string 输入走 `fallbackPolicy` 降级（避免“看起来可读但其实错了”的假解释）。

### 2.3 StateTransaction：事务窗口只做两件事——聚合 dirty roots +（可选）记录 bounded patches

实现：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

两个 instrumentation 档位：

- `light`：只维护 `patchCount + dirtyPathIds + dirtyAllReason`（不保留 patches 列表）
- `full`：额外记录 `TxnPatchRecord[]`（最多 256 条），并可选 capture snapshots

关键语义（务必记牢）：

1. **0 commit**：如果 finalState 与 baseState `Object.is`，commit 返回 `undefined`，不会发 `state:update`（避免噪音）。
2. **单次写入**：commit 只对 `SubscriptionRef.set` 写一次，保证外部订阅一致性。
3. **dirtyAllReason 优先**：一旦命中不可追踪写入，会设置 `dirtyAllReason`，后续不再尝试记录更细粒度 roots（避免“部分可追踪 + 部分不可追踪”的假精确）。
4. **full patches 有界**：超过 256 条只标记 `patchesTruncated=true`，但 `patchCount` 仍然计全量（统计/证据不撒谎）。

### 2.4 DirtySet：对外证据的唯一形态（Devtools 消费侧只认这个）

实现：`packages/logix-core/src/internal/field-path.ts`

两种形态（必须互斥）：

- `dirtyAll=true`：必须给出稳定 `DirtyAllReason`，并且 `rootIds=[]`
- `dirtyAll=false`：输出：
  - `rootIds`（prefix-free、去重、稳定排序）
  - `rootCount`（=`rootIds.length`）
  - `keySize`（固定口径：=`rootIds.length`）
  - `keyHash`（FNV-1a 32-bit over rootIds）

`DirtyAllReason` 的稳定枚举（当前实现）：

- `unknownWrite`：看到了 `'*'` 或最终没有任何可追踪 root
- `customMutation`：path 缺失（undefined）或 reducer 等写入被视为不可追踪
- `nonTrackablePatch`：path 结构非法（例如包含不支持的 bracket）
- `fallbackPolicy`：无法将输入映射到 FieldPathId（例如缺 registry、string path 歧义、id 越界）

### 2.5 Debug 事件：state:update 只携带 id-first 证据，rootPaths 只在显示边界反解

显示边界的反解实现：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

- DebugSink 允许注入 `resolveConvergeStaticIr(staticIrDigest)`，在 record 阶段把 `dirtySet.rootIds` 映射为 `rootPaths`（数组 segments）。
- 但这个反解有硬门：
  - 必须有 `staticIrDigest`
  - 必须能 resolve 到 `ConvergeStaticIrExport`
  - 否则禁止反解，只显示 id 与摘要（避免展示错误信息）

### 2.6 RowIdStore：list 的内部稳定身份层（对外仍保留 index 心智）

实现：`packages/logix-core/src/internal/state-trait/rowid.ts`  
运行时说明：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`（1.5.3）

要点：

- RowId 形态是 string，但**生成必须确定性**（同 instance 递增序列），不能用时间/随机数。
- RowIdStore 解决的是：list 的 insert/remove/reorder 会让 index 失去稳定性，从而让：
  - in-flight writeback 写错行
  - 缓存复用失效
  - 诊断定位漂移
- 解决方式：在 commit 后对齐 `index -> RowId` 映射，优先用 `trackBy`（否则退回 item 引用），并在行被移除时触发 removal 通知（用于清理 trailing/in-flight）。

---

## 3. 剧本集（你会遇到的高频场景）

### A) 为什么 string path 会触发 `fallbackPolicy`：dot-path 歧义

证据用例：`packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`

场景：Static IR fieldPaths 同时存在：

- `['a','b']`（嵌套）
- `['a.b']`（key 本身带点）

此时 string 输入 `'a.b'` 是歧义的，registry 会拒绝把它当成“可靠映射”，并降级为：

- `dirtyAll=true`
- `reason='fallbackPolicy'`

直觉：宁可降级为“我不知道”，也不要输出“看起来很精确但其实错了”的 rootIds。

### B) `'*'` 或空 roots：必须显式降级为 `unknownWrite`

同上用例覆盖：

- `dirtyPaths=['*']` → `unknownWrite`
- `dirtyPaths=[]` → `unknownWrite`

并且 `'*'` 必须优先于具体 roots（禁止“忽略 *”）。

### C) 非法 path：必须显式降级为 `nonTrackablePatch`

同上用例覆盖：例如 `['a[0][']` 这种 bracket 结构非法，必须降级。

### D) roots canonicalization：prefix-free + 稳定排序 + keyHash

证据用例：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`（dirtySet roots 用例）

你会看到：

- 同时记录 `'a.b'`、`'b'`、`['a','b','c']`，最终会被 canonicalize 成 prefix-free roots（避免冗余）。
- `keyHash` 只依赖最终 rootIds，作为“快速 diff 锚点”。

### E) Patch recording 有界：full 模式最多 256 条，并必须标记 `patchesTruncated`

证据用例：同上 `ModuleRuntime.test.ts`（patch bounded 用例）

关键口径：

- `patchCount` 仍然计全量（比如 300）
- `patches.length` 固定最多 256
- `patchesTruncated=true` 且 `patchesTruncatedReason='max_patches'`

直觉：这让你既能看见“发生了很多写入”（统计不撒谎），也能避免导出/序列化失控（有界）。

### F) RowIdStore：insert/remove/reorder 下 in-flight writeback 仍然写回正确行（无 ghost write）

证据用例：`packages/logix-core/test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts`

覆盖的典型场景：

- item 对象被 clone（引用变化但 key 序列不变）→ RowId 仍应复用（避免无谓失效）
- prepend 插入新行 → 旧 in-flight 结果要写回到原来的那一行（不是 index=0）
- remove 删除行 → 被删除行的 in-flight 结果不得写回（no ghost write）
- swap/reorder 重排 → 写回仍对齐到正确 rowId

---

## 4. 代码锚点（Code Anchors）

核心数据结构与归一化：

- `packages/logix-core/src/internal/field-path.ts`（FieldPathIdRegistry / DirtySet / DirtyAllReason / PatchReason）

事务窗口与 patch recording：

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

Static IR（fieldPaths table + digest）：

- `packages/logix-core/src/internal/state-trait/converge-ir.ts`
- `packages/logix-core/src/internal/runtime/core/ConvergeStaticIrCollector.ts`

Debug 显示边界（rootIds → rootPaths 的反解 gate）：

- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

RowIdStore：

- `packages/logix-core/src/internal/state-trait/rowid.ts`

相关 SSoT/实现备忘：

- `docs/ssot/runtime/logix-core/impl/README.09-statetransaction-devtools.md`
- `docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`（1.5.3）

规格/交付单（历史裁决与术语对齐）：

- `specs/065-core-ng-id-first-txn-recording/*`

---

## 5. 验证方式（Evidence）

优先把测试当“可运行教程”：

- DirtySet reason 与歧义 gate：`packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`
- dirty roots canonicalization + patch bounded：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- RowId 行级 writeback：`packages/logix-core/test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts`

---

## 6. 常见坑（Anti-patterns）

1. **把 FieldPathId 当成全局 id**：它只在同一个 `staticIrDigest` 下有意义；缺 digest 的对齐都是错的。
2. **在热路径里保存/拼接可读路径字符串**：会引入性能税与并行真相源；只记录 id + digest，显示边界再反解。
3. **允许自由字符串 reason**：会让统计/gate/diff 失效；必须收敛到稳定枚举（`normalizePatchReason`）。
4. **遇到不可追踪写入还假装精确**：必须显式降级 dirtyAll，并给出稳定 reason（解释不撒谎）。
5. **RowId 用随机数/时间戳**：会破坏可回放与可对比；RowId 必须确定性（instance 内单调序列）。
6. **列表重排仍用 index 定位 in-flight**：会写错行/产生 ghost write；需要 RowIdStore 对齐并在移除时清理。
