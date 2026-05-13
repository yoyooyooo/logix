# Final Form/Kernel Single-Track Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every remaining Form/kernel compatibility residue and close docs, public API, owner-boundary, verification, and performance gates under one single-track forward contract.

**Architecture:** The cutover keeps the accepted Form API shape and hardens it with authority-map docs, residue scanners, public-surface guards, owner-collision tests, required witness scenarios, unified fallback reasons, and performance evidence gates. No compatibility branch is allowed; implementation waves may be separated, but semantics must remain single-track.

**Tech Stack:** TypeScript 5.x, Effect, Vitest, Playwright/browser perf where existing, Node.js scripts, existing Logix package test runners, existing perf-evidence scripts.

---

## File Structure

### Create

- `docs/ssot/form/14-final-single-track-cutover-gate.md` — final release-facing gate and authority map.
- `docs/standards/final-single-track-cutover.md` — cross-topic rule for deleting compatibility and tombstoning old narrative.
- `docs/standards/final-cutover-performance-evidence.md` — evidence interpretation rules for the red/yellow hot paths.
- `docs/next/form-kernel-final-single-track-cutover.md` — implementation cursor and status register.
- `specs/229-form-kernel-final-single-track-cutover/**` — this final rollup spec, plan, tasks, handoff, checklist.
- `scripts/final-cutover/scan-single-track-residue.mjs` — docs/source residue scanner.
- `scripts/final-cutover/collect-final-cutover-report.mjs` — final report collector.
- `packages/*/test/**/FinalSingleTrack*.test.ts` — guard and owner-collision sentinels.
- `packages/logix-perf-evidence/scripts/ci.final-cutover-gate.mjs` — focused perf gate interpreter.

### Modify

- `docs/ssot/form/README.md` — point first to `13` and `14`.
- `docs/ssot/form/13-exact-surface-contract.md` — add final implementation gate and no-compat wording.
- `docs/ssot/form/05-public-api-families.md` — clarify toolkit/DX secondary layer.
- `docs/ssot/runtime/06-form-field-kernel-boundary.md` — align source/companion/list/dirty fallback owner wording.
- `docs/ssot/runtime/09-verification-control-plane.md` — separate check/trial from non-default compare productization.
- `docs/ssot/runtime/10-react-host-projection-boundary.md` — pin Form read to core useSelector.
- `docs/standards/docs-governance.md` — add trace-only/tombstone status requirements.
- `docs/proposals/**`, `docs/next/**`, `specs/**`, `examples/**` — delete/archive/replace stale Form/API narrative where scanner flags it.
- `packages/logix-form/**`, `packages/logix-react/**`, `packages/logix-core/**`, `packages/logix-query/**` — remove compatibility-shaped exports/source and implement missing sentinels/witnesses.
- `packages/logix-perf-evidence/**` — add or wire focused gate scripts for final hot paths.

## Chunk 1: Authority and residue scanner

### Task 1: Apply authority docs and scanner

- [ ] Apply `0001` and `0002` patches.
- [ ] Apply `0003` scanner patch.
- [ ] Run:

```bash
node scripts/final-cutover/scan-single-track-residue.mjs --profile all --format table
```

Expected before cleanup: may fail with residue list.

- [ ] Replace or archive every flagged stale narrative. Do not add compatibility disclaimers at the bottom; current-status tombstone must be first or the old body must be removed.
- [ ] Re-run scanner until it passes.

### Task 2: Current authority docs linkback

- [ ] Ensure `docs/ssot/form/README.md` links `13` and `14` before other Form pages.
- [ ] Ensure every final docs page states that packed XML/Repomix snapshots are read-only context and not edit targets.
- [ ] Ensure `docs/standards/docs-governance.md` includes status vocabulary: `authority`, `accepted`, `implemented`, `consumed`, `trace-only`, `superseded`, `archived`, `deferred-authority-intake`, `blocked`.

## Chunk 2: Public surface and owner collision

### Task 3: Form public surface removal

- [ ] Run Form root allowlist tests.
- [ ] Delete any live public source file or package export for forbidden nouns.
- [ ] Keep path/schema helpers only under `packages/logix-form/src/internal/**`.
- [ ] Run:

