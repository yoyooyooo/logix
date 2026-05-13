---
title: Final Single-Track Cutover Standard
status: accepted
version: 1
last-updated: 2026-05-11
---

# Final Single-Track Cutover Standard

## Purpose

This standard applies when a design has reached zero-compatibility cutover. It prevents old public shapes, old docs, and compatibility code from surviving under softer wording.

## Rule

When a cutover is marked final single-track:

- delete obsolete public code or move it behind internal-only implementation names;
- delete or archive stale examples;
- replace old narrative docs with trace-only tombstones or move them to archive;
- do not preserve old names as aliases;
- do not add deprecation windows;
- do not dual-write or shadow-run unless a separate authority explicitly admits a measurement-only harness;
- do not call a helper toolkit if it hides a second owner law.

## Trace-Only Tombstone

A trace-only file that mentions obsolete API must begin with:

```markdown
> **Trace-only / superseded:** This file is historical. Current authority: `<path>`. Do not use this file to infer current public API, owner law, host route, evidence route, or performance claim.
```

The tombstone must be in the first 1600 bytes so retrieval snippets carry it.

## Mechanical Reduction Requirement

Any helper that claims to be toolkit/DX must document:

```text
helper input
-> canonical Form/Core primitive expansion
-> owner-lane mapping
-> proof that it holds no hidden state, host route, source scheduler, final truth, or compatibility shim
```

## Compatibility Ban

The following phrases require review when they appear in current docs/source:

```text
compatibility
legacy alias
deprecated route
dual path
dual-write
shadow path
watch-only residue
old shell
migration shim
```

They may appear only in a negative-space or historical-trace context.
