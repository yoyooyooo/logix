# AC4 Top-Level Expansion Wave 2

**Role**: `AC4` 第二轮顶层方向扩展  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Current Main Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

首轮 `AC4` 扫描已经完成：

- `AC4.1 field-fact-lane` 保留
- `AC4.2 field capability block` 淘汰
- `AC4.3 no-public-companion-program-lowered` 淘汰

但这还不够。

当前还需要一轮更大胆的顶层扩展，用新的视角再找一批 `AC4.*` 候选，继续拆分、排除。

这轮重点不是继续打磨 `AC4.1` 细节。
这轮重点是继续问：

> 除了 `AC4.1` 之外，还有没有别的顶层方向，能和 `AC3.3` 形成有效竞争

## Fixed Baseline

下面这些内容在本轮全部冻结：

- `AC3.3` 仍是 active candidate
- `AC4.1` 仍是 parked challenger
- 已拒绝方向不得换名复活
- `S1 / S2 / C003` law 全部视为必须复用的硬约束

## Expansion Goal

本轮只接受真正的顶层方向，不接受：

- 单点 helper
- 单个 slot
- 单个 read carrier
- 单个 diagnostics object
- 单个 spelling 重命名

本轮每个 reviewer 至少要提出一个新的 `AC4.*` 候选。

新候选必须满足：

1. 是顶层骨架，不是局部 patch
2. 给出完整 public contract sketch
3. 明确删除了 `AC3.3` 的哪些概念
4. 明确复用了哪些 law
5. 明确 failure modes

## Hard Constraints

任何 `AC4.*` 候选都必须遵守：

- 不复活 generic `watch / computed`
- 不把本地协调塞回 `source`
- 不把组件 glue 作为 canonical owner
- 不默认打开 `field/list/root` 全量 companion family
- 不新增第二 remote truth、第二 read law、第二 diagnostics truth
- 不暴露 `ui` 内部 path

## Suggested New Perspective Seeds

这一轮建议从这些角度扩展，但不限定于它们：

- `AC4 operator-lane`
  - 从 operator / lane 组织 API
- `AC4 declaration-graph`
  - 从 declaration graph / compiler graph 反推 public skeleton
- `AC4 evidence-first`
  - 从 evidence / receipts 反推 authoring skeleton
- `AC4 owner-matrix`
  - 从 owner matrix 而不是 noun 组织 API
- `AC4 capability lattice`
  - 从 capability lattice / admissibility 组织 public skeleton
- `AC4 verifier-first`
  - 从 verification / compare / repair 反推 authoring surface

## Writeback Targets

- active queue：`discussion.md`
- current candidate：`candidate-ac3.3.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r4-top-level-expansion-wave-2.md`
- 若出现值得保留的新方向：新增 `candidate-ac4-*.md`

## Backlinks

- current candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- parked challenger：`[candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)`
- challenge queue：`[discussion.md](./discussion.md)`