```bash
pnpm -C packages/logix-form test -- --run FormRootBarrel FormPackageExports FormSingleTrackResidue
```

Expected: pass after cleanup.

### Task 4: Source boundary witnesses

- [ ] Add or verify tests for country->province, username/invite uniqueness, row-local sku quote, hard Query invalidate/refetch/prefetch/pagination/cross-scope route.
- [ ] Add negative tests for `field.options`, `source.refresh`, direct rule fetch, and React useEffect remote sync.
- [ ] Confirm source failure/stale lifecycle produces receipts/reasons and never creates a second final truth tree.

### Task 5: Companion boundary witnesses

- [ ] Add or verify tests rejecting Promise, Effect, fetch, remote IO, final-truth writes, writeback side effects.
- [ ] Add local soft fact tests for field-local companion and row companion continuity.
- [ ] Confirm no list/root companion baseline appears unless a separate authority intake reopens it.

### Task 6: Final truth and reason funnel

- [ ] Add contributor matrix tests for schema, rule, list, root, sourceImpact, manual errors.
- [ ] Verify one error carrier and reason backlink model.
- [ ] Reject companion errors, source verdict truth, and second issue tree.

## Chunk 3: Row/list, selector, and kernel hot path

### Task 7: Row/list continuity and listScopeCheck

- [ ] Verify reorder/swap/move/replace/remove/nested-list matrix.
- [ ] Add stale row id retire sentinel.
- [ ] Add focused `form.listScopeCheck` perf and allocation evidence for diagnostics off/light/full.
- [ ] No public row token.

### Task 8: Host selector and no-tearing

- [ ] Verify `@logixjs/react` root/Hooks expose only core host route.
- [ ] Add render fanout and no-tearing sentinels for Form descriptors.
- [ ] Reject Form-owned hook family in source/docs/examples.

### Task 9: DirtyPlan and fallback protocol

- [ ] Ensure dirtyPlan rootKeyHash/rootCount contributes to plan key.
- [ ] Ensure legacy dirty input cannot override dirtyPlan.
- [ ] Ensure exact sparse dirty does not execute unrelated converge steps.
- [ ] Ensure fallback full topo requires shared reason code and evidence.
- [ ] Ensure diagnostics=off has zero trace/debug payload allocation on hot path.

## Chunk 4: Verification, toolkit, and performance gates

### Task 10: Verification and compare wording

- [ ] Update docs/tests so `Runtime.check` and `Runtime.trial` are current verification routes.
- [ ] Keep `Runtime.compare` as family member/substrate but not default Form root compare productization.
- [ ] Reject Form scenario authoring API and second report shell.

### Task 11: Toolkit mechanical-reduction intake

- [ ] Add `toolkit` helper intake checklist and tests if any Form helper exists.
- [ ] Require expansion proof to canonical primitives.
- [ ] Reject hidden state, hidden host route, source scheduling bypass, final truth owner, or compatibility shim.

### Task 12: Final performance gate

- [ ] Run focused and broad perf evidence.
- [ ] Block release claims if any required hot path has unexplained budgetExceeded, incomparable artifact, missing suite, stability warning, timeout, or migrated cost.
- [ ] Produce final report with allowed claims only.

## Final verification command set

Use exact package scripts available in the real repo. At minimum:

```bash
node scripts/final-cutover/scan-single-track-residue.mjs --profile all --format table
pnpm -C packages/logix-form test -- --run Form
pnpm -C packages/logix-react test -- --run useSelector ReactSelector RuntimeStore
pnpm -C packages/logix-core test -- --run KernelFallback DirtyPlan RuntimeStore VerificationControlPlane
pnpm -C packages/logix-query test -- --run Query
pnpm -C packages/logix-perf-evidence test -- --run final-cutover
node scripts/final-cutover/collect-final-cutover-report.mjs --out docs/next/form-kernel-final-single-track-cutover-report.md
```

If a command is unavailable in the local repo, record it as unavailable and replace it only with a scoped equivalent. Do not weaken evidence claims.
