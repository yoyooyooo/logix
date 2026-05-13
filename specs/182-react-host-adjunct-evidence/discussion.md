# React Host Adjunct Evidence Discussion

**Purpose**: 承接 182 下仍值得追踪、但尚未冻结进 `spec.md` / `plan.md` / `tasks.md` 的残余讨论。
**Status**: Closed
**Feature**: [Link to spec.md](./spec.md)

## Rules

- 本文件只保留 host evidence 的残余边界问题，不代持 runtime truth。
- 任何已冻结的结论都必须回写到 `spec.md` / `plan.md` / `tasks.md`。
- 不要在这里重新讨论 production bundle proof、timeline pressure 或 local profiler。

## Closed Decisions

- [x] Q1 Host evidence 的最小 linkage law 已回写到 SSoT 18；182 不代持。
- [x] Q2 Disabled-overhead proof 归 SSoT 18 cost law 与 harness standard；182 不写计划级质量门。

## Deferred / Non-Blocking

- [x] Q3 Host evidence 的具体 selector/render 采样范围保持 deferred。  
  Reopen condition: review 发现当前范围仍过宽或过窄。

## Candidate Disposition

- [x] A1 Host evidence 只保留最小 linkage refs 和 gap markers。Adopted into SSoT 18.
- [x] A2 Host evidence 允许少量额外 host projection，但不得增加 Runtime truth 面。Deferred until a future subordinate spec proves Agent diagnosis value.

## Alternatives

- 把 host evidence 合并回 runtime-live ledger。Rejected.
- 把 host evidence 留在 181 discussion。Rejected as authority placement, but standalone 182 owner spec was also rejected.

## Decision Backlinks

- stable proposal: [../../docs/proposals/agent-first-cli-evidence-frontier-contract.md](../../docs/proposals/agent-first-cli-evidence-frontier-contract.md)
