# AC3.3 Companion Residual Closed

**Role**: `155` 当前最强候选的独立叙事页  
**Status**: Active Candidate  
**Feature**: [spec.md](./spec.md)  
**Lineage**: `AC3 -> AC3.1 -> AC3.2 -> AC3.3`

## Candidate Summary

`AC3.3 companion-residual-closed` 是当前最强平台。它已经通过多轮 `plan-optimality-loop` 与 plateau check，当前没有出现严格更优候选。

它当前领先的原因有四条：

- 抽象层对了，问题被改写成一条 `owner-attached companion lane`
- owner split 清楚，`source / companion / rule / submit / host` 没有混层
- day-one 公开面够小，只开 `field(path).companion(...)`
- 运行时护栏够硬，已补齐 reduction law 与 runtime invariants

它当前还没有升 authority，原因也已经收敛：

- sanctioned local-soft-fact read route 还没补证据
- row-heavy proof 还没补证据
- diagnostics causal chain 还没补证据

当前长期 ToB 压测母集统一看 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的 `SC-*` 主矩阵；[scenario-proof-family.md](./scenario-proof-family.md) 只保留 `WF* / W*` 投影视图。

## Current Implementation Baseline Sketch

下面这段代码是 `AC3.3` 当前用于 implementation baseline 的 authoring sketch。

它当前不再代表 hard contract 本体，只代表：

- 当前 implementation baseline
- 当前 strongest carrier proof
- 后续 exact carrier reopen 的对照组

exact authoring carrier 继续 deferred。

```ts
field(path).companion({
  deps?: ReadonlyArray<string>,
  lower(ctx: {
    value: unknown
    deps: Readonly<Record<string, unknown>>
    source?: Form.SourceReceipt<unknown>
  }): {
    availability?: Form.AvailabilityFact
    candidates?: Form.CandidateSet
  } | undefined,
})
```

## Current Exact Carrier Verdict

`AC3.3` 当前对 exact carrier 的阶段性结论已经收口：

- current verdict：`no strictly better exact carrier yet`
- current ranking：`A > C > B`
- current baseline 更适合被讲成：
  - 一次同步计算出的整包结果
- current taste residual：
  - slot salience 偏弱
  - author attention 容易先落到 return shape
- current reopen bar：
  - 只有出现第三 slot
  - 或出现可测的 per-slot deps/source divergence
  - 才值得重开 exact carrier

这里的 `A / B / C` 继续只代表 `C004-R1` 的 compare set：

- `A`
  - 当前 `lower(ctx) -> clear | { availability?, candidates? }`
- `B`
  - slot-explicit block
- `C`
  - slot-explicit object methods

阶段性判断也已经稳定：

- `B` 默认出局，因为它最容易长成 builder DSL / bag-of-hooks
- `C` 比 `B` 更自然，但仍会暗示 slot-level subtheory
- `A` 有 taste scar，但在 frozen hard law 下仍最贴 single ctx / single lower / single bundle / single commit

## Day-One Surface

- canonical noun：`companion`
- owner scope：`field-only`
- callback name：`lower`
- ctx shape：`value / deps / source?`
- semantic commit unit：single owner-local atomic bundle
- slot inventory：`availability`、`candidates`
- landing principle：owner-local reserved leaf in existing `ui` tree
- landing status：exact path encoding deferred
- exact carrier status：deferred

## Contract Layering

`AC3.3` 当前按 `hard law / soft recipe / optional sugar` 三层理解。

只要 hard law 继续成立，recipe 与 sugar 都允许继续被压缩、替换或下沉，不触发顶层 reopen。

### Hard Law

- owner split 继续固定为 `source / companion / rule / submit / host`
- local-soft-fact owner scope 继续固定为 `field-only`
- ctx authority 继续固定为 `value / deps / source?`
- day-one slot inventory 继续固定为 `availability / candidates`
- derivation 继续必须同步、纯、无 IO、无直接 writeback 到 `values / errors / submit truth`
- carrier-neutral 语义结果继续只允许 `clear` 或 `bundle`
- commit 继续只允许单次 owner-local atomic bundle revision
- `clear` 语义继续与具体 JS 编码解耦；`undefined => clear` 不再属于 hard law
- 同一 field 的 local-soft-fact 继续不得长第二 read family、第二 diagnostics truth、第二 remote truth
- admissible carrier 继续不得引入 per-slot deps、partial merge、第二 patch family、第二 diagnostics grain
- row identity、cleanup、submit truth、reason truth 继续回到单一 evidence envelope
- 第三个 top-level slot、`list/root` owner scope、exact read carrier、exact diagnostics object 继续只允许按 reopen bar 重开

