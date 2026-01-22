# Auto Converge 全链路 Trace (009 现状分析)

本文档是 Auto Converge 相关链路在 `packages/logix-core` 的 009 现状快照。
我们顺着**用户代码 -> 构建 -> 运行时**的全链路，分析现有实现与 013 目标的差距。

**Target**: `specs/013-auto-converge-planner`
**Current**: Phase 2/4 (009 Implementation)

## 0. 全链路概览 (Lifecycle Overview)

| 阶段 (Stage)          | 用户侧 / 调用方 (User Code)                 | 009 现状 (Current Impl)                                          | 013 目标与差距 (Impl Gap)                                           |
| :-------------------- | :------------------------------------------ | :--------------------------------------------------------------- | :------------------------------------------------------------------ |
| **1. 设计 (Design)**  | 定义 `StateTrait` (computed/link)           | 纯字符串路径数组 (`string[]`)                                    | **FieldPathId** (Int) 分配 / 静态依赖图                             |
| **2. 构建 (Build)**   | `StateTrait.build(schema, spec)`            | `build.ts`: 字符串归一化 + 简单冲突检查 + 生成线性 Entry 列表    | **ConvergeStaticIR**: 生成紧凑的邻接表 (Adjacency List) + ID 映射表 |
| **3. 安装 (Install)** | `ModuleRuntime.make` / `StateTrait.install` | `install.ts`: 仅注册 program 引用到 Runtime，无预热              | **Cache Init**: 分配 `ExecutionPlanCache`，预热 `ConvergePlanner`   |
| **4. 触发 (Trigger)** | `dispatch` / `txn`                          | `ModuleRuntime.ts`: 开启事务 `StateTransaction`，聚合 `DirtySet` | **Dirty Pattern**: 计算 `Canonical Pattern Key` (Sorted IntSet)     |
| **5. 决策 (Execute)** | Runtime 自动收敛                            | `converge.ts`: 每笔事务重新跑全量拓扑排序 (O(V+E))               | **Planner**: `checkCache` -> `plan` -> `execute` (O(1) hit)         |

---

## 1. 用户编写阶段 (Design Time)

用户通过 declarative API 定义状态与派生逻辑。

```typescript
const MyTrait = StateTrait.from(StateSchema)
  .computed({
     field: "summary.total",
     deps: ["items[].price", "taxRate"],
     derive: (s) => ...
  })
```

### 009 现状 (`state-trait/model.ts`)

- **数据结构**: `StateTraitEntry` 只保存了原始的 `string` 路径。
- **Identities**: 没有任何唯一的数字 ID，完全依赖 `fieldPath` 字符串作为 Key。

### 013 差距

- **缺失 ID**: 必须在 Build 阶段为每个 unique field path 分配 `FieldPathId` (Int32)。
- **Metadata**: 静态依赖图需要更紧凑的表示，而不是分散在 `entry.meta.deps` 里。

---

## 2. 构建阶段 (Build Time)

调用 `StateTrait.build(schema, spec)` 生成 `StateTraitProgram`。

### 009 现状 (`state-trait/build.ts`)

- **逻辑**:
  1.  `normalizeSpec`: 展开 Spec 为 `Entry` 数组。
  2.  Check Single Writer: 确保同一路径只有一个 Writer。
  3.  Check Cycles: 简单的 DFS 检查 link 环。
  4.  Output: 返回包含 `entries`, `graph` (visual only), `plan` (flat list) 的 Program 对象。
- **性能**: 构建过程尚可，但生成的结构对运行时不友好（运行时仍需遍历 Entry 列表）。

### 013 差距

- **Converge Static IR**: 需要新增一步 `exportConvergeStaticIR(program)`。
  - 生成 `FieldPathId` Map (Path -> Int)。
  - 生成 `Adjacency List` (Int -> Int[]) 用于快速依赖查找。
  - 生成 `TopoOrder` (Int array) 用于 `full` 模式的快速执行。

---

## 3. 安装阶段 (Install Time)

Runtime 初始化时调用 `StateTrait.install(bound, program)`。

### 009 现状 (`state-trait/install.ts`)

