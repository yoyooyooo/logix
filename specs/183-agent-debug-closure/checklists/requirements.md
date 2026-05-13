# Requirements Readiness Checklist: Agent Debug Closure

**Purpose**: Validate that the 183 spec pack is implementation-ready without leaking a second Runtime truth source or public debug surface.
**Created**: 2026-05-06
**Feature**: [spec.md](../spec.md)

## Authority And Scope Quality

- [x] Does `spec.md` define 183 as terminal Agent live diagnosis closure without reopening 171 to 180 or reviving 182? [Completeness, Spec §Current Role]
- [x] Does `spec.md` keep React host evidence adjunct-only and profile summary local-only? [Consistency, Spec §Current Role]
- [x] Does `plan.md` import SSoT 18, SSoT 10, SSoT 15 and the harness standard as authorities instead of redefining them? [Consistency, Plan §Stage Role]
- [x] Does `implementation-details/diagnosis-evidence-contract.md` stay narrow and avoid becoming a second SSoT? [Clarity, Contract §Public Output Contract]

## Public Surface And Truth Boundaries

- [x] Are forbidden shapes explicitly rejected: `logix debug`, public `HostEvidence`, public `HostAdjunctEvidence`, second evidence envelope and Runtime truth ownership by carriers? [Completeness, Spec §Must Cut]
- [x] Does the plan require existing `LiveInspectArtifact`, `LiveProfileSummary`, `CanonicalEvidencePackageRef`, `EvidenceGap` or repo-internal harness routes only? [Clarity, Plan §Summary]
- [x] Are CLI, daemon, browser adapter, Workbench, React host, canonical evidence and profiler prevented from owning Runtime truth? [Consistency, Spec §Closure Contract]
- [x] Does 182 remain Stopped and not an implementation authority? [Consistency, 182 §Current Role]

## Proof And Measurement Quality

- [x] Does `plan.md` define disabled-overhead, transaction-window, bounded-buffer, production-bundle and multi-attachment witnesses? [Completeness, Plan §Perf Evidence Plan]
- [x] Does `quickstart.md` provide intended Agent flows and focused proof commands? [Completeness, Quickstart §Focused Proof Commands]
- [x] Does `tasks.md` map each user story to independent tests and implementation outcomes with file paths? [Measurability, Tasks §User Stories]
- [x] Does the final text sweep catch forbidden public-surface drift and unresolved checklist markers? [Measurability, Plan §Verification Matrix]

## Implementation Readiness

- [x] Are `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md` and the narrow implementation-details contract present? [Completeness]
- [x] Does `tasks.md` use outcome-level tasks suitable for a high-intelligence Agent rather than pseudo-code steps? [Clarity, Tasks §Task List]
- [x] Are writeback targets explicit for SSoT 18, SSoT 10, SSoT 15, harness standard, runtime inspect coverage harness and specs index? [Traceability, Plan §Phase 7]
- [x] Are deferred future surfaces such as SourceMap/AST index, QA recorder, replay, deep profiler, cloud mutation and SQLite out of scope? [Coverage, Plan §Non-Goals]

## Notes

- Ready for implementation planning handoff after the mandatory sweeps pass.
- This checklist tests requirements quality and planning readiness. It does not claim implementation is complete.