### Soft Recipe

- 推荐 authoring 顺序继续是 `source -> companion -> rule`
- 远程事实继续先落 `source`，本地可用性/候选整形继续落 `companion`，硬门禁继续落 `rule`
- 当前 implementation baseline 继续允许：
  - `field(path).companion({ lower(ctx) { return { availability?, candidates? } | undefined } })`
- 当前 exact carrier 的教学 framing 继续优先解释成：
  - 一次同步计算出的整包结果
- 动态列表跨行互斥、远程 options、submit gate 的组合写法继续作为 recipe 组织，不再反向抬成新 public noun
- implementation 第一波继续优先 `W3 / W4 / W5`，因为它们是 `06` 派生的 executable view，最直接命中 `SC-D / SC-E / SC-F` 与 `WF2 / WF3 / WF5`
- render policy、display formatting、section layout、placeholder/help text 继续优先留在 host / renderer / schema metadata

### Optional Sugar

- noun `companion`
- callback spelling `lower`
- exact carrier 的 framing wording
- `undefined => clear`
- 可能出现的 exact helper / path helper / handle helper
- field-local co-location 壳层
- 例子里的 authoring 排版、命名、局部 builder style

这些 sugar 当前可以继续被挑战，但它们不能单独触发顶层 reopen。

## Design Logic

### Owner Split

- `source`
  - Query-owned remote fact ingress
- `companion`
  - field-owned local-soft-fact lane
- `rule`
  - sync/effect contributor 与 settlement truth
- `submit`
  - submit truth
- `host`
  - 只读 projection，再映射渲染策略

### Why `companion`

`companion` 当前优于 `watch / computed / choices / candidates / interaction`，因为它：

- 不把机制 noun 直接公开化
- 不把 leaf proof noun 当总骨架
- 不长第二 remote truth
- 不长第二 read family
- 不把 list/root 过早放进 day-one surface

它当前也继续优于 `fact`、`local` 这类更短的替代词，因为这些词更容易把：

- remote fact
- local soft fact
- canonical truth
- read artifact

压进同一个词面，首读误导更大。

### Why `lower`

`lower` 当前继续保留为 baseline callback spelling。

它在 `AC3.3` 里的固定含义只有一句：

- `lower = sync pure derivation from value / deps / source? to clear | bundle`

当前没有严格更优的 callback 名，原因也已经收紧：

- `derive / compute`
  - 容易把 callback 拉回 `watch / computed` 家族
- `project`
  - 会把 read-side projection 语言倒灌回 authoring side
- `build / emit`
  - 会把 carrier object 或 patch 语义误抬成 authority
- `resolve`
  - 会带入 async / effect 的误读

所以 `lower` 现在可以继续当 current no-better baseline spelling，但它仍然只属于 concrete spelling 层，不进入 hard law。

### Why Current Exact Carrier Still Leads

当前 carrier compare 的阶段性结论是：

- `A > C > B`

原因也已经够清楚：

- `A`
  - 有 taste scar
  - 但最贴 `single ctx -> single lower -> single atomic bundle`
- `B`
  - slot 更显眼
  - 但会把 carrier 推成 block DSL，最容易长 bag-of-hooks
- `C`
  - 比 `B` 更瘦
  - 但它会把 `single derivation -> bundle` 改写成 `slot methods -> implicit join`
  - 这会抬高 slot-level 心智与后续扩张压力

所以当前最优动作仍然是先把 `A` 的 teaching framing 讲对，不去替换 carrier。

## Complex ToB Scenario Proof Example

下面这个 proof 同时覆盖动态列表、远程 options、跨行互斥与跨行校验：

