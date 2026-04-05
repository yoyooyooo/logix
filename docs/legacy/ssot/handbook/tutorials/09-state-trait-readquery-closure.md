---
title: StateTrait / ReadQuery / DeclarativeLink 的约束闭包（C_T）教程 · 剧本集（dirty-set → converge → selectorGraph）
status: draft
version: 1
---

# StateTrait / ReadQuery / DeclarativeLink 的约束闭包（C_T）教程 · 剧本集（dirty-set → converge → selectorGraph）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味，并把 runtime 内部“约束闭包（C_T）”这条链路讲清楚（含剧本、坑位、代码锚点、验证入口）。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

本文回答三类问题：

1. 为什么 `dirty-set / readsDigest / converge static IR / selector graph` 这一串都不可省？
2. “digest/diff 稳定”在 runtime 侧到底意味着什么（而不是“随便算个 hash”）？
3. 这些机制如何支撑平台/Devtools（可解释、可门禁、可回放），并在生产默认 `diagnostics=off` 时保持近零成本？

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

如果你只想先把“链路与口径”对齐，按这个顺序读：

1. 事务窗口与参考系：`docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`
2. 事务窗口禁止 IO（硬约束）：`docs/ssot/platform/contracts/00-execution-model.md`
3. StateTrait 术语与边界：`docs/ssot/runtime/logix-core/concepts/10-runtime-glossary.03-statetrait.md`
4. StateTransaction / Devtools 事件契约（实现备忘）：`docs/ssot/runtime/logix-core/impl/README.09-statetransaction-devtools.md`
5. ReadQuery & DeclarativeLink（用户 API 视角）：`apps/docs/content/docs/api/core/read-query.cn.md`

如果你想“直接读可运行教程”，建议从测试入手：

- ReadQuery 编译与 strict gate：`packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`、`packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
- StateTrait 静态 IR / converge / trace：`packages/logix-core/test/StateTrait/StateTrait.StaticIr.test.ts`、`packages/logix-core/test/internal/StateTrait/StateTrait.ConvergeAuto.TraceEvent.test.ts`

---

## 1. 心智模型：什么是“约束闭包（C_T）”？

这里的 **约束闭包（C_T）**，可以理解为：

> 在一个事务窗口（Txn Window）内，给定“哪些字段变了”的**证据（dirty-set）**，runtime 以**显式、可解释、可治理**的方式运行一小组控制律（traits / selectors / links），把状态与派生结果收敛到一个一致点，并产出可回链的 Slim 事件与稳定 digest。

它试图同时满足三件事（缺一不可）：

1. **正确性**：同一 tick/txn 内没有“影子时间线”，不会 tearing；强一致的联动必须能在同一 txn 内完成。
2. **性能**：默认 `diagnostics=off` 时接近零成本；复杂度只能走冷路径（build/compile/export），热路径只做整数索引与有限集合操作。
3. **可解释/可平台化**：平台/Devtools 不读源码也能理解“哪个规则影响了哪个字段”；CI 能基于 digest/diff 做门禁；回放能复现运行轨迹。

要做到这三点，runtime 侧必须把“隐式黑盒”拆成几段**各司其职**的 IR/证据：

- `dirty-set`：本 txn 中“哪些字段根发生了变化”的最小证据（**动态、每次 txn 都不同**）。
- `readsDigest`：selector 声明“它读了哪些字段”的稳定摘要（**静态、可导出**）。
- `converge static IR`：traits 的依赖/写入图 + FieldPathId 表（**静态、可导出**）。
- `selector graph`：订阅侧的增量重算器（**运行时结构，但依赖静态锚点保持可解释**）。

它们共同构成“闭包”：

```text
写入证据（dirty-set） + 静态依赖（converge IR / readsDigest）
  → 事务内收敛（converge）
  → 事务提交（commit）
  → 选择器增量重算（selector graph）
  → 订阅/渲染/跨模块触发（ReadQuery / DeclarativeLink / externalStore）
