# AC4.3 No Public Companion Program Lowered

**Role**: 顶层 challenger  
**Status**: Rejected Challenger  
**Feature**: [spec.md](./spec.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Core Idea

本地 soft fact 不进入 Form exact public surface。

它停在 `Program / Module` 的 compiler-owned internal declaration lane。
Form 对外继续只暴露现有 root act。

## Public Contract Sketch

```ts
Form.make("Order", config, ($) => {
  $.field("warehouseId").source({ ... })
  $.field("warehouseId").rule(...)
  $.dsl((internal) => {
    internal.fieldSoftFact("warehouseId", {
      deps: ["countryId", "items.warehouseId"],
      derive(ctx) {
        return {
          availability: { kind: "interactive" },
          candidates: { ... },
        }
      },
    })
  })
  $.submit(...)
})
```

## What It Deletes From AC3.3

- `field(path).companion(...)`
- `companion` noun
- `lower` callback 作为公开 authoring 面
- “sanctioned companion read route” 这组独立 blocker

## What It Reuses

- selector-only read law
- owner-first projection
- row-heavy carrier admissibility
- evidence-envelope causal chain
- `availability / candidates` 仍可作为内部 slot vocabulary

## Why It Is Interesting

- public surface 更小
- 直接对齐现有 `Form.make / Form.Rule / Form.Error` 的 exact authority 方向
- 避免“先抬公开 noun，再补读侧证据”的倒挂

## Main Risks

- `dsl` 可能变成隐性垃圾槽位
- internal lane 可能长成第二系统
- 长期不升格会让复杂 ToB authoring 卡在内部槽位

## Verdict

- `reject`
- 当前不严格支配 `AC3.3`
- 最小公开面收益被 internal second-system 风险抵消
- 一旦补齐 read-route 与 diagnostics 证据，它很容易长回与 `AC3.3` 等价的公开 contract
