# Contract: StateTrait（支点 DSL）× Kernel（Graph/Txn）

> 目标：把 StateTrait 固化为“强表达但安全”的中间层语言：最小集合、可组合、可诊断、可完全降解到 Trait 最小 IR。业务层不应直接接触 StateTrait；它服务于领域包实现与生成器/工具链。

## 0. API 分层定位（Form > StateTrait > Trait）

- Form/Query（领域包）：业务默认入口，负责把常见组织形状（field/list/check/source）固化为可推导中间表示，并提供默认 logics。
- StateTrait：中间层 DSL（强表达但安全），暴露最小集合但保持可组合/可诊断；是领域包“降级落点”与 codegen 的主要目标语言。
- Trait（最小 IR）：内核实现细节，负责统一收敛、冲突检测、回放与诊断口径；仅供工具链/生成器/内核使用。

## 1. DSL（编译前）契约

### 1.1 基本组合子

- `StateTrait.from(schema)(spec)`：仅用于类型收窄与路径约束；不改变运行语义。
- `StateTrait.node({...})`：在某个 scope 下声明 `computed/source/link/check`。
- `StateTrait.list({ item?, list? })`：数组字段一等公民，item/list 两个 scope 均可选。
- `$root`：根级 scope（用于跨字段/跨列表校验与摘要）。

### 1.2 显式 deps

- `computed/source/check` MUST 显式声明 `deps: FieldPath[]`；
- Graph/diagnostics/replay 只认 deps 作为依赖事实源；
- 未声明 deps 视为配置错误（应在 build 阶段失败）。

### 1.3 写回目标（冲突检测）

- 每条规则必须有明确写回目标（target fieldPath 或明确 errors scope）；
- 多条规则写回同一非 errors 目标字段 → 配置错误（硬失败，阻止提交）。

### 1.4 组合与合并（路径重复定义 / 覆盖优先级）

- StateTraitSpec MUST 支持“分片组合”（例如领域默认片段 + 业务片段 + 覆盖片段），且合并语义必须确定性。
- 合并后必须进行一致的冲突检测：
  - 对 `computed/source/link`：同一 target 路径重复定义默认视为配置错误；若允许覆盖，必须通过显式机制声明覆盖，并在诊断中可见（不得静默 last-writer-wins）。
  - 对 `check`：允许以“命名规则集合”合并；同名规则冲突默认视为配置错误，或按显式覆盖机制处理（同样必须可诊断）。

## 2. IR（编译后）契约

### 2.1 Program/Graph/Plan

- `StateTrait.build(schema, spec)` MUST 产出：
  - `Program.entries`：规则集合（含 kind/target/deps/meta）；
  - `DependencyGraph`：包含 reverse adjacency；
  - `Plan`：可用于拓扑排序与批处理的执行步骤。

### 2.2 Reverse Closure

- `ReverseClosure(target)` = 所有直接或间接依赖 target 的节点集合；
- `validate(target)` 的最小执行范围 MUST 等于该闭包集合（含自身体）。

## 3. 安装与执行契约

### 3.1 Transaction

- 单次 Operation Window 内对外可观察提交次数 MUST 为 0 或 1；
- 规则执行的所有写入（values/errors/resources/ui）必须落在同一事务中；
- 软降级（超预算/运行时错误）不得产生“半成品状态”，并必须给出诊断标记。

### 3.2 数组语义

- 对外 identity 语义仍为 index；
- 对内允许使用 RowID 虚拟身份层复用缓存；
- 允许预留 `identityHint/trackBy`（仅优化，不改变语义）。

## 4. validate/cleanup 桥接协议（给 Module/UI）

- Field Reference：能稳定表达 field/list/item/root target，并能表达嵌套数组锚点；
- Validate Request：至少包含 `mode`（submit/blur/valueChange/manual）与 `target`（FieldRef）；
- Cleanup：unregister/删行/重排时必须清理对应错误子树与交互态；任何 in-flight 结果不得回写到已清理范围。

> 推荐落点：以上桥接协议由 `TraitLifecycle` 作为 kernel 归属统一提供与实现（见 `contracts/trait-lifecycle.md`），领域包应复用而不是各自发明一套 glue。
