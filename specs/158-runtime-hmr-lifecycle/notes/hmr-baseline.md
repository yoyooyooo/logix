# HMR Baseline

## Manual Verification Check

- Date: 2026-04-25
- Environment: local Vite development server, React Fast Refresh, Logix React examples.
- Failure class: active Logix runtime work can stop responding after a source edit until a full page refresh recreates the JavaScript context.

## Initial Evidence Targets

- `TaskRunnerDemoLayout`: long-running `runLatestTask` / `runExhaustTask` flows can be pending while a module update replaces the component module.
- `AppDemoLayout`: root runtime counter verifies basic provider projection after owner replacement.
- `GlobalRuntimeLayout`: ManagedRuntime owner verifies non-`Runtime.make` runtime ownership.
- `FormDemoLayout`: form runtime verifies domain package usage follows the same owner model.

## Current Expected Gap

- Runtime instances are created at module scope in many demos.
- Vite can replace the module that created the runtime without a shared owner contract.
- React remount can detach UI while runtime-owned tasks, store listeners, debug sinks, module scopes, and scheduled work remain attributable only to old closures.
- Manual refresh clears all process-local state, which masks stale resources.

## Closure Target

- A development hot update maps to `reset` when a successor runtime exists.
- A development hot update maps to `dispose` when no successor runtime exists.
- Cleanup is idempotent and emits slim evidence through the existing evidence envelope.