```ts
Form.make("Order", config, ($) => {
  $.list("items", (items) => {
    items.identity({ mode: "trackBy", trackBy: "id" })

    items.item((row) => {
      row.field("warehouseId").source({
        resource: WarehouseOptions,
        deps: ["countryId"],
        key: (countryId) => (countryId ? { countryId } : undefined),
        triggers: ["onMount", "onKeyChange"],
        debounceMs: 120,
        concurrency: "switch",
      })

      row.field("warehouseId").companion({
        deps: ["countryId", "items.warehouseId"],
        lower(ctx) {
          const options = ctx.source?.data ?? []
          const taken = new Set(
            (ctx.deps["items.warehouseId"] as ReadonlyArray<string | undefined> | undefined)?.filter(Boolean),
          )
          return {
            availability: {
              kind: "interactive",
            },
            candidates: {
              items: options.filter((option) => option.id === ctx.value || !taken.has(option.id)),
              project: {
                value: "id",
                label: "name",
              },
              keepCurrent: true,
            },
          }
        },
      })
    })

    items.rule(
      Form.Rule.sync({
        deps: ["warehouseId"],
        validate(rows, issue) {
          const seen = new Map<string, number[]>()
          rows.forEach((row, index) => {
            const value = String(row.warehouseId ?? "").trim()
            if (!value) return
            const bucket = seen.get(value) ?? []
            bucket.push(index)
            seen.set(value, bucket)
          })
          for (const indexes of seen.values()) {
            if (indexes.length <= 1) continue
            for (const index of indexes) {
              issue.row(index, "warehouseId", {
                origin: "rule",
                severity: "error",
                code: "warehouse.duplicate",
              })
            }
          }
        },
      }),
    )
  })
})
```

这个例子里：

- remote fact 继续归 `source`
- 当前字段的可选集合与可交互性归 `companion`
- 跨行唯一性错误归 `rule`

## Reduction Law

`AC3.3` 当前明确要求复杂 proof 先归约，再决定是否需要新 slot：

- `visibility`、`readonly`、`disable`、`hide`、section gating
  - 先归约到 `availability`
- option shaping、ranking、grouping、autofill suggestions
  - 先归约到 `candidates`
- defaulting、autofill writeback、derived values
  - 继续归 `values / transaction / rule`
- dirty affordance、submit pending、submit count
  - 继续归 form meta / settlement
- diagnostic reason、blocking explanation
  - 继续归 reason / diagnostics
- placeholder、help text、display formatting
  - 继续归 renderer / schema metadata

当前还没有出现必须放行第三个 top-level slot 的 proof。

## Runtime Invariants

`AC3.3` 当前固定的最小运行时不变量：

- `deps` 是唯一显式依赖 authority
- `value` 是隐式依赖
- `source?` 只允许来自同一 field 的当前 source receipt
- `lower` 必须同步、纯计算、无 IO
- semantic outcome 继续只允许 `clear` 或 `bundle`
- writeback 只允许落到 owner-local reserved `ui` leaf
- `availability` 与 `candidates` 必须在同一 bundle 内原子 patch
- aux `ui/errors` 变更不能反向触发 companion 重算
- row cleanup 必须继续跟随 owner lifecycle 与 row identity

## Semantic Carryover Constraints

`AC3.3` 已经吸收 `149 / 150 / 151 / 152 / 153 / 154` 的核心约束，当前至少固定为：

- `byRowId / trackBy / rowIdStore / render key` 继续只回链 canonical row identity
- synthetic local id 不得回流成公开真相，index fallback 只算 residue 或 proof failure
- `replace(nextItems)` 继续按 roster replacement 解释
- active exit 时，`errors / ui / pending / blocking` 一起退出；允许残留的只剩 cleanup receipt
- async contributor 继续沿 `field / list.item / list.list / root` 的单一 grammar 收口，至少保留 `deps / key / concurrency / debounce / submitImpact`
- `minItems / maxItems` 继续是 canonical list cardinality basis
- pending / stale / blocking 必须继续落在同一 submit truth
- 同一 path explain 必须能解释 `error / pending / cleanup / stale`
- `reasonSlotId.subjectRef` day-one 继续只允许 `row / task / cleanup`
- canonical evidence envelope 继续喂给 `UI / Agent / trial / compare / repair`
- materialized report 继续只允许 on-demand subordinate view
- Query 继续持有 `Resource / load / remote fact`
- `field(path).source({ resource, deps, key, ... })` 继续只是 Query-owned capability 的消费口
- `rule / submit / UI` 只消费 source receipt，不直接做 IO
- `target / scope / slot / reset` 一类第二声明体系继续拒绝

