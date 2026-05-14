---
title: When to use Form
description: Decide whether a feature needs the Form domain package or a plain Logix Program.
---

Use `@logixjs/form` when the feature is primarily editable input state.

## Use Form when you need

- field-level values and blur/change semantics
- validation timing and submit gating
- decode-on-submit
- source-backed remote facts tied to fields
- local companion facts such as availability and candidates
- list row identity and reorder-safe operations

## Use plain Logix when you need

- non-editable business workflow state
- long-running processes
- cross-module orchestration
- domain state that is not a form
- UI state better owned directly by React

Form should not become a generic state manager. It is a domain package for editable input semantics.
