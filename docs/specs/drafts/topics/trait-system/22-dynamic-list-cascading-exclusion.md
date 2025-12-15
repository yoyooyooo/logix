---
title: Dynamic List + Cascading Options + Cross-Row Exclusion
status: draft
version: 2025-12-15
value: core
priority: next
related:
  - ./21-dynamic-list-and-linkage.md
  - ../../../../../docs/reviews/03-transactions-and-traits.md
  - ../../../../../docs/reviews/99-roadmap-and-breaking-changes.md
  - ../../../../../specs/007-unify-trait-system/contracts/form.md
  - ../../../../../specs/008-hierarchical-injector/spec.md
  - ../../../../../specs/008-hierarchical-injector/contracts/resolution.md
  - ../../../../../specs/008-hierarchical-injector/contracts/errors.md
  - ../../../../../examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx
  - ../../../../../packages/form/src/logics/install.ts
  - ../../../../../packages/logix-core/src/internal/state-trait/validate.ts
  - ../../../../../packages/logix-core/src/internal/state-trait/source.ts
---

# Dynamic List + Cascading Options + Cross-Row Exclusion

本文以 ToB 表单的高压组合场景为样本，定义在“`008-hierarchical-injector` + `docs/reviews` 路线图（Phase 1/2）”均已落地后的**终态契约**与**唯一推荐写法**：

- 业务写法强制收敛（避免多人多写法导致平台不可解析/团队协作混乱）
- 事务 + trait 在保证表达力的同时把性能与可诊断性做到极致（Patch/Dirty-set 驱动的增量调度 + Slim 可序列化诊断）

> 这份文档是“场景→契约→最小 IR→性能/诊断”的对齐稿；不会为向后兼容保留旧写法。

## 场景定义（正交拆解）

目标：一个可动态增删的列表表单 `items[]`，每行包含级联选择 + 异步 options，并且存在跨行联动约束。

最小正交维度：

1. **动态数组结构**：增删/重排不破坏 errors/ui 对齐；行有稳定 identity（trackBy）。
2. **行内级联联动**：
   - 上游字段变化会使下游字段无效（需要确定性清理：province → city → warehouse）。
   - 下游 options 依赖上游值，属于异步资源（需防竞态、可取消、可重放）。
3. **跨行联动校验**：
   - 互斥：同一个 `warehouseId` 只能被一行选择（跨行唯一性）。
   - 影响面：改一行会影响另一行的错误与可选项（UI/校验都应即时反馈）。

该场景在 demo 中有现状实现：`examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`。  
终态下该 demo 应改写为“唯一推荐写法”（见本文最后的对照清单），以阻断写法漂移。

## 终态目标（强约束）

这组约束用于同时满足：**平台可解析（Full-Duplex）**、**极致性能**、**一致可诊断**、**团队心智统一**。

### 1) 写法必须唯一（业务侧不可出现第二套真相源）

业务侧唯一允许的“白盒写法”：

- **动态结构**：`Form` + `useFieldArray`（或等价 controller API）负责增删改排序，Row identity 必须稳定（trackBy/RowId）。
- **级联清理**：必须用“声明式 linkage/reset”（trait/link），禁止在 UI 里串多次 `setValue` 人工清字段。
- **跨行互斥/聚合类规则**：必须用 **list-scope check**（一次扫描，多行写回），禁止在 item-check 中 `ctx.state` 全表扫描。
- **异步 options**：必须用 `StateTrait.source`/`Resource`（或等价 Form DSL），IO 只能发生在事务窗口外，写回必须 keyHash gate 且可回放。

任何“看起来更省事”的写法（例如 `listValidateOnChange` 专家开关、UI 里手写跨行扫描/禁用集、computed 直接写 `errors.*`）都必须视为过时并从公开 API/示例中移除。

### 2) 事务窗口禁止 IO（并且必须能被诊断证明）

- `.update/.mutate` 只能做纯同步写入；任何 IO/异步必须通过 `Task/source` 在事务外执行，再以“写回事务”提交结果。
- `source` 的 load 不得直接携带不可序列化对象（闭包/Effect 本体）；回放链路只认结构化 `ResourceSnapshot`/事件摘要。

### 3) Patch/Dirty-set 是性能与因果的根（不可退化为 `*`）

终态下，每次事务提交都必须产生：

- `dirtyRoots`：字段级（或至少 root 级）脏集，用于增量调度与 React 精准订阅；
- `patch[]`（full）或 `patchSummary`（light）：用于诊断、回放、冲突检测与合并；
- 且二者的生成复杂度必须是 **O(写入量)**（禁止 runtime 默认做全量 deep diff 来“推导脏集”）。