## Why It Still Leads

### Against `watch / computed`

- `watch / computed` 容易长成第二逻辑系统
- `companion` 把能力收在 field-owned local fact 内

### Against `choices / candidates`

- `choices / candidates` 过拟合 select-like proof
- `companion` 允许 `availability / candidates` 作为 slot proof，不承担 public skeleton

### Against `field/list/root` All-Open

- `field-only` 更小
- `list/root` 当前没有 irreducible proof 支撑

### Against Exact `ui` Path Freeze

- landing principle 已经足够表达 owner-local reserved leaf
- 提前冻结 exact path 会扩大 public surface，并压死 row identity 与 future read-route 的选择空间

## Why It Has Not Entered Authority

当前还差三类证据：

### 1. Read Route Evidence

需要证明：

- companion facts 可以沿 canonical selector route 被稳定读取
- 不需要第二 selector family
- 不需要组件 glue
- 不暴露 `ui` 内部 path

`S1` 当前已经补出一条阶段性结论：

- sanctioned read route 继续只认 `useModule + useSelector(handle, selectorFn)`
- 当前不新增公开 helper noun、path grammar、token、fieldHandle family
- exact active-lane read contract 继续 deferred
- selector recipe 已冻结到 `owner-first slot projection law`
- row-heavy owner binding 已冻结到 `row-heavy carrier admissibility law`
- diagnostics proof 已冻结到 `evidence-envelope host backlink law`
- diagnostics causal chain 已冻结到 `evidence-envelope derivation-link causal-chain law`
- exact carrier 层已冻结到 `deferred + byRowId-first reopen bias`
- exact diagnostics object 层已冻结到 `deferred + no second-system shape`
- bundle-level proof 已冻结到 `single-live-bundle-head supersession law`
- exact evidence shape 已冻结到 `deferred + opaque-ref law`
- `causal-links` summary law 已冻结
- `row-level summary diff substrate` 已冻结
- `deterministic opaque id admission law` 已冻结
- `scenario execution carrier law` 已冻结
- `compare truth substrate law` 已冻结

当前残余缺口收成：

- trace contract chain 已冻结到 `TRACE-S5`
- implementation phase 已拆成顺序 residual chain：`implementation proof execution -> benchmark evidence`
- `implementation proof execution law` 已冻结到 `TRACE-I1`
- `benchmark evidence law` 已冻结到 `TRACE-I2`
- 更强 roster-level soft fact proof
- actual code / empirical evidence 仍待实现期验证

### 2. Row-Heavy Evidence

需要证明：

- reorder / replace / byRowId / nested list 下 field-local companion lifecycle 可解释
- retention / cleanup 与 row identity 一致
- 不会逼出 day-one `list/root companion`

`S2` 当前已经补出一条阶段性结论：

- 现有 row-heavy proof 仍然支撑 `field-only companion`
- 目前还没有必须重开 `list/root companion` 的 irreducible proof
- roster-level soft fact proof 已再次压测，当前仍没有不可分解 proof
- 长期 pressure corpus 已收敛到 `06` 的 `SC-*` 主矩阵，`WF1 .. WF6` 只作 `155` pressure projection

### 3. Diagnostics Evidence

需要证明：

- `source receipt -> companion lower -> rule / submit` 的因果链可解释
- clear bundle、atomic patch、blocking outcome 都可追踪

## Future Challenge Points

当前最值得继续挑战的点：

- sanctioned local-soft-fact read route
- row-heavy proof bundle
- diagnostics causal chain
- `lower` callback spelling
- `availability` slot inflation guard

## Reopen Surface

顶层 reopen surface 统一看 [spec.md](./spec.md) 的 `Allowed Reopen Surface`。

`candidate-ac3.3.md` 不再单独维护第二份 reopen trigger 枚举，只承接 `AC3.3` 自身的 contract、例子与当前领先理由。

## Backlinks

- stable principles / workflow：`[spec.md](./spec.md)`
- active challenge queue：`[discussion.md](./discussion.md)`
- review lineage / latest freeze：`../../docs/review-plan/runs/2026-04-22-form-api-shape-remaining-candidates-review.md`
