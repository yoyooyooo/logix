# Logix Implementation Scope Lock

> **Status**: LOCKED
> **Date**: 2025-11-29
> **Purpose**: Define the explicit boundary for the core engine, preventing scope creep and keeping the delivery focused.

## 1. Feature Scope (Must vs. Defer)

| Feature Category  | **Must Have (Core)**                                                                                                                         | **Deferred (Out of scope)**                                                                    |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **Core Logic**    | - Single Module Reactivity (L1)<br>- Cross-Module Collaboration (`$.use`)<br>- Async Effects & Flows<br>- External Sources (WebSocket/Timer) | - Wildcard Listeners (`items.*.field`)<br>- Dynamic Rule Injection<br>- Multi-Tenant Isolation |
| **Concurrency**   | - `run` (Sequential)<br>- `takeLatest` / `takeExhaust`                                                                                       | - Complex Backpressure Strategies<br>- Fine-grained Fiber Supervision                          |
| **Lifecycle**     | - `onInit` (Blocking)<br>- `onDestroy` (Cleanup)<br>- `onSuspend` / `onResume` (Platform)                                                    | - Hot State Migration (HMR with data preservation is "Best Effort")                            |
| **Data**          | - Schema-driven State/Action<br>- Immutable Updates                                                                                          | - JSON AST Dual Representation<br>- CRDT / Collaborative Editing                               |
| **Draft/Session** | - **None** (Use Local Modules instead)                                                                                                       | - Transactional Draft API (`start/commit`)<br>- STM (Software Transactional Memory)            |

## 2. Public API Surface (Whitelist)

Only the following APIs are considered "Public" for application developers. All others are internal implementation details.

### Application Developer (The "User")

- **Definition**: `Logix.Module.make`（ModuleDef）, `ModuleDef.implement(...)`（返回带 `.impl` 的 Module）, `Logix.Runtime.make`（基于 Root Module 的 `.impl` 构造应用级 Runtime）
- **Logic API**: `ModuleDef.logic` / `Module.logic`, `ModuleDef.live` / `Module.live`
- **Bound API (`$`)**:
  - `$.state`, `$.actions`
  - `$.onAction`, `$.onState`, `$.on`
  - `$.use` (Dependency Injection)
  - `$.lifecycle` (`onInit`, `onDestroy`, `onSuspend`, `onResume`)
- **React Integration**: `useModule`, `useLocalModule`, `useSelector`, `useDispatch`, `RuntimeProvider`

### Library/Platform Author (The "Extender")

- **Types**: `Logix.ModuleRuntime`, `Logic.Of`, `Logic.Env`
- **Interfaces**: `Platform` (Service Interface)
- **Effect**: `Layer`, `Context.Tag`, `Effect`, `Schema`

## 3. Runtime Strategy

### HMR (Hot Module Replacement)

- **Strategy**: **Safe Restart**.
- **Behavior**: When code changes, dispose the old Scope (triggering `onDestroy`) and re-initialize the new Scope.
- **State**: Attempt to preserve State if the Schema is compatible; otherwise reset to initial state. No complex migration logic in current scope.

### Code <-> Graph

- **Strategy**: **One-Way Visualization**.
- **Behavior**: The engine can emit a static graph of the Logic (based on `$.on` declarations) for debugging.
- **Constraint**: No "Visual Programming" (Graph -> Code) in current scope.

## 4. Usage Guidelines (Soft Constraints)

These are not enforced by the compiler but are critical for maintainability.

1.  **Single Writer Principle**: A state field should ideally be updated by a single logic flow or reducer pattern. Avoid scattered updates.
2.  **Cross-Module Read-Only**: Never mutate another module's state directly. Always use `dispatch` or `$.use(Other).read()`.
3.  **UI is Dumb**: UI components should not contain business logic. They should only `dispatch` intents and `read` state.
