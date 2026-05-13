# AC4.4 Field Slot Projection Lane

**Role**: 顶层 challenger  
**Status**: Rejected Challenger  
**Feature**: [spec.md](./spec.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Core Idea

把 `companion` 改写成更贴近 read law 与 compiler graph 的 `field-owned slot projection lane`。

这条方向的共识核心不是简单改名，而是：

- authoring 声明的是 field-owned slot projection
- read side 继续走 owner-first / slot-only / rowId-first
- diagnostics 继续沿 evidence envelope 解释 projection patch

## Public Contract Sketch

```ts
type FieldProjectionBundle = {
  availability?: Form.AvailabilityFact
  candidates?: Form.CandidateSet
}

field(path).projection({
  deps?: ReadonlyArray<string>,
  lower(ctx: {
    value: unknown
    deps: Readonly<Record<string, unknown>>
    source?: Form.SourceReceipt<unknown>
  }): FieldProjectionBundle | undefined,
})
```

## What It Deletes From AC3.3

- `companion` 顶层 noun
- `CompanionLeaf / companion bundle` 这层关系性叙事
- “authoring 写 companion，再在 read side 解释 slot projection” 这层翻译

## What It Reuses

- `field-only` owner scope
- `availability / candidates` slot skeleton
- `deps + value + source?` ctx
- selector-only read law
- rowId-first / evidence-envelope / supersession 等已冻结 law

## Why It Is Interesting

- 比 `field-fact-lane` 更窄，不容易吸入 `reason / settlement / meta / values`
- 比 `companion` 更贴近当前 read law 与 diagnostics language
- 若后续真的要继续压 `read / diagnostics` 的一致性，这条 lane 有进一步压测价值

## Main Risks

- `projection` 一词和 host projection 过近，容易冲撞 React host law
- 公开 skeleton 没有明显更小
- 可能只是把 `AC3.3` 的叙事换成另一种更贴近 read side 的叙事
- 若继续推进，仍要补强 read-route、row-heavy、diagnostics 证据，不会自动减少这些工作量

## Verdict

- `reject`
- 当前不严格支配 `AC3.3`
- `projection` 已归 core host / pure projection law 持有，不适合作为 Form authoring noun
- 它没有删掉真实边界，只是把 read-side language 搬进 authoring surface
- 修复命名冲突只能继续加限定词或换名，核心收益随之消失
