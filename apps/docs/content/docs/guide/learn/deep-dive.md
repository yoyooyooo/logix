---
title: Deep dive
description: Read Runtime, middleware, lifecycle, and domain programs as one assembled execution model.
---

Deep runtime reading starts from one assembled unit:

- module definitions
- logic declarations
- programs
- runtime construction
- lifecycle and middleware

## Runtime view

At runtime, one assembled slice is usually read as:

- a `Program`
- a runtime-scoped environment
- a set of installed logics and runtime-owned responsibilities

## Lifecycle view

Initialization, background work, and disposal remain runtime-owned concerns.

## Middleware view

Cross-cutting concerns such as logging, diagnostics, and effect interception remain middleware or runtime-level concerns.

## Domain programs

Domain packages such as Form and Query still enter the same runtime model:

- they return programs
- they are mounted by runtime
- they are consumed through the same host route

## Notes

- Runtime is the execution container
- Program is the assembly unit
- middleware and lifecycle are attached around execution, not around component trees

## See also

- [Runtime](../../api/core/runtime)
- [Lifecycle and watchers](./lifecycle-and-watchers)
