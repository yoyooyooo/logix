---
title: Module handle extensions
description: Extend handles only when the extension preserves the underlying module owner.
---

A module handle exposes read, changes, dispatch, action helpers, and any domain extension carried by the module/program. Extensions should make common commands clearer without becoming a second runtime API.

## Acceptable extension

A form handle adds domain commands such as `field(path).set` and `submit()`, but it still reads through the same React host route and still belongs to its program instance.

## Boundary

- Do not hide the module instance behind an unrelated controller object.
- Do not create a second selector family.
- Do not move service ownership from runtime layers into the handle.
- Keep extension commands reducible to module actions, logic, or domain primitives.
