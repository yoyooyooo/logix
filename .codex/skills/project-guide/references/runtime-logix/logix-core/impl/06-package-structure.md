# Logix Package Structure

This document is the SSoT for the physical file structure of the Logix
implementation. If the repo drifts, fix this document or the code immediately.

## 1. packages/logix-core

The platform-agnostic core engine. Zero dependencies on React or DOM.

```
packages/logix-core/
├── src/
│   ├── index.ts                # Public API barrel (Logix.*, etc.)
│   │
│   ├── Module.ts               # Public submodule (MUST contain real implementation)
│   ├── Logic.ts
│   ├── Bound.ts                # The `$` interface + factories (public)
│   ├── Flow.ts
│   ├── MatchBuilder.ts
│   ├── Runtime.ts
│   ├── Debug.ts
│   ├── Platform.ts
│   ├── Resource.ts
│   ├── state-trait.ts
│   ├── trait-lifecycle.ts
│   ├── effectop.ts
│   ├── env.ts
│   ├── Link.ts
│   ├── Actions.ts
│   │
│   ├── middleware/
│   │   ├── index.ts
│   │   └── query.ts
│   │
│   └── internal/               # Internal implementation (NOT exported)
│       ├── runtime/
│       │   ├── core/           # Deep runtime core (module/flow/lifecycle/debug/txn/...)
│       │   └── *.ts            # Shallow adapters / re-exports for public submodules
│       ├── state-trait/        # Trait program/graph/plan/build/converge/source/...
│       ├── platform/           # Platform implementations
│       ├── debug/              # Debug-only internal helpers
│       └── *.ts
│
├── test/                       # Unit/integration tests (Vitest)
├── package.json
├── tsconfig.json
└── tsup.config.ts              # Build Configuration
```

**Hard boundaries**

- `src/*.ts` are the public submodules and MUST contain actual implementation
  code (thin wrappers are fine, pure re-export is not).
- Shared implementation MUST live in `src/internal/**` (enforced by package
  exports: `./internal/*: null`).
- `src/internal/**` MUST NOT import from any `src/*.ts` public submodule.
- Deep core MUST live in `src/internal/runtime/core/**`; shallow internal files
  should be re-exports or thin adapters only.

## 2. packages/logix-react

The React adapter. Depends on `@logix/core` and `react`.

```
packages/logix-react/
├── src/
│   ├── index.ts
│   ├── ReactPlatform.ts
│   │
│   ├── components/
│   │   └── RuntimeProvider.tsx
│   │
│   ├── hooks/
│   │   ├── useModule.ts
│   │   ├── useLocalModule.ts
│   │   ├── useImportedModule.ts
│   │   ├── useSelector.ts
│   │   └── useDispatch.ts
│   │
│   ├── platform/
│   │   ├── index.ts
│   │   └── ReactPlatformLayer.ts
│   │
│   └── internal/
│       ├── ReactContext.ts
│       ├── ModuleCache.ts
│       ├── ModuleRef.ts
│       ├── resolveImportedModuleRef.ts
│       ├── ModuleRuntimeExternalStore.ts
│       ├── useModuleRuntime.ts
│       └── *.ts
│
├── test/
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 3. packages/logix-devtools-react

The React Devtools UI for Logix. Depends on `@logix/core` and `@logix/react`.

```
packages/logix-devtools-react/
├── src/
│   ├── index.tsx
│   ├── snapshot.ts
│   ├── state.ts
│   ├── DevtoolsHooks.tsx
│   ├── state/                  # compute/model/storage/runtime helpers
│   └── ui/                     # Devtools UI components
│
├── test/
├── package.json
└── tsconfig.json
```

## 4. packages/logix-sandbox

Sandbox / Alignment Lab infrastructure (compiler + worker protocol + client).

```
packages/logix-sandbox/
├── src/
│   ├── index.ts
│   ├── protocol.ts
│   ├── types.ts
│   ├── compiler.ts
│   ├── client.ts
│   ├── service.ts
│   └── worker/sandbox.worker.ts
│
├── test/
├── package.json
└── tsconfig.json
```

## 5. packages/logix-test

The testing utilities package. Depends on `@logix/core` and `effect`.

```
packages/logix-test/
├── src/
│   ├── index.ts
│   ├── runtime/
│   ├── api/
│   └── utils/
│
├── test/
├── package.json
└── tsconfig.json
```

## 6. Key Implementation Details

- **Build Toolchain**: Use `tsup` for bundling (ESM + CJS + d.ts).
- **Public/Internal boundary**: `@logix/core` internal implementation is not a
  public API (`./internal/*` is blocked by package exports).
- **Layering rule**: public `src/*.ts` → `src/internal/**` → `src/internal/runtime/core/**`
  should be a one-way dependency graph.

## 7. Dependency Graph (conceptual)

```mermaid
graph TD
    subgraph "packages/logix-core"
        Public[src/*.ts (public submodules)]
        Internal[src/internal/**]
        Core[src/internal/runtime/core/**]

        Public --> Internal
        Internal --> Core
    end

    subgraph "packages/logix-react"
        ReactPublic[src/components + src/hooks]
        ReactInternal[src/internal/**]

        ReactPublic --> Public
        ReactPublic --> ReactInternal
        ReactInternal --> Public
    end
```

## 8. Package Scope

| Package                        | Status           | Description                                                  |
| :----------------------------- | :--------------- | :----------------------------------------------------------- |
| `@logix/core`                  | **Core**         | The pure logic engine (Effect-native runtime).               |
| `@logix/react`                 | **Core Adapter** | React integration (provider + hooks + strict imports-scope). |
| `@logix/devtools-react`        | **Tooling**      | Devtools UI + snapshots + time-travel.                       |
| `@logix/sandbox`               | **Infra**        | Alignment Lab sandbox (compiler + protocol + worker).        |
| `@logix/test`                  | **Infra**        | Test kit utilities for Effect/runtime-heavy tests.           |
| `@logix/form` / `@logix/query` | **Domain**       | Domain packages that must degrade to Logix IR over time.     |
