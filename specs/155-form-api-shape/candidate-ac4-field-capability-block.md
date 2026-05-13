# AC4.2 Field Capability Block

**Role**: 顶层 challenger  
**Status**: Rejected Challenger  
**Feature**: [spec.md](./spec.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Core Idea

把 `field` 提升成单一附着点，把 `source / companion / rule` 合成一个固定三 lane 的 field capability grammar。

owner truth 不变，变化只发生在 authoring 形状上。

## Public Contract Sketch

```ts
Form.make("Order", config, ($) => {
  $.field("warehouseId", ($f) => {
    $f.source({ ... })
    $f.companion({
      deps: [...],
      lower(ctx) {
        return {
          availability: { kind: "interactive" },
          candidates: { ... },
        }
      },
    })
    $f.rule.sync({ ... })
  })
})
```

## What It Deletes From AC3.3

- 同一 field 多处分散声明的姿势
- 为了让 `source / companion / rule` 靠近而继续长 helper 的压力

## What It Reuses

- `source / companion / rule / submit / host` owner split
- `availability / candidates`
- `lower(ctx)` 和现有 ctx shape
- 所有 `S1 / S2 / C003` 已冻结 law

## Why It Is Interesting

- 同一 field 的能力收在一处，authoring 更紧
- 后续若继续压 field 编译单元，这个 block 更接近真实 attachment unit

## Main Risks

- 作者容易把 field block 理解成统一 owner
- `rule` 的 field-local 与 roster-level 边界可能被写糊
- block 很容易继续发胖，长出 bag-of-hooks

## Verdict

- `reject`
- 当前不严格支配 `AC3.3`
- 最大问题是 attachment unit 与 owner unit 之间还没有严格证明
- 当前阶段的主要收益只是 authoring 聚合，不能直接补主线的 read、row、diagnostics 缺口
