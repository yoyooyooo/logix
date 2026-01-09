# Logix 包结构（SSoT）

本文是 Logix 实现的“物理目录结构”SSoT。仓库若漂移，必须修本文或修代码（二选一，不允许长期漂移）。

## 1. packages/logix-core

平台无关核心引擎：零依赖 React/DOM。

```
packages/logix-core/
├── src/
│   ├── index.ts                # Public barrel：推荐 `import * as Logix from '@logixjs/core'`
│   │
│   ├── Module.ts               # Public submodule（必须有真实实现，不能纯 re-export）
│   ├── ModuleTag.ts
│   ├── Logic.ts
│   ├── Bound.ts                # `$` interface + factories（public）
│   ├── Flow.ts
│   ├── MatchBuilder.ts
│   ├── Middleware.ts
│   ├── EffectOp.ts
│   ├── Process.ts
│   ├── Handle.ts
│   ├── Runtime.ts
│   ├── Root.ts
│   ├── Debug.ts
│   ├── Observability.ts
│   ├── ReadQuery.ts
│   ├── State.ts
│   ├── Actions.ts
│   ├── Action.ts
│   ├── StateTrait.ts
│   ├── TraitLifecycle.ts
│   ├── Resource.ts
│   ├── Platform.ts
│   ├── Kernel.ts
│   ├── Reflection.ts
│   ├── ScopeRegistry.ts
│   │
│   └── internal/               # Internal implementation（对外不可见，exports: `./internal/*: null`）
│       ├── runtime/
│       │   ├── core/           # Deep runtime core（ModuleRuntime/FlowRuntime/Lifecycle/Debug/StateTransaction/...）
│       │   └── *.ts            # 拆分文件/薄适配/re-export（供 public submodules 组装）
│       ├── state-trait/        # Trait program/graph/plan/build/converge/source/...
│       ├── trait-lifecycle/    # TraitLifecycle 内核与适配
│       ├── platform/           # Platform 实现与 BuildEnv
│       ├── reflection/         # IR/manifest/trial-run
│       ├── observability/      # evidence/runSession/trial-run 侧链路
│       └── *.ts
│
├── test/                       # 单元/集成测试（Vitest）
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

**硬边界（强约束）**

- `src/*.ts` 是 public submodules，必须包含实际实现代码（允许薄封装，但禁止纯 re-export）。
- 共享实现必须下沉到 `src/internal/**`（由 `packages/logix-core/package.json` 的 `exports` 强制阻断：`./internal/*: null`）。
- `src/internal/**` 禁止反向 import 任意 `src/*.ts` public submodule（避免环依赖）。
- Deep core 固定在 `src/internal/runtime/core/**`；浅层 internal 文件仅做 re-export 或薄适配。

## 2. packages/logix-react

React 适配层：依赖 `@logixjs/core` 与 `react`。

```
packages/logix-react/
├── src/
│   ├── index.ts
│   ├── Hooks.ts                # Public hooks 聚合导出
│   ├── RuntimeProvider.ts       # React RuntimeProvider
│   ├── ReactPlatform.ts
│   ├── ModuleScope.ts           # UI subtree scope/隔离策略（React 侧）
│   ├── Platform.ts
│   └── internal/
│       ├── hooks/               # useModule/useLocalModule/useSelector/... 的实现
│       ├── provider/            # provider 层配置/上下文/注入
│       ├── platform/            # ReactPlatformLayer 等
│       └── store/               # ModuleCache/ModuleRef/ExternalStore 等
│
├── test/
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 3. packages/logix-devtools-react

React Devtools UI：依赖 `@logixjs/core` 与 `@logixjs/react`。

```
packages/logix-devtools-react/
├── src/
│   ├── index.tsx
│   ├── DevtoolsLayer.tsx
│   ├── LogixDevtools.tsx
│   ├── StateTraitGraphView.tsx
│   ├── style.css
│   ├── style.build.css
│   ├── style.ts
│   └── internal/
│       ├── snapshot/
│       ├── state/
│       ├── theme/
│       └── ui/
│
├── test/
├── package.json
└── tsconfig.json
```

## 4. packages/logix-sandbox

Sandbox / Alignment Lab 基础设施（worker + protocol + client + compiler/kernel glue）。

```
packages/logix-sandbox/
├── src/
│   ├── index.ts
│   ├── Client.ts
│   ├── Protocol.ts
│   ├── Service.ts
│   ├── Types.ts
│   ├── Vite.ts
│   └── internal/
│       ├── compiler/
│       ├── kernel/
│       └── worker/
│
├── test/
├── package.json
└── tsconfig.json
```

## 5. packages/logix-test

测试工具包：依赖 `@logixjs/core` 与 `effect`，统一“测试即 Effect”语义。

```
packages/logix-test/
├── src/
│   ├── index.ts
│   ├── TestRuntime.ts           # runTest（TestContext + Scope）
│   ├── TestProgram.ts           # runProgram（复用 core ProgramRunner）
│   ├── Execution.ts
│   ├── Assertions.ts
│   ├── Vitest.ts                # itProgram / itProgramResult
│   └── internal/
│       ├── api/
│       ├── runtime/
│       └── utils/
│
├── test/
├── package.json
└── tsconfig.json
```

## 6. 关键实现约束

- **构建**：各包使用 `tsup` 产出（ESM + CJS + d.ts）。
- **Public/Internal 边界**：`@logixjs/core` 的 internal 实现不是公共 API（`./internal/*` 被 exports 阻断）。
- **分层规则**：public `src/*.ts` → `src/internal/**` → `src/internal/runtime/core/**` 必须保持单向依赖图。

## 7. 依赖拓扑（概念图）

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
    ReactPublic[src/*.ts (public surface)]
    ReactInternal[src/internal/**]
    ReactPublic --> Public
    ReactPublic --> ReactInternal
    ReactInternal --> Public
  end
```

## 8. 包定位（当前口径）

| 包 | 状态 | 说明 |
| :-- | :-- | :-- |
| `@logixjs/core` | Core | 纯引擎（Effect-native runtime） |
| `@logixjs/react` | Core Adapter | React 适配（Provider + hooks + strict imports-scope） |
| `@logixjs/devtools-react` | Tooling | Devtools UI + 快照/回放消费侧 |
| `@logixjs/sandbox` | Infra | Alignment Lab sandbox（compiler/protocol/worker/client） |
| `@logixjs/test` | Infra | 测试工具（ProgramRunner 语义对齐） |
| `@logixjs/form` / `@logixjs/query` | Domain | 领域包（长期目标：可完全降解到 Logix IR） |