- **逻辑**:
  - 主要做 `source` 的逻辑绑定（install source refresh）。
  - 对于 `computed/link`，只是简单地把 `program` 挂载到 `bound.__registerStateTraitProgram` 上。
  - Runtime 获取 `program` 后存放在闭包变量中。

### 013 差距

- **Planner 初始化**: 需要在这里初始化 `ConvergePlanner` 实例。
- **Cache 初始化**: 分配 `ExecutionPlanCache` (LRU)。
- **ID 注入**: 确保 ModuleRuntime 拿到的 Static IR 与 ID Map 是 ready 的。

---

## 4. 运行时 - 事务触发 (Runtime Trigger)

用户触发 `dispatch({ type: 'updateName', payload: '...' })`。

### 009 现状 (`ModuleRuntime.ts`)

- **Flow**:
  1.  `runWithStateTransaction` 开启。
  2.  `txnContext` 收集所有 patch，更新 `DirtySet` (Paths: `["user.name"]`)。
  3.  Transaction Body 结束前，调用 `convergeInTransaction`。
- **DirtySet**: 存储的是 `string[]` 路径。

### 013 差距

- **Key Generation**: 在调用 converge 之前或内部，需要将 `DirtySet` (string[]) 转换为 `DirtyPatternKey` (IntSet ID)。
  - Step 1: Path -> ID (Map lookup).
  - Step 2: Define Canonical Pattern (Sort & Dedupe IDs).
  - Step 3: Hash/Structure Key for Cache lookup.

---

## 5. 运行时 - 派生收敛 (Converge Execution)

核心热路径：`StateTraitConverge.convergeInTransaction`。

### 009 现状 (`state-trait/converge.ts`)

这是性能差距最大的地方。

```typescript
// 伪代码流程
const convergeInTransaction = (program, ctx) => {
  // 1. 过滤 Writers (O(N))
  const writers = program.entries.filter(e => ...);

  // 2. 脏检查过滤 (Dirty Mode only) (O(N * M))
  if (mode === 'dirty') {
     // 遍历所有 writers，检查其 deps 是否与 dirtyRoots 重叠
     // 字符串前缀匹配 loop
  }

  // 3. 拓扑排序 (O(V + E)) - 每次事务都跑！
  const order = computeTopoOrder(writers);

  // 4. 执行
  for (const path of order) {
     runWriterStep(...)
  }
}
```

**问题**:

1.  **重复计算**: 每次都重新算 Topo Order，即使依赖图没变。
2.  **字符串操作**: 大量的 `path.startsWith`, `split`, `join`。
3.  **无缓存**: 即使同一种 Dirty Pattern 出现 100 次，也会跑 100 次过滤+排序。

### 013 差距 (Target)

```typescript
// 013 伪代码
const convergeInTransaction = (planner, cache, ctx) => {
  // 1. auto mode check
  if (mode === 'auto') {
    const patternId = getPatternId(ctx.dirty) // Int mapping

    // 2. Cache Lookup (O(1))
    let plan = cache.get(patternId)

    if (!plan) {
      // 3. Plan (if miss) (One-time cost)
      // Check decision budget...
      plan = planner.plan(patternId, staticIR)
      cache.set(patternId, plan)
    }

    // 4. Execute Plan (Int32Array loop)
    executePlan(plan)
  } else {
    // Full Fallback (Existing static topo order)
    executePlan(staticIR.fullPlan)
  }
}
```

---

## 6. 总结 (Summary)

**关键缺失模块**:

1.  **Static IR Generator**: 将 Program 转为 Int ID Adjacency List。
2.  **Planner**: 替代运行时的 `computeTopoOrder`，负责根据 DirtyPattern 生成 Step List。
3.  **Cache**: 存储 `Pattern -> Plan`。
4.  **Auto Policy**: 决策逻辑 (Full vs Plan)。

**改动风险**:

- `converge.ts` 将面临重写。
- 需要小心维护 009 的语义 (e.g., `dirtyAll` fallback)。
- String -> Int 映射必须在同一 `Cache Generation` 内保持一致。
