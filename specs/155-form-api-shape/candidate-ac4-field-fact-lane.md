# AC4.1 Field Fact Lane

**Role**: 顶层 challenger  
**Status**: Parked Lexical Challenger
**Feature**: [spec.md](./spec.md)  
**Against**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Core Idea

把 `companion` 改写成更直接的 `field-owned local fact lane`。

核心判断是：

- authoring 写的是 field-local facts
- read side 读的也是 field-local facts
- diagnostics 解释的还是 field-local fact patch

这条方向当前只保留一个问题：`companion` 这层公开翻译是否真的必要。

## Public Contract Sketch

```ts
type FieldFactBundle = {
  availability?: Form.AvailabilityFact
  candidates?: Form.CandidateSet
}

field(path).fact({
  deps?: ReadonlyArray<string>,
  lower(ctx: {
    value: unknown
    deps: Readonly<Record<string, unknown>>
    source?: Form.SourceReceipt<unknown>
  }): FieldFactBundle | undefined,
})
```

## What It Deletes From AC3.3

- `companion` 这个顶层 noun
- `CompanionLeaf / companion bundle` 这一组专有叙事

## What It Reuses

- `field-only` owner scope
- `availability / candidates` slot skeleton
- `deps + value + source?`
- `lower` callback shape
- selector-only read law
- rowId-first / evidence-envelope / supersession 等已冻结 law

## Why It Is Interesting

- read side与authoring 的语言更对齐
- diagnostics 叙述更容易直接表达为 `source -> fact -> patch -> reason`
- 若后续继续长 stronger fact proof，概念上比 `companion` 更直接

## Main Risks

- `fact` 过宽，容易吸进 `reason / settlement / meta / values`
- 即使保留 `lower`，公开 noun 仍更容易把 guardrail 黑名单拉长
- 若它删不掉任何禁止规则，就只是在做词面置换

## Current Position

- 当前只保留为 parked lexical challenger
- 暂时不建议作为 `AC3.3` 的 preferred challenger
- 是否继续压测，只取决于后续能否删掉一层公开翻译，同时不放松 `AC3.3` 的 law bundle
- 若未来重开，必须在 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的同一组 `SC-*` 主场景下给出不弱于 `AC3.3` 的覆盖，并缩短负面 guardrail 清单

## Verdict

- `park`
- 当前不严格支配 `AC3.3`
- 这条方向仍有探索价值，但它只配承担 spelling-level 压力测试
- 最大问题在于它删除的主要是词汇，规则压缩收益不足
- 若要重开，至少必须补齐下面这组 guardrails：
  - `fact` 只定义为 `field-owned local sealed soft UI fact`
  - day-one 只允许 `availability / candidates`
  - 明文禁止吸入 `reason / issue / error / pending / stale / submitImpact / meta / value`
  - `lower` 必须同步、纯、无 IO、无 writeback、无 reason materialization
