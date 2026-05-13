---
title: Agent First CLI Evidence Frontier Contract
status: consumed
owner: runtime-control-plane
target-candidates:
  - docs/ssot/runtime/18-runtime-inspect-evidence-contract.md
  - docs/ssot/runtime/15-cli-agent-first-control-plane.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/standards/harness-and-proof-assets-standard.md
  - specs/181-cli-evidence-frontier/spec.md
  - specs/182-react-host-adjunct-evidence/spec.md
  - specs/183-agent-debug-closure/spec.md
last-updated: 2026-05-06
---

# Agent First CLI Evidence Frontier Contract

## Purpose

记录 180 之后剩余高价值 gap 的 `$plan-optimality-loop` 采纳结论，并说明它们已写回到哪里。

本提案已消费。181 不继续膨胀成总需求；182 不作为独立 owner spec 进入实现规划。最终采纳的是 `SSoT 18 first`：由 Runtime Inspect Evidence Contract 持有最小 React host adjunct evidence admission law，叶子 spec 只能在该 law 之后作为 subordinate implementation shell 重新打开。

2026-05-06 continuation：`183-agent-debug-closure` 是该 law 之后的 admitted subordinate successor。它承接 terminal Agent diagnosis closure，不复活 182，不新增 Runtime truth owner，不新增 `logix debug` 或 host evidence public artifact kind。

## Source Boundary

- 173 到 180 已经关闭，不能再被当成长期 backlog 容器。
- 181 是 review container，不是 authority。
- Runtime truth 仍然由 `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` 持有。
- CLI 仍然只负责命令面与 transport 面，不成为事实 owner。

## Disposition Inventory

### 1. Production bundle proof

- Disposition: adopted as repo-wide `Live Evidence Safety Gate`.
- Writeback: `docs/standards/harness-and-proof-assets-standard.md`.
- Rationale: 业务项目生产包不能带入 live/debug/dev carrier，bundle 体积与事实边界必须同时成立。

### 2. React host adjunct evidence

- Disposition: deferred admission row in SSoT 18 during this review; standalone owner spec rejected. Later admitted as 183 subordinate sidecar work.
- Writeback: `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` first, `docs/ssot/runtime/10-react-host-projection-boundary.md` for selector/render corollary, `specs/182-react-host-adjunct-evidence` as stopped record, then `specs/183-agent-debug-closure` as admitted subordinate successor.
- Rationale: selector/render/host evidence can help only as adjunct linkage. If it owns payload、export、redaction、comparison or diagnostics, it becomes a second truth source.

### 3. Timeline / evidence pressure gate

- Disposition: stays in 180 / SSoT 18 hardening; no separate owner spec.
- Writeback: `specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md` and `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`.
- Rationale: retained segment、cursor continuation、safe resume boundary 和预算降级属于 already-admitted timeline continuation law, not a new fact owner.

### 4. Local profiler owner

- Disposition: deferred during this review; later routed into 183 as bounded local profile summary, not profiler truth owner.
- Writeback: SSoT 18 and `specs/183-agent-debug-closure`.
- Rationale: profile summary can be useful only with budget、authorization、redaction and linkage law; 183 provides that closure gate while still forbidding profile samples as Runtime facts.

## Proposed End-State Contract

终局不是把四个 gap 都做成同一种 spec，而是按 authority boundary 分裂：

- production bundle proof 已落到 repo-level `Live Evidence Safety Gate`，不新增 feature spec。
- React host evidence 先落到 SSoT 18 的 minimal adjunct admission law，不新增独立 owner spec；183 是其 subordinate diagnosis closure 承接者。
- timeline / evidence pressure 回到 180 / 18 的硬化层，不新增 owner spec。
- local profiler 不升格为 Runtime owner；183 只承接 bounded local profile summary。

## Cross-Artifact Invariants

- CLI、daemon、browser adapter、Workbench、canonical evidence 不能成为 runtime truth owner。
- dev-only / live / debug 逻辑不能进入生产业务包。
- ordinary timeline reads 不能静默创建 retention lease。
- React host evidence 不能回流成 runtime-live ledger truth。
- profiler samples 不能被当作 runtime facts。

## Rejected Splits

- one spec per CLI command.
- one umbrella spec forever absorbing all frontier gaps.
- React host evidence 与 runtime-live ledger 合并为同一 truth source.
- local profiler 直接并入 runtime inspect evidence owner。
- production bundle proof 只留在聊天里，不形成可复核门禁。

## Follow-Up Artifact Candidates

- `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` 已承接 React host adjunct evidence admission law。
- `docs/ssot/runtime/10-react-host-projection-boundary.md` 已承接 selector/render host corollary。
- `specs/182-react-host-adjunct-evidence` 已停止为 not-admitted record；不得进入 plan / tasks / implementation。
- `docs/standards/harness-and-proof-assets-standard.md` 已承接 production bundle proof safety gate。
- `180-runtime-timeline-continuation-and-evidence-segment` / `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` 承接 timeline / evidence pressure hardening。
- `specs/183-agent-debug-closure` 承接后续 terminal Agent diagnosis closure，包括 React host adjunct evidence、interaction linkage 与 bounded local profile summary。

## Closed Decisions

1. React host adjunct evidence 的最小 linkage law 由 SSoT 18 持有，粒度固定为 explicit runtime coordinate / artifact ref / gap marker，不建立 host truth。
2. local profiler 继续 deferred。
3. 180 / 18 timeline pressure hardening 不拆新 spec。
4. 182 standalone owner spec rejected；若未来重开，只能作为 subordinate implementation spec import SSoT 18 law。
5. 后续已由 183 作为 subordinate successor 承接 terminal Agent diagnosis closure；该补充不改变本轮 review 对 182 standalone owner 的拒绝。

## 去向

2026-05-05 review closure 已写回：

- `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/standards/harness-and-proof-assets-standard.md`
- `specs/181-cli-evidence-frontier/spec.md`
- `specs/182-react-host-adjunct-evidence/spec.md`
- `specs/183-agent-debug-closure/spec.md`