```

---

## 2. 核心链路（从 0 到 1）

### 2.1 声明层（业务/领域包写什么）

你通常会写两类“受限声明”（都要求确定性、无随机、无时间依赖、无 IO）：

1. **StateTrait**：字段级能力规则（computed/link/source/externalStore/check），让 runtime 能收敛、可解释、可治理。  
   用户视角入口：`apps/docs/content/docs/api/core/state-trait.cn.md`
2. **ReadQuery**：稳定 selector 契约：`selectorId` + `reads` + `select`（以及 equals 语义）。  
   用户视角入口：`apps/docs/content/docs/api/core/read-query.cn.md`

当你做跨模块联动（“读 A 的某些字段 → 触发 B 的 action”）时，理想形态是：

- `Process.linkDeclarative(...)`：只允许 **IR 可识别** 的 read side（ReadQuery 必须 static 且带 readsDigest），write side 只允许 dispatch（禁止直接写 state）。

### 2.2 Build/Load 冷路径：把“规则”编译成静态表（避免热路径扫描）

#### A) StateTrait Static IR（`stir:009:*`）

StateTrait 在 build 时会导出一份“结构化可 diff 的静态 IR”：

- 文件：`packages/logix-core/src/internal/state-trait/ir.ts`
- 关键点：
  - `version: "009"`（当前）
  - `digest: stir:009:<hash>`（只由导出结构决定，稳定）
  - 每个 node 都有 `reads`/`writes`（canonicalized field paths）
  - externalStore node 会把 module-as-source 的 selector 静态信息（`selectorId/readsDigest/fallbackReason`）写进 policy，供平台/诊断消费

`digest` 的稳定性来源（你应该把它当成“可门禁的结构证明”而不是“随便算个 hash”）：

- 只依赖 `stableStringify(base)` 的结果
- `base` 不包含 `instanceId`、时间、随机数
- 字段路径会 canonicalize（`CanonicalFieldPath.normalizeFieldPath`）

#### B) Converge Static IR（`converge_ir_v2:*`）

converge 侧需要更“热路径友好”的静态表：FieldPathId 表、writer/deps 索引、topo order、scheduling（immediate/deferred）等。

- 构建：`packages/logix-core/src/internal/state-trait/build.ts`
- IR 结构与 digest：`packages/logix-core/src/internal/state-trait/converge-ir.ts`

核心输出（都应视为“冷路径一次性产物”）：

- `fieldPaths: FieldPath[]`：FieldPathId 的语义表（**必须覆盖 stateSchema 的全部可枚举路径**）
- `fieldPathsKey = fnv1a32(stableStringify(fieldPaths))`
- `writersKey/depsKey`：收敛图的结构 key（按 writer/deps 列表排序归一化后拼接）
- `staticIrDigest = converge_ir_v2:fnv1a32({ writersKey,depsKey,fieldPathsKey })`

注意 `build.ts` 里有一条“地基注释”（非常关键）：

- `065: FieldPathId semantics must cover all enumerable field paths of stateSchema; otherwise reducer patchPaths can't map and will fall back to dirtyAll.`

也就是说：**FieldPathId 表不是“为了好看”**，它决定了 dirty-set 能不能从字符串路径映射到稳定整数 id；一旦映射不了，系统必须显式退化（dirtyAll），否则会出现“看似增量、实际漏算”的 correctness bug。

### 2.3 事务写入证据：从 patchPaths 到 DirtySet（动态证据）

dirty-set 的定义与退化规则集中在：

- `packages/logix-core/src/internal/field-path.ts`
  - `dirtyPathsToRootIds(...)`：把 `dirtyPaths`（string/FieldPath/FieldPathId）映射成稳定 `DirtySet`
  - `DirtyAllReason`：`unknownWrite | customMutation | nonTrackablePatch | fallbackPolicy`（稳定枚举）

dirty-set 的几个关键“硬口径”：

- 当 `dirtyAll=true`：
  - `reason` 必须提供且稳定（枚举）
  - `rootIds=[]` 必须为空（禁止“既 dirtyAll 又给 roots”的暧昧状态）
- 当 `dirtyAll=false`：
  - `rootIds` 必须 **dedupe + prefix-free + stable sort**
  - 会计算 `keyHash/hashFieldPathIds(rootIds)`（可用于缓存键/证据摘要）

常见退化触发：

1. 写入路径出现 `'*'`（非可追踪写入）→ `dirtyAll=true reason=unknownWrite`（**禁止忽略 `*`**）
2. dirtyPaths 中出现非法/不可解析 path（如带 `[]`/`*`/数字索引/包含 `.` 的 key 等）→ `dirtyAll=true reason=nonTrackablePatch`
3. string path 无法直接映射到 registry（视为“边界输入不可信/歧义”）→ `dirtyAll=true reason=fallbackPolicy`

与这套退化口径配套，ModuleRuntime 会在 dev 环境发出明确诊断（可回放/可解释）：

- `state_transaction::dirty_all_fallback`
  - reducer/setState 没有提供 field-level patchPaths 时触发
  - 入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

