# [FEATURE NAME] Discussion

**Purpose**: 只承接当前 spec 下真实存在、值得继续追踪、但尚未冻结进 `spec.md` / `plan.md` / `tasks.md` 的讨论材料。
**Status**: Working
**Feature**: [Link to spec.md]

## Rules

- 若 `spec.md` 还未补齐最小必要 SSoT，本文件不得代持 owner / boundary / closure gate 裁决
- 本文件不是 authority，不替代 `spec.md`
- 任何已达成裁决的内容，必须回写到 `spec.md` / `plan.md` / `tasks.md`
- 本文件只在存在真实未冻结候选、开放问题、deferred item 或 reopen evidence 时生成
- 若没有开放性问题，不应生成本文件
- `Must Close Before Implementation` 里的条目必须在实施前关闭，并把裁决合并回 authority artifact
- `Deferred / Non-Blocking` 里的条目必须明确为什么不阻塞当前实施
- 若某条讨论已经关闭，应写明结论去向，再从活跃问题区移除
- 实施完成后，本文件只保留 residual open questions 与 reopen evidence

## Must Close Before Implementation

- [ ] Qxxx [具体问题、阻塞原因、需要落回的目标文件]

## Deferred / Non-Blocking

- [ ] Qxxx [具体问题、后置原因、重新打开条件]

## Candidate Shapes

- [ ] Axxx [候选形态、适用条件、待裁决点]

## Alternatives

## Decision Backlinks

- 暂无
