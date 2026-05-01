# C006 Public Lexicon Audit Under Frozen Law

**Role**: `155` public lexicon 全量审视 brief  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)

## Why Now

最近几轮已经把结构边界压得很紧：

- `AC3.3` 顶层骨架已平台化
- `C004` 已冻结 concrete spelling
- `C004-R1` 已冻结 exact carrier taste

当前更大的风险，已经不再是“结构不稳”，而是：

- 整套 API 的词面系统仍然有陌生感
- 某些词单独看还能成立，放在整套 surface 里可能不够顺
- 局部词没问题，不代表整套 lexicon 已经最优

所以这轮不再只审某一个词，而是全量审视当前 public lexicon。

## Challenge Target

在固定 hard law、owner split、read law、carrier law 的前提下，评估下面这个问题：

> 当前 authority + `155` 待升格层的整套 public lexicon，是否已经是当前最优；如果不是，是否存在一套 strictly better 的命名系统，能整体降低陌生感、教学成本与 Agent-first 生成噪声。

## Current Freeze

- current freeze：`C006.1 no strictly better public lexicon yet`
- keep set：
  - `Form.make / Form.Rule / Form.Error`
  - `field / list / root / submit`
  - `source`
  - `useModule / useSelector`
  - `fieldValue / Form.Error.field`
  - `availability / candidates`
  - `fieldArray / byRowId`
- current scar set：
  - `companion`
  - `lower`
  - `rawFormMeta`
  - teaching gloss layer

## Fixed Baseline

下面这些内容在 `C006` 内全部冻结：

- `AC3.3` 顶层骨架
- `P10 carrier-neutral atomic bundle law`
- `P11 single host gate and read-input taxonomy`
- `source / companion / rule / submit / host` owner split
- `field-only` local-soft-fact lane
- `availability / candidates` day-one slot
- `C004.1 no strictly better concrete spelling under fixed hard law`
- `C004-R1.1 no strictly better exact carrier yet`
- 当前 authority 的 route 结构：
  - `Form.make`
  - `Form.Rule`
  - `Form.Error`
  - `useModule + useSelector`

本轮只允许改 lexicon，不允许借机重开结构。

## Audit Scope

### A. Current Authority Lexicon

- `Form.make`
- `Form.Rule`
- `Form.Error`
- `field`
- `list`
- `root`
- `submit`
- `source`
- `useModule`
- `useSelector`
- `fieldValue`
- `rawFormMeta`
- `Form.Error.field`
- `FormHandle`
- `fieldArray`
- `byRowId`
- `trackBy`

### B. `155` Next-Layer Lexicon

- `companion`
- `lower`
- `availability`
- `candidates`

### C. Teaching / Gloss Layer

这些词虽然不一定是 exact public API，也会影响默认教学：

- `local-soft-fact lane`
- `source receipt`
- `一次同步计算出的整包结果`
- `selector helper`

如果 reviewer 认为这些词本身太硬，也必须提出更好的教学词。

## Current Baseline Judgement

当前基线分三类：

1. 相对稳定、陌生感较低
   - `Form.make`
   - `field`
   - `list`
   - `root`
   - `submit`
   - `useSelector`
2. 可用，但可能仍偏硬或偏技术
   - `source`
   - `useModule`
   - `fieldValue`
   - `rawFormMeta`
   - `byRowId`
   - `trackBy`
3. 明显需要重点审视
   - `companion`
   - `lower`
   - `rawFormMeta`
   - 教学 gloss 层的术语

这只是当前工作假设，不是结论。

## Success Bar

要想形成 strictly better lexicon candidate，必须同时满足：

1. 不重开 hard law / owner split / carrier law
2. 不扩大 public surface
3. 不新增第二 helper family / 第二 route
4. 不是单个词局部更顺，而是整套 lexicon 更一致
5. 对陌生作者与 Agent 都更容易稳定生成、稳定解释
6. 在 `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom` 上至少不恶化

## Required Questions

本轮 reviewer 必须回答：

1. 当前整套 lexicon 最陌生、最割裂的词是哪几个
2. 哪些词其实已经足够稳，不值得再动
3. 如果要改，应该改成整套系统，而不是零散替换
4. 是否存在一个 strictly better lexicon set
5. 若不存在，当前 residual 应如何表述

## Reviewer Output Rule

如果 reviewer 批评某个词，必须同时给出：

- 替代词
- 它会连带影响哪些周边词
- 是否会污染已冻结的 owner/read/diagnostics 口径

只说“这个词怪”不算有效输出。

## Expected Outputs

本轮允许两种输出：

- 一个 strictly better lexicon candidate set
- 一个 `no strictly better public lexicon yet` verdict，并把 residual 收紧

## Writeback Targets

- challenge queue：`discussion.md`
- current candidate：`candidate-ac3.3.md`
- user-facing snapshot：`signoff-brief.md`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c006-public-lexicon-audit.md`

## Backlinks

- stable principles / gates：`[spec.md](./spec.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- user-facing snapshot：`[signoff-brief.md](./signoff-brief.md)`
- authority exact surface：`../../docs/ssot/form/13-exact-surface-contract.md`
- authority host boundary：`../../docs/ssot/runtime/10-react-host-projection-boundary.md`