### 2.4 事务内收敛：converge 只能发生在 txn window（禁止 IO）

converge 的主实现：

- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

它的第一性目标是：**在 txn window 内，基于 dirty-set 做最小必要的规则执行**（并且可证明/可诊断）。

你在这里会看到几个 runtime 级约束如何落到实现：

1. **必须可解释**：在需要时记录 `trace:trait:converge`（Slim、可序列化），并包含 reasons（例如 `budget_cutoff`、`generation_bumped`、`time_slicing_*` 等）。
2. **必须可治理**：支持 diagnostics level（off/light/full/sampled）与采样策略；默认生产走 off，避免“默认开销税”。
3. **必须可降级但不撒谎**：当 dirty-set 退化为 dirtyAll 或 registry 缺失时，converge 必须走保守策略（可能全量 scheduling），同时给出稳定 reason。

关键证据事件：

- `trace:trait:converge`：converge 决策与执行摘要（由 DebugSink 裁剪保证可序列化）
  - 事件裁剪/门控：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

### 2.5 提交与订阅重算：selector graph 用 dirty-set 做增量

selector graph 的核心实现：

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`

它做的事很简单但非常关键：

- **dirtyAll** → 重新评估所有有订阅者的 selector（保守但慢）
- **有 registry + rootIds** → 用 `indexByReadRoot` + `overlaps` 只评估受影响的 selector（增量）
- **无 registry** → 退化为全量（避免错误增量）

关键证据事件：

- `trace:selector:eval`：一次 selector 评估的 Slim 证据（包含 lane/producer/fallbackReason/readsDigest/changed/evalMs）
- `read_query::eval_error`：selector 抛错诊断（必须可序列化、可回放定位）

### 2.6 ReadQuery 编译：lane（static/dynamic）与 readsDigest 的由来

ReadQuery compile 的实现入口：

- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`

它会把 `ReadQueryInput`（显式 ReadQuery 或函数 selector）编译成 `ReadQueryCompiled`，并产生 `staticIr`：

- `lane: "static" | "dynamic"`
- `producer: "manual" | "jit" | "aot" | "dynamic"`（当前主要是 manual/jit/dynamic）
- `readsDigest?: { count, hash }`
- `fallbackReason?: "missingDeps" | "unsupportedSyntax" | "unstableSelectorId"`

static lane 的来源（常见三档）：

1. **manual**：你传入 `ReadQuery.make({ selectorId, reads, select, equalsKind })`
2. **jit（声明 reads）**：selector 函数上带 `fieldPaths: string[]`（明确声明 reads）
3. **jit（可解析 selector 源码）**：对 `fn.toString()` 做受限解析（path/struct 子集），并用 `stableStringify` + `fnv1a32` 生成 `selectorId`

dynamic lane 的来源：

- 无法确认 reads / 无法受限解析 / 无法提供稳定 selectorId → 进入 dynamic lane，并给出 `fallbackReason`
- 如果无法算稳定 id，会分配 `rq_u<seq>` 形式的 **不稳定 selectorId**（只在进程内有意义）

> 直觉：**readsDigest 是“可增量”的最低门槛**。没有 readsDigest，你就无法把 dirty-set（写侧证据）与 selector（读侧声明）闭合在一起，只能退化到“全量重算”或“相信黑盒”。

### 2.7 strict gate：把“动态 lane”变成可治理/可门禁的契约

ReadQuery strict gate 的实现同在 `ReadQuery.ts`：

- `evaluateStrictGate(...)`：根据配置决定 PASS/WARN/FAIL
- 诊断 code：`read_query::strict_gate`

配置来自 runtime env：

- `packages/logix-core/src/internal/runtime/core/env.ts`（`ReadQueryStrictGateConfig` 相关 Tag）

为什么要有 strict gate？

- 因为 dynamic lane 本质上意味着“平台不可解释/不可门禁/不可保证跨环境一致性”
- strict gate 把它从“实现细节”升级为“可治理的工程规则”，使 CI/平台/领域包可以逐步收紧到 **完全 IR 可识别** 的终态

### 2.8 DeclarativeLink：跨模块闭包必须复用 ReadQueryStaticIr（禁止并行真相源）

DeclarativeLink IR 的定义：

- `packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`
  - **强约束**：read side MUST reuse `ReadQueryStaticIr`（禁止另起一套 selector-like IR）
  - digest：`dlink_ir_v1:*`

DeclarativeLink 的公共入口：

