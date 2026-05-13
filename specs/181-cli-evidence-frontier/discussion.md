# CLI Evidence Frontier Discussion

**Purpose**: 只承接 181 下真实存在、值得继续追踪、但尚未冻结进 `spec.md` / 后续 `plan.md` / `tasks.md` 的讨论材料。
**Status**: Closed
**Feature**: [Link to spec.md](./spec.md)

## Rules

- 当前稳定 review object 已上移并消费到 [docs/proposals/agent-first-cli-evidence-frontier-contract.md](../../docs/proposals/agent-first-cli-evidence-frontier-contract.md)。
- 本文件不是 authority，不替代 proposal 或 `spec.md`。
- 任何已经达成裁决的内容，后续必须回写到后续 spec / plan / tasks / standards。
- 这里仅保留本地 carry-over、reopen evidence 和需要在后续 review 里继续追踪的残余项。
- 若某条讨论被采纳或否决，必须写明去向，再从活跃问题区移除。

## Closed Decisions

- [x] Q1 Production bundle proof landed as repo-wide `Live Evidence Safety Gate` in [../../docs/standards/harness-and-proof-assets-standard.md](../../docs/standards/harness-and-proof-assets-standard.md).
- [x] Q2 React host evidence did not become a standalone owner spec. Minimal adjunct admission law landed in [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md); host corollary landed in [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md).
- [x] Q3 Timeline/evidence pressure stays in 180 / SSoT 18 hardening and does not become a separate owner spec.

## Deferred / Non-Blocking

- [x] Q4 Local profiler owner remains deferred until its authorization, budget and redaction model is fully clear.  
  Reopen condition: a reviewer proves the profiler can stay out of runtime truth and still add enough value.

## Candidate Disposition

- [x] A1 Production bundle proof as a repo-wide standard gate. Adopted.
- [x] A2 React host evidence as a dedicated owner spec. Rejected for current wave; replaced by `SSoT 18 first` adjunct admission law.
- [x] A3 Timeline/evidence pressure as an 180 follow-up hardening spec. Rejected as separate owner split; stays in 180 / 18.
- [x] A4 Local profiler remains deferred. Adopted.

## Alternatives

- Treat all frontier items as one umbrella spec. Rejected unless review proves the coupling is stronger than the split.
- Treat each frontier item as its own spec immediately. Rejected by review; 182 standalone owner spec was stopped.

## Decision Backlinks

- Initial priority order from the chat:
  - production bundle proof
  - React host adjunct evidence admission
  - timeline/evidence pressure gate
  - local profiler owner
- Current stable proposal:
  - [docs/proposals/agent-first-cli-evidence-frontier-contract.md](../../docs/proposals/agent-first-cli-evidence-frontier-contract.md)
