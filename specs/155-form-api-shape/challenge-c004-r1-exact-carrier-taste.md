# C004-R1 Exact Carrier Taste Under Fixed Hard Law

**Role**: `C004` 的 exact carrier 子挑战 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Parent Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)  
**Parent Challenge**: [challenge-c004-concrete-spelling.md](./challenge-c004-concrete-spelling.md)

## Why Now

`C004` 已冻结：

- `companion` 当前没有 strictly better noun
- `lower` 当前没有 strictly better callback spelling
- `field(path).companion({ deps, lower })` 当前仍是 no-better concrete spelling baseline

但 `P10` 仍明确把 exact carrier 后置了。

当前最值得继续挑战的 taste 残余，不在顶层骨架，也不在 noun 本身，而在 exact carrier：

- `lower(ctx) => { availability?, candidates? } | undefined` 的 object-return 虽然可行，但不够漂亮
- return object 让注意力先落到 carrier shape，再落到 slot 语义
- 一旦 slot 稍微变多，object-return 很容易显得像“大对象承载所有能力”
- 对 Agent-first 来说，LLM 更容易把它写成“随便 return 一坨对象”

所以本轮目标先不替换 baseline，直接回答：

> 当前 exact carrier 是否已经足够漂亮；如果不够，是否存在一个严格更优、又不破坏 `P10` 的 authoring carrier。

## Fixed Baseline

下面这些内容在 `C004-R1` 内全部冻结：

- `AC3.3` 顶层骨架
- `P10 carrier-neutral atomic bundle law`
- `P11 single host gate and read-input taxonomy`
- `source / companion / rule / submit / host` owner split
- `field-only` local-soft-fact lane
- day-one slot 继续只认 `availability / candidates`
- 不新增第二 read family、第二 diagnostics truth、第二 patch family
- 不允许 per-slot deps / partial merge / per-slot atomicity
- commit 继续只认 single owner-local atomic bundle commit

## Challenge Target

在固定上述 hard law 的前提下，评估下面这个问题：

> `companion` 的 exact carrier，当前是否仍应保持 `lower(ctx) => { availability?, candidates? } | undefined`，还是存在一个更漂亮、更易读、更利于 Agent 生成、且不会把 deferred complexity 带回公开面的 carrier 形状。

## Current Baseline

- current baseline sketch：
- current freeze：`C004-R1.1 no strictly better exact carrier yet`
- current ranking：`A > C > B`

```ts
field(path).companion({
  deps: [...],
  lower(ctx) {
    return {
      availability: ...,
      candidates: ...,
    }
  },
})
```

- current strengths：
  - 薄
  - 只有一个 ctx
  - 语义上仍能落回 `clear | bundle`
- current taste risks：
  - slot 语义不够前置
  - 容易把 carrier 写成大对象
  - author attention 先落 shape，再落 fact
- current residual：
  - `A` 当前更适合被解释成 `single-lower atomic-bundle proof`
  - `A` 有 bounded taste scar，但还没形成 reopen 所需设计债
  - 只有第三 slot 或 per-slot divergence 出现实证，才值得重开 exact carrier

## Allowed Search Space

本轮允许搜索的方向：

1. 保持 current object-return baseline
2. slot-explicit block
3. slot-explicit object method carrier
4. 其他 exact carrier，但必须完整说明为什么不长第二系统

## Candidate Shapes To Compare

### A. Current Object-Return Baseline

```ts
field(path).companion({
  deps: [...],
  lower(ctx) {
    return {
      availability: ...,
      candidates: ...,
    }
  },
})
```

### B. Slot-Explicit Block

```ts
field(path).companion(($c) => {
  $c.deps([...])
  $c.availability((ctx) => ...)
  $c.candidates((ctx) => ...)
})
```

### C. Slot-Explicit Object Method Carrier

```ts
field(path).companion({
  deps: [...],
  availability(ctx) {
    return ...
  },
  candidates(ctx) {
    return ...
  },
})
```

这些 shape 只是 candidate space，不代表已被认可。

## Rejected-by-Default Directions

下面这些方向默认拒绝：

- 每个 slot 自带独立 `deps`
- per-slot merge / patch DSL
- emitter / builder / commit 显式语言进入公开面
- read-side projection noun 倒灌
- path grammar / token / helper family 扩张
- 只是“更顺眼”，但没有 strict-dominance 证据

## Taste Axes

除默认 dominance axes 外，本轮 reviewer 必须显式比较这五个 taste 维度：

- local legibility
- slot salience
- author attention path
- bag-of-hooks risk
- Agent-first generation stability

## Success Bar

要想形成 strictly better exact carrier candidate，必须同时满足：

1. 不重开 hard law
2. 不新增 family / second system
3. 在 taste axes 上形成明确严格改进
4. 不把 deferred complexity 以别的名字带回公开面
5. 在 `concept-count / public-surface / proof-strength / future-headroom` 上至少不恶化

## Required Questions

本轮 reviewer 必须回答：

1. object-return baseline 现在究竟是“丑但可接受”，还是已经构成真实设计债
2. slot-explicit block 是否只是更顺眼，还是严格更优
3. slot-explicit object method carrier 是否比 block 更稳
4. 哪个 shape 最符合 Agent-first
5. 若没有严格更优者，当前 residual 应如何表述

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better exact carrier candidate
- 一个 `no strictly better exact carrier yet` verdict，并把 residual 收紧

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- user-facing snapshot：`signoff-brief.md`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c004-r1-exact-carrier-taste.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- carrier principle freeze：`../../docs/review-plan/runs/2026-04-22-form-api-shape-companion-carrier-principle-review.md`
- concrete spelling freeze：`[challenge-c004-concrete-spelling.md](./challenge-c004-concrete-spelling.md)`