- `packages/logix-core/src/Process.ts` → `Process.linkDeclarative(...)`
  - 在 build 阶段就强制：
    - `staticIr.lane === 'static'`
    - `staticIr.readsDigest != null`
    - `staticIr.fallbackReason == null`
  - 否则直接 throw，并给出修复提示：使用 `ReadQuery.make(...)` 或声明 `selector.fieldPaths`

这个约束的意义：**跨模块联动要做到 same-tick 强一致，read side 必须是静态可识别的**；否则你只能退化到 `Process.link(...)` 的 best-effort 黑盒模型。

---

## 3. 剧本集（你会遇到的所有高频场景）

> 说明：本文把“剧本”写成可操作的排障/设计 checklist：你可以直接对照症状 → 去看哪条证据/事件 → 该改什么。

### A. 终态剧本：field-level mutate → 增量 converge → 增量 selector（纯赚）

**现象**：

- 你用 `$.state.mutate(...)`（或 Reducer.mutate）做更新
- Devtools 看到 `dirtySet.dirtyAll=false`，且 `rootIds` 是稳定小集合
- `trace:trait:converge` 只跑必要 step
- `trace:selector:eval` 只评估受影响的 selector

**你在验证什么**：

- patchPaths 能映射到 FieldPathId（fieldPaths 表覆盖 schema）
- traits/selector 都是纯函数（txn window 内无 IO、无抛错）
- read side 有 readsDigest，闭包成立

### B. dirtyAll 退化剧本：你以为“只是写个 state”，实际把整条链路打回全量

#### B1) reducer / setState 没提供 patchPaths（最常见）

**现象**：

- dev/test 下出现诊断 `state_transaction::dirty_all_fallback`
- hint 提示你改用 `mutate(...)`

**入口**：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

**修复**：

- 优先用 `Logix.Module.Reducer.mutate(...)` / `$.state.mutate(...)` 产生 field-level dirtyPaths

#### B2) dirtyPaths 带 `'*'` / 不可解析路径

**现象**：

- `DirtySet.dirtyAll=true reason=unknownWrite | nonTrackablePatch`

**入口**：

- `packages/logix-core/src/internal/field-path.ts` → `dirtyPathsToRootIds`

**修复**：

- 禁止在事务内走不可追踪写入（`'*'`）
- 保持 path 语法受限（不要把 array index、brackets、wildcards、含 `.` 的 key 当作可追踪路径）

#### B3) FieldPathIdRegistry 无法映射（schema 覆盖不全 / string path 歧义）

**现象**：

- `DirtySet.dirtyAll=true reason=fallbackPolicy`

**入口**：

- `packages/logix-core/src/internal/state-trait/build.ts`（fieldPaths 必须覆盖 schema paths）
- `packages/logix-core/src/internal/field-path.ts`（string path unmappable 视为歧义）

**修复**：

- 确保 stateSchema 可枚举路径被收集并写入 fieldPaths 表（不要遗漏）
- 边界输入尽量用 `FieldPath`（数组）或 `FieldPathId`，少用 string path

### C. ReadQuery 退化剧本：dynamic lane 与 strict gate

#### C1) selector 无法静态识别（unsupportedSyntax / missingDeps）

**现象**：

- `ReadQuery.compile` 产出 `lane="dynamic"`、`fallbackReason=...`
- 若开启 strict gate：出现 `read_query::strict_gate`（warn/error）

**入口**：

- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`

**修复**：

- 最推荐：显式使用 `ReadQuery.make(...)`（给稳定 selectorId 与 reads）
- 次选：给 selector 函数标注 `fieldPaths: string[]`

#### C2) selectorId 不稳定（unstableSelectorId）

**现象**：

- selectorId 变成 `rq_u<seq>`，跨进程/跨次运行不稳定

**修复**：

- 同上：不要依赖 `fn.toString()` 和隐式解析；给显式 ReadQuery 或 fieldPaths 声明

### D. DeclarativeLink / Module-as-Source 的边界剧本（强一致 vs 退化）

#### D1) Process.linkDeclarative 直接 throw（ReadQuery 不满足静态约束）

**现象**：

- 构建 declarative link 时抛错：`ReadQuery must be static with readsDigest`

**入口**：

- `packages/logix-core/src/Process.ts` → `linkDeclarative(...)`

**修复**：

- 只用 `ReadQuery.make(...)` 或 `selector.fieldPaths` 来构建 read node

#### D2) StateTrait externalStore 的 module-as-source 退化（可用但性能下降）

**现象**：

- 诊断：`external_store::module_source_degraded`
- hint：提示提供 static ReadQuery / fieldPaths

**入口**：

- `packages/logix-core/src/internal/state-trait/external-store.ts`

**修复**：

- 让 module-as-source 的 readQuery 满足“IR 可识别”：
  - `lane=static`
  - `readsDigest!=null`
  - `fallbackReason==null`

### E. Converge 预算/时间切片剧本：为了不阻塞热路径

**现象**：

- `trace:trait:converge` 的 reasons 含 `budget_cutoff`、`time_slicing_immediate`、`time_slicing_deferred`

**入口**：

- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

**意义**：

- 这是“性能优先”的硬约束落地：在 txn window 内必须可控地收敛，必要时把一部分 deferred step 延后（并给出可解释证据）

### F. 证据/回链剧本：为什么 Devtools 需要 staticIrDigest gate

**现象**：

- Devtools/消费侧只有在 `staticIrDigest` 匹配时，才会把 `rootIds → rootPaths`
- 不匹配时必须“宁愿展示 ID 也不展示错路径”

**入口（实现备忘录）**：

- `docs/ssot/runtime/logix-core/impl/README.09-statetransaction-devtools.md`（`staticIrDigest gate`）

**意义**：

- 这保证了“解释不撒谎”：跨版本/跨构建的 FieldPathId 表变化时，不会把旧 id 解成新路径

### G. 图结构错误剧本：cycle / multiple writers

**现象**：

- ConvergeStaticIrRegistry 出现 `configError.code = CYCLE_DETECTED | MULTIPLE_WRITERS`

**入口**：

- `packages/logix-core/src/internal/state-trait/converge-ir.ts`（`configError`）
- `packages/logix-core/src/internal/state-trait/build.ts`（writer/depsKey 与 topo 构建）

**修复**：

- 一个字段只能有一个 writer（computed/link/source 等）——否则收敛语义不唯一
- cycle 必须在设计期被消除（拆规则、引入中间字段、或显式调度）

---

## 4. 代码锚点（Code Anchors）

### Public API

- StateTrait：`packages/logix-core/src/StateTrait.ts`
- ReadQuery：`packages/logix-core/src/ReadQuery.ts`
- Process.linkDeclarative：`packages/logix-core/src/Process.ts`

### ReadQuery 编译与治理

- ReadQuery compile / strict gate / staticIr：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- strict gate config Tag：`packages/logix-core/src/internal/runtime/core/env.ts`

### StateTrait 静态 IR / converge IR / build

- StateTrait Static IR（`stir:009:*`）：`packages/logix-core/src/internal/state-trait/ir.ts`
- Converge Static IR（`converge_ir_v2:*`）：`packages/logix-core/src/internal/state-trait/converge-ir.ts`
- FieldPathId 表与 keys 构建：`packages/logix-core/src/internal/state-trait/build.ts`
- Converge txn 实现：`packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

### dirty-set（FieldPathId 语义与退化）

- DirtySet / dirtyPathsToRootIds / DirtyAllReason：`packages/logix-core/src/internal/field-path.ts`

### selector graph 与证据事件

- SelectorGraph 增量评估：`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- 证据事件裁剪/门控：`packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

### DeclarativeLink IR

- DeclarativeLinkIR v1 + digest：`packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`

### 事务落点与 dirtyAll 诊断

- reducer dirtyAll fallback：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- setState dirtyAll fallback：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

---

## 5. 验证方式（Evidence）

建议把测试当“可运行教程”读：

- ReadQuery：
  - `packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
  - `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
- StateTrait：
  - `packages/logix-core/test/StateTrait/StateTrait.StaticIr.test.ts`
  - `packages/logix-core/test/internal/StateTrait/StateTrait.ConvergeAuto.TraceEvent.test.ts`
  - `packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.*`

---

## 6. 常见坑（Anti-patterns）

1. 在 txn window 内做 IO/等待（违反硬约束，且无法回放/解释）。
2. 用 `setState` 或 reducer 直接返回新对象但不提供 patchPaths（把整条链路退化成 dirtyAll）。
3. selector 依赖闭包/外部可变状态或抛错（导致 `read_query::eval_error`，且难以稳定回放）。
4. 依赖 `fn.toString()` 的隐式解析作为稳定来源（它是受限兜底，不是主路；生产应走 ReadQuery.make 或 fieldPaths）。
5. 让 FieldPathId 表覆盖不全（schema paths 漏洞会导致 patchPaths 无法映射，必然 dirtyAll）。
6. Devtools 在 staticIrDigest 不匹配时仍反解 rootIds（会产生“解释撒谎”，必须禁止）。

