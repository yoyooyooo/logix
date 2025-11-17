# Data Model: 068 Watcher 纯赚性能优化（运行时实体视角）

> 说明：本特性不是业务数据模型，而是 Runtime 内部的“传播/订阅/证据”实体模型。目标是让实现与回归用例对齐到同一套可解释术语与字段集合（避免并行真相源）。

**Spec**: `specs/068-watcher-pure-wins/spec.md`  
**Plan**: `specs/068-watcher-pure-wins/plan.md`

## Key Entities

### 1) Watcher

- **Meaning**：绑定模块实例生命周期的长期监听规则，对 Action 或 State 变化执行 handler。
- **Key attributes**：
  - `kind`: `action` | `state` | `custom`（来源分类，用于诊断/回归统计）
  - `source`: `tag` | `predicate` | `schema` | `readQuery` | `selector`（订阅源分类）
  - `lifecycle`: start/stop 的可观测锚点（仅在需要时启用，默认近零成本）

### 2) Action Routing (per ModuleRuntime instance)

用于表达“Action 如何从 dispatch 传播到 watcher”。

- **All Actions Stream**：
  - 语义：全量 Action 事件流（保留给 predicate/schema 形态 watcher）。
  - 风险：订阅者越多，publish fan-out 与背压传播面越大。
- **Tag Topic Stream**：
  - 语义：按 tag 分发的专用事件流（用于 `$.onAction("tag")`）。
  - 约束：topic 仅按需创建；无订阅时不应产生常驻成本。

### 3) ReadQuery / Selector Subscription

用于表达“State 订阅如何声明依赖与等价判定”。

- **ReadQueryCompiled**：
  - `selectorId`：稳定订阅 id（用于缓存/索引/诊断锚点）
  - `lane`：`static` | `dynamic`
  - `reads`：依赖字段集合（可为空；为空视为“无法声明依赖”或“全量依赖”）
  - `equalsKind`：等价判定类别（用于去重）
- **SelectorGraph Entry**：
  - `reads` / `readRootKeys`：用于 dirtySet 命中筛选
  - `cachedValue` / `cachedAtTxnSeq`：用于去重与调试

### 4) Dirty Evidence (per transaction)

用于表达“一次提交影响了哪些字段”。

- **DirtySet**：
  - `dirtyAll: boolean`
  - `paths: ReadonlyArray<FieldPath>`
- **Patch evidence**：
  - 由写入侧（mutate/reducer/traits）提供字段级 evidence
  - 若缺失则可能退化为 `dirtyAll`

### 5) Perf/Regression Evidence

用于表达“可回归、可判定的证据产物”。

- **Perf Report**（before/after/diff）：必须可比（同环境/同矩阵/同配置）。
- **Resource counters**（测试/回归用例）：用于判断是否泄漏或灾难性退化（上界稳定/销毁后回落）。

## Invariants

- **INV-001**：任何 watcher 的生命周期必须严格绑定模块实例 Scope；实例销毁后不得继续有事件外溢。
- **INV-002**：`selectorId` 必须稳定且与关键语义（lane/reads/equalsKind）一致，禁止“不同语义共享同一 selectorId”。
- **INV-003**：当 `dirtySet` 与订阅 reads 无交集时，订阅不得触发 handler（增量通知成立）。
- **INV-004**：默认档位近零成本：未启用回归/观测时，不得引入随事件次数增长的常驻分配或线性扫描。