> 目标：把性能压力压到最低，同时避免“为了增量而引入的算法反而更慢”的负优化。路线图与阀门机制见 `docs/reviews/99-roadmap-and-breaking-changes.md`。

### 4) Errors 必须是“同构树 + 列表节点固定槽位”（便于 UI/平台/回放）

错误树必须与 values 同构，但列表节点需要同时承载“列表级错误”和“逐行错误”，因此固定使用如下形态：

```ts
errors.items = {
  $list?: unknown,
  rows?: Array<{
    $item?: unknown,
    province?: unknown,
    city?: unknown,
    warehouseId?: unknown,
  }>
}
```

要求：

- check 的写回必须集中在 `TraitLifecycle.scopedValidate` 语义下完成；业务不得直接写 `errors.*`；
- 清理必须确定性：当某节点无错误时裁剪子树；行移除/重排必须同步清理对应 `errors.items.rows`；
- 列表级错误（例如“至少一行”/“总数上限”）只能写到 `$list`，不得与 `rows` 混用。

（该口径与 `specs/007-unify-trait-system/contracts/form.md` 对齐。）

## 终态：Trait/IR 结构（Static IR + Dynamic Trace）

> 这一节只定义“平台与引擎共同认可的最小结构”，避免在 Form/StateTrait/Devtools/Studio 之间出现并行真相源。

### 1) Static IR（可序列化、可合并、可做冲突检测）

对本场景最小需要表达的规则节点（示意）：

- list.item source（每行的 options）：
  - `items[].provinceOptions` deps=`["country"]` key=`{country}` triggers=`["onMount","onValueChange"]`
  - `items[].cityOptions` deps=`["country","province"]` key=`{country,province}`（province 空→undefined→idle）
  - `items[].warehouseOptions` deps=`["country","province","city"]` key=`{country,province,city}`（city 空→idle）
- linkage/reset（级联清理）：
  - `items[].country` 变化 → reset `province/city/warehouseId`
  - `items[].province` 变化 → reset `city/warehouseId`
  - `items[].city` 变化 → reset `warehouseId`
- list-scope check（跨行互斥，一次扫描，多行写回）：
  - deps 必须显式覆盖整张列表的关键字段：`items[].warehouseId`（而不是在 validate 里读取 `ctx.state.items` 偷偷依赖）
  - writeback 只能写 `errors.items`（`$list/rows[]` 形态）

并且：

- 每个 rule/step 必须有稳定 `stepId`（可由 fieldPath + ruleName 派生），并与诊断事件锚定一致；
- 依赖冲突必须可检测（重复定义同一路径的写回/多 writer）并给出可解释合并策略（如 rule 合并 vs 硬失败）。

### 2) Dynamic Trace（事务事件必须 Slim 且可回放）

对每次“派生/刷新/丢弃”，至少要能落到以下可序列化事件：

- `txn`：稳定 `instanceId/txnSeq/txnId`、origin、dirtyRoots、patchSummary
- `trait:source`：resourceId、keyHash、status（idle/pending/success/failure）、durationMs、writebackPaths
- `trait:check`：stepId、mode、affectedRows（可选，或提供 patchCount）、writebackPaths
- `trait:link`：from→resets、writebackPaths

严禁把 `Effect`/闭包塞进事件（否则平台/Devtools 会被动保留引用导致内存与性能灾难）。

## 终态：最小业务写法（对外唯一推荐）

> 这里用 StateTrait DSL 直接表达（便于讲清楚 IR），但对业务应由 Form DSL 包装；业务不应直接拼装 StateTrait。

示意（强调结构，不以当前实现为准）：

```ts
items: StateTrait.list({
  identityHint: { trackBy: "id" },

  // list scope：跨行规则（一次扫描，多行写回）
  list: StateTrait.node({
    check: {
      uniqueWarehouse: {
        // 语义：items[].warehouseId（build 阶段会做前缀化/归一化）
        deps: ["warehouseId"],
        validate: (rows, ctx) => ({
          $list: undefined,
          rows: rows.map((row) => ({ warehouseId: undefined })),
        }),
      },
    },
  }),

  // item scope：行内规则（每行独立，避免跨行扫描）
  item: StateTrait.node({
    source: {
      provinceOptions: StateTrait.source(/* ... */),
      cityOptions: StateTrait.source(/* ... */),
      warehouseOptions: StateTrait.source(/* ... */),
    },
    check: {
      required: { deps: ["country", "province", "city", "warehouseId"], validate: (row, ctx) => undefined },
    },
  }),
})
```

### 1) list-scope check：跨行互斥（一次扫描，多行写回）

约束：

