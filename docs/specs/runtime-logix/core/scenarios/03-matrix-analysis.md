# Scenario Matrix Analysis (全场景矩阵分析)

> **Status**: Draft
> **Methodology**: MECE (Mutually Exclusive, Collectively Exhaustive)
> **Purpose**: 通过正交分解，穷尽 Logix 可能面临的所有业务场景，验证 API 的完备性。

## Dimension 1: Trigger Source (触发源)
*   **T1 (Single Path)**: 单个字段变化 (e.g. `user.name`)
*   **T2 (Multi Path)**: 多个字段组合变化 (e.g. `start` & `end`)
*   **T3 (Collection)**: 数组/字典增删改 (e.g. `items[0].price`, `items.push`)
*   **T4 (External)**: 外部流事件 (e.g. WebSocket, Timer)
*   **T5 (Lifecycle)**: Store 初始化/销毁

## Dimension 2: Effect Type (副作用类型)
*   **E1 (Sync Mutation)**: 同步修改状态
*   **E2 (Async Computation)**: 异步计算/API 调用
*   **E3 (Flow Control)**: 防抖/节流/竞态/重试
*   **E4 (Batch/Transaction)**: 批量更新/原子操作

---

## The Matrix (场景矩阵)

| ID | Trigger | Effect | Scenario Description | API Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S01** | T1 | E1 | **基础联动**: 改 A 变 B | `flow.fromChanges(s => s.a).pipe(flow.run(...))` | ✅ |
| **S02** | T1 | E2 | **异步回填**: 改 Zip 查 City | `flow.fromChanges(s => s.zip).pipe(flow.runLatest(effect))` | ✅ |
| **S03** | T1 | E3 | **防抖搜索**: 输入搜索词，防抖查 API | `flow.fromChanges(...).pipe(flow.debounce(500), flow.runLatest(effect))` | ✅ |
| **S04** | T2 | E1 | **联合校验**: Start <= End | `flow.fromChanges(s => [s.start, s.end]).pipe(flow.run(effect))` | ✅ |
| **S05** | T2 | E2 | **多参查询**: 只有当 A 和 B 都存在时查 API | `flow.fromChanges(...)` + `$.match` | ✅ |
| **S06** | T3 | E1 | **行级联动**: 改某行 Price 算 Total | `flow.fromChanges(s => s.items).pipe(flow.run(effect))` | ✅ |
| **S07** | T3 | E2 | **行级异步**: 改某行 ID 查详情 | `flow.fromChanges(s => s.items).pipe(flow.run(Effect.all(effects)))` | ✅ |
| **S08** | T3 | E4 | **全选/反选**: 批量更新所有行 | `flow.fromAction(a => a._tag === 'toggleAll').pipe(flow.run(effect))` | ✅ |
| **S09** | T3 | E2 | **列表聚合**: 算总价 (Sum) | `flow.fromChanges(s => s.items).pipe(flow.run(effect))` | ✅ |
| **S10** | T4 | E1 | **实时推送**: WS 推送更新状态 | `wsStream.pipe(flow.run(effect))` | ✅ |
| **S11** | T4 | E4 | **高频推送**: WS 高频推送，批量更新 UI | `wsStream.pipe(Stream.chunkN(), flow.run(chunk => ...))` | ⚠️ |
| **S12** | T5 | E2 | **初始化加载**: Store 创建查 API | 在 Logic 程序的 `Effect.gen` 主体中直接执行 Effect | ✅ |
| **S13** | T5 | E1 | **销毁清理**: 断开连接 | Scope 自动管理 / `addFinalizer` | ✅ |
| **S14** | T1 | E3 | **失败重试**: API 失败自动重试 | `Effect.retry` (原生能力) | ✅ |
| **S15** | T1 | E3 | **竞态取消**: 新请求取消旧请求 | `flow.runLatest(effect)` | ✅ |

---

## Gap Analysis (缺口分析)

通过矩阵分析，我们发现了以下潜在缺口或需要特别注意的点：

### 1. 高频推送的批量更新 (S11)
*   **问题**: 如果 WebSocket 每秒推送 1000 次，单纯的 `set` 会导致 UI 卡死。即使有 `batch`，也需要一个机制来“收集”一段时间内的推送，然后一次性 `batch` 写入。
*   **解法**: 需要结合 Effect 的 `Stream.buffer` 或 `Stream.groupedWithin`。这属于 User Land 的逻辑，但 Logix 应该提供示例。

### 2. 数组的精细化操作 (S06, S07)
*   **问题**: `watchPattern` 虽然能监听到变化，但如果数组很大，频繁触发 pattern 匹配可能会有性能开销。
*   **解法**: 依赖底层的路径匹配算法优化。在 v1 中，这是实现的难点。

### 3. 复杂的流控制组合 (S15+)
*   **问题**: 如果既要防抖，又要竞态取消，还要重试，还要错误回退，代码会很复杂。
*   **解法**: Effect 的组合子 (`pipe`, `retry`, `timeout`) 是解药。Logix 不需要额外造轮子，只需要暴露 Effect 的能力。
