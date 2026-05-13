# Implementation Plan: Runtime Inspect Evidence End State

## Goal

Make 173 an implementation-ready umbrella for the SSoT 18 contract without turning 173 into a second authority.

## Work Order

1. Tighten 174 into implementation-ready shape.
2. Tighten 175 into implementation-ready shape.
3. Tighten 176 into implementation-ready shape.
4. Re-evaluate dependent backlog rows after 174/175/176 gates are closed.
5. Promote eligible timeline projection work to 177 and leave React host evidence / local profiler owner deferred.
6. Treat post-177 coverage promotion as follow-up work under SSoT 18, not as a reason to reopen 173.
7. After 179, keep the closure state at 17 owner-backed / 0 structured-gap / 2 deferred / 2 rejected; do not promote React host evidence or local profiler owner until SSoT 18 reopen bars pass.

## Writeback Matrix

- SSoT 18: update only if a foundation spec exposes a missing owner law or proof obligation.
- SSoT 15: update route owner references when dependent specs are promoted; do not change CLI grammar unless an owner spec proves the existing grammar cannot express the query.
- 172: keep as route closure and handoff; do not add new owner work.
- specs README: keep 173/174/175/176/177/178/179 indexed under Live Runtime Evidence.
- review ledger: no further updates unless the adopted structure is reopened.

## Verification Matrix

173 itself is verified by documentation checks:

- SSoT 18 is referenced by 173/174/175/176/177/178/179.
- 173 does not define new owner facts beyond sequencing and gates.
- 174/175/176 each have closed implementation gates and proof obligations.
- timeline is promoted to 177 after its gates pass.
- post-177 summary and diagnostic/process source gaps are promoted to 178 and 179 without changing 173 closure.
- post-179 coverage has no remaining structured-gap implementation debt.
- React host evidence and local profiler owner remain deferred backlog rows.
- text sweep catches forbidden public surfaces and second-truth language.

Implementation verification belongs to 174/175/176/177.

## Reopen Rules

Reopen 173 only if:

- 174/175/176 split is directly dominated by a smaller owner model
- a foundation spec cannot obey SSoT 18 without changing the owner law
- a backlog row needs promotion before foundation gates pass
- CLI/daemon/browser/Workbench/canonical evidence starts to own Runtime facts

Do not reopen 173 just because an implementation detail changes inside one foundation spec.