- check 输入是整张列表（`ReadonlyArray<Row>`），而不是单行；
- check 必须显式声明 deps（例如 `items[].warehouseId`），引擎只认 deps 来做反向闭包/增量调度；
- writeback 是 `errors.items`（同构树 + `$list/rows[]`），不允许“每行自己写自己错误”。

性能要点（把智能化优化做到极致）：

- 基线：允许 O(n) 扫描一次列表（一次事务最多一次）；
- 极致：在 Phase 1 Patch 已落地后，list-check 可读取 `txn.patches` 做增量更新（仅当 patch 覆盖 `items[i].warehouseId` 才更新计数），并只对受影响的 `rows[i]` 写回错误，避免全表 patch 导致 React 全量重渲染。

### 2) linkage/reset：级联清理必须声明式化（禁止 UI 多次 setValue）

约束：

- linkage 必须是 trait/link（或 Form.Linkage）的一部分，运行时能产出 patch/dirtyRoots；
- linkage 必须记录“触发原因”（from field + origin），并能在 Devtools 中解释“为什么被清空/为什么 options 变 idle”；
- 禁止在 React 组件里用 `setValue` 串发多次写入来实现联动（这会让 patch/dirtyRoots/因果链不可收敛，且平台无法治理）。

### 3) source：异步 options 必须天然幂等 + 去抖动 + 可共享缓存

约束：

- `source.refresh` 必须 keyHash gate（同 keyHash 不得产生重复请求/重复写回），避免 UI 抖动；
- key 为 undefined 时必须同步收敛到 clean idle（事务内 syncIdle），避免 tearing；
- Resource 层应默认对相同 keyHash 做请求去重与缓存，并且缓存边界必须与 008 的解析语义一致：
  - 对同一 `resourceId`，以“当前运行环境解析到的 spec/registry”为共享边界；
  - 当 `RuntimeProvider.layer` 覆盖了同一 `resourceId` 的实现时，缓存必须隔离，禁止跨 scope 污染结果。

#### 共享范围（008 已落地后的事实口径）

在 008 之后，“资源实现/缓存共享范围”不再是模糊的“全局/局部”描述，而是可被定位与测试的 scope 选择问题（见 `specs/008-hierarchical-injector/contracts/resolution.md`）：

- `ResourceRegistryTag` 属于 Effect Env 的 Service，source 在执行时通过 `Effect.serviceOption(ResourceRegistryTag)` 读取**当前运行环境**的资源表；
- React 子树通过 `RuntimeProvider.layer` 叠加 Env 时，会影响“当前运行环境”的解析结果（Nearest Wins），因此可用于局部 mock/差异化资源实现；
- `Root.resolve(Tag)` 固定读取当前 runtime tree 的 root provider，不受更深层 `RuntimeProvider.layer` 覆盖影响：不要依赖它去 mock `StateTrait.source` 的资源实现。

## 对照：现状 demo 需要如何被终态收敛（破坏性清单）

`examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx` 在终态下应发生这些破坏性变化（不做兼容层）：

- 删除 `listValidateOnChange` 配置；校验触发由 deps/IR 自动推导，不允许再靠“专家开关”兜底。
- 把 `uniqueWarehouse` 从 item-check（每行扫描 `ctx.state.items`）迁到 list-scope check；并按 `$list/rows[]` 写回错误树。
- 把 UI 里的 `resetAfterCountry/resetAfterProvince/resetAfterCity` 迁到 linkage/reset（trait/link）；UI 只做“派发 change”，不负责写多个字段。
- UI 的“禁用已选仓库”：
  - 允许继续做展示层禁用（提升 UX），但其依赖数据应来自 selector/derived（可复用缓存、可诊断），避免每次 render 全量扫描 `items` 生成 Set。
  - 最低要求：React 订阅必须足够细（Phase 3 的 SelectorGraph + dirtyRoots），避免 list-check 全量 patch 导致全列表重渲染。
- 保持 `source` 的幂等短路与 clean idle 写回（已在内核实现过关键兜底；终态下必须作为硬契约存在，而不是“demo 级修补”）。

## Open Questions（仅保留终态仍需决策的点）

- 大规模列表（100+ 行）下：list-check 的增量策略是否要求“必须依赖 patches”（而不是重新扫描 state）？阀门与降级口径如何定义？
- `errors.items.rows` 的对齐策略：严格按 index 还是按 rowId 做稳定映射？（涉及 reorder 的错误归属与平台合并策略）
- options 共享缓存的默认策略：以“当前运行环境解析到的 registry/spec”为边界共享（默认）还是以模块实例隔离（更安全但更慢）？需要明确：隔离应通过“显式 scope 注入 / 新 runtime tree”完成，而不是隐式规则。
