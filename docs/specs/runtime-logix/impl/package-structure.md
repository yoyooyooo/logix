# Logix v3.0 Package Structure

This document defines the physical file structure for the Logix v3 implementation.

## 1. packages/logix-core

The platform-agnostic core engine. Zero dependencies on React or DOM.

```
packages/logix-core/
├── src/
│   ├── index.ts                # Public API Barrel (Logix.*, Logic.*)
│   │
│   ├── api/                    # Public API Definitions
│   │   ├── Logix.ts            # Logix Namespace (Module, app, provide)
│   │   ├── Logic.ts            # Logic Namespace (Of, Env)
│   │   └── BoundApi.ts         # The `$` Interface Definition
│   │
│   ├── dsl/                    # Fluent DSL Implementation
│   │   ├── LogicBuilder.ts     # Implementation of Module.logic(...)
│   │   ├── FlowBuilder.ts      # Implementation of $.onAction(...).then(...)
│   │   └── MatchBuilder.ts     # Implementation of $.match(...)
│   │
│   ├── runtime/                # Runtime Execution Engine
│   │   ├── AppRuntime.ts       # Logix.app() -> Runtime Instance
│   │   ├── ModuleRuntime.ts    # Logix.Module() -> Runtime Instance
│   │   ├── ScopeManager.ts     # Effect Scope & Lifecycle Management
│   │   └── Registry.ts         # Global Module Registry
│   │
│   ├── platform/               # Platform Abstraction Layer
│   │   ├── Platform.ts         # Platform Interface & Tag
│   │   └── NoopPlatform.ts     # Default "No-op" implementation (Core only ships this)
│   │
│   └── internal/               # Internal Utilities (Not Exported)
│       ├── errors.ts           # Error Types
│       └── utils.ts            # Common Helpers
│
├── test/                       # Unit Tests
│   ├── dsl/
│   ├── runtime/
│   └── scenarios/              # Integration Scenarios
│
├── package.json
├── tsconfig.json
└── tsup.config.ts      # Build Configuration
```

## 2. packages/logix-react

The React adapter. Depends on `logix-core` and `react`.

```
packages/logix-react/
├── src/
│   ├── index.ts                # Public Exports (hooks, provider)
│   │
│   ├── components/
│   │   └── RuntimeProvider.tsx # <RuntimeProvider value={app}>
│   │
│   ├── hooks/
│   │   ├── useModule.ts        # Main hook: const { state, actions } = useModule(Tag)
│   │   ├── useLocalModule.ts   # Local hook: useLocalModule(() => Logix.Module(...))
│   │   ├── useSelector.ts      # Fine-grained selection
│   │   └── useDispatch.ts      # Action dispatch only
│   │
│   ├── platform/
│   │   └── ReactPlatform.ts    # React Implementation of Platform Interface
│   │                           # (Implements onSuspend, onResume via React APIs)
│   │
│   └── internal/
│       └── ReactContext.ts     # React.createContext() definition
│
├── test/
│   └── hooks/                  # React Hook Testing Library tests
│
├── package.json
├── tsconfig.json
└── tsup.config.ts      # Build Configuration
```

## 3. packages/logix-test

The testing utilities package. Depends on `logix-core` and `effect`.

```
packages/logix-test/
├── src/
│   ├── index.ts                # Public API
│   ├── runtime/                # TestRuntime
│   ├── api/                    # renderLogic, Scenario
│   └── utils/                  # Matchers
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 4. Key Implementation Details

- **Build Toolchain**: Use `tsup` for bundling.
  - Output formats: `esm` (default), `cjs` (for legacy compat).
  - Dts: Enabled (`dts: true`) to generate type definitions.
  - Clean: Enabled (`clean: true`).
- **Circular Dependencies**:
  - **Rule**: `api/` defines types and thin factory interfaces. It should NOT import from `dsl/` or `runtime/` implementations.
  - `dsl/` and `runtime/` depend on `api/`.
  - `dsl/` and `runtime/` may interact, but `api/` remains the clean, dependency-free contract.
- **Barrel Files**: Each directory (`api`, `dsl`, `runtime`) should have an `index.ts` to control visibility.
- **Effect Integration**: All `runtime/` code is heavily Effect-native. `dsl/` code constructs Effect descriptions but doesn't run them.

## 5. Dependency Graph

```mermaid
graph TD
    subgraph "packages/logix-core"
        API[api/ (Types & Interfaces)]
        DSL[dsl/ (Builders)]
        Runtime[runtime/ (Execution)]
        Platform[platform/ (Interface)]

        DSL --> API
        Runtime --> API
        Runtime --> Platform
        DSL -.-> Runtime
    end

    subgraph "packages/logix-react"
        ReactHooks[hooks/]
        ReactPlatform[platform/ (React Impl)]

        ReactHooks --> API
        ReactPlatform --> Platform
        ReactHooks --> Runtime
    end
```

## 6. Package Scope (v3.0 vs Future)

| Package | Status | Description |
| :--- | :--- | :--- |
| `logix-core` | **v3.0** | The pure logic engine. Includes `NoopPlatform` only. |
| `logix-react` | **v3.0** | React adapter. Includes `ReactPlatform`. |
| `logix-test` | **Planned** | Testing utilities for Unit/Integration tests. |
| `logix-node` | *Future* | Node.js adapter (CLI/Server). |
| `logix-devtools` | *Future* | Chrome Extension bridge & UI. |
