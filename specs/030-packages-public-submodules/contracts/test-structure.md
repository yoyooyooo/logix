# Contract: Test Structure（测试目录与源码对齐）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-25  
**Spec**: `specs/030-packages-public-submodules/spec.md`

> 目标：让测试目录成为“概念地图”的镜像，和 Public Submodules / internal 分区一起收敛，减少并行冲突并提升可维护性。

## 1) 对标 effect：他们怎么组织 test

基线仓库：`/Users/yoyo/Documents/code/community/effect`

- 包级测试统一放在包根 `test/`（例如 `packages/effect/test`、`packages/platform/test`）。
- 命名以“模块/概念”为中心，而非镜像 `src/` 的物理路径：
  - 小模块直接在 `test/<Module>.test.ts`（例如 `Array.test.ts`）。
  - 大模块用子目录分组（例如 `test/Effect/*`、`test/Stream/*`），目录名就是概念名。
- `tsconfig.test.json` 作为包级测试类型检查入口（多数包都有）。

## 2) 本仓裁决（统一规则）

### 2.1 测试根目录

- 每个包的测试统一放在 `packages/<pkg>/test/**`（不在 `src/` 下放 `*.test.ts`）。
- `test/` 目录结构必须与本仓的“概念裁决”对齐：
  - Public Submodules（`src/<Concept>.ts(x)`）是一级分组维度；
  - internal 分区（`src/internal/<concept>/**`）是二级分组维度。

### 2.2 目录与命名（与源码对齐）

- Public Submodule 的测试优先采用 effect 风格：
  - `test/<Concept>.test.ts`（概念较小、文件不多）
  - 或 `test/<Concept>/*.test.ts`（概念较大，需要拆分）
- internal 测试（确有必要覆盖内部行为时）放在：
  - `test/internal/<concept>/**`
  - 且只允许在“同包内”用相对路径引用 internal；禁止跨包通过 `@logixjs/*/internal/*` 依赖内部实现。
- 共享测试工具/断言放在 `test/utils/**`（对标 effect 的 `test/utils`）。
- fixtures 统一放在 `test/fixtures/**`（允许存在 `test/typecheck/**` 作为编译期回归）。

### 2.3 Vitest Browser Mode（必须保留的路径约定）

对启用了 Vitest `browser` project 的包（当前：`packages/logix-react`、`packages/logix-sandbox`）：

- `test/browser/**` 目录名是 **运行配置约定的一部分**（`vitest.config.ts` 的 browser project 只 include 该目录），迁移测试结构时必须保留该路径（不要改名为 `test/Browser`）。
- `test/browser/__screenshots__/**`、`test/browser/msw/**` 等资源目录同样视为 browser 项目的组成部分，迁移时保持语义分组不变。

### 2.4 目标：测试也要“可抽包”

当某个概念未来可能从子模块提升为独立子包时（见 `contracts/promotion-to-package.md`）：

- 该概念的测试应该尽量自洽地聚拢在 `test/<Concept>/**`（或 `test/<Concept>.test.ts`），避免散落在全包各处；
- 避免测试依赖其他概念的 internal（只通过 public submodule API/Tag/Layer 交互），减少剥离时的撕裂成本。

## 3) 各包 Target Test Topology（对齐 030 的概念裁决）

> 说明：这是目标目录蓝图，允许逐步迁移；迁移过程中以 verify gate + 质量门兜底，避免“边改边漂移”。

### `@logixjs/core`

- `test/Module/**`、`test/Runtime/**`、`test/Logic/**`、`test/Flow/**`
- `test/StateTrait/**`、`test/TraitLifecycle/**`、`test/Resource/**`
- `test/EffectOp/**`、`test/Middleware/**`、`test/Bound/**`、`test/Link/**`
- `test/Debug/**`、`test/Observability/**`、`test/Reflection/**`
- `test/internal/runtime/**`、`test/internal/state-trait/**`（仅当必须测试 internal 语义时）
- `test/fixtures/**`

### `@logixjs/form`

- `test/Form/**`、`test/Rule/**`、`test/Trait/**`、`test/Path/**`
- `test/SchemaPathMapping.test.ts`、`test/SchemaErrorMapping.test.ts`（或分到对应概念目录）
- `test/internal/**`（例如 rowid/path 等内部实现）
- `test/fixtures/**`、`test/typecheck/**`

### `@logixjs/query`

- `test/Query/**`、`test/Engine/**`、`test/Traits/**`、`test/Middleware/**`、`test/TanStack/**`
- `test/internal/**`（engine/tanstack/logics 等分区）

### `@logixjs/react`

- `test/RuntimeProvider/**`、`test/Hooks/**`、`test/Platform/**`、`test/ReactPlatform/**`
- `test/integration/**`、`test/browser/**`、`test/perf/**`（保持现有分组语义，但目录命名与概念入口对齐）
- `test/internal/**`（store/cache/bindings 等内部实现）

### `@logixjs/devtools-react`

- `test/LogixDevtools/**`、`test/DevtoolsLayer/**`、`test/StateTraitGraphView/**`
- `test/internal/**`（ui/state/snapshot/theme 等分区）

### `@logixjs/sandbox`

- `test/Client/**`、`test/Service/**`、`test/Protocol/**`、`test/Types/**`
- `test/browser/**`（Worker/协议/资源挂载相关）
- `test/internal/**`（worker/compiler/kernel 等）

### `@logixjs/test`

- `test/TestProgram/**`、`test/TestRuntime/**`、`test/Execution/**`、`test/Assertions/**`、`test/Vitest/**`
- `test/internal/**`（api/runtime/utils 等）

### `@logixjs/i18n`

- `test/I18n/**`、`test/I18nModule/**`、`test/Token/**`
- `test/internal/**`（driver/token/module 等）

### `@logixjs/domain`

- `test/Crud/**`
- `test/internal/**`（crud 内核实现）
