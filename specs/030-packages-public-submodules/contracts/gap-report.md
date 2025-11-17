# Contract: Gap Report（现状 vs 目标结构差异）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-25  
**Spec**: `specs/030-packages-public-submodules/spec.md`

> 目的：把“现状漂移”显式化，给后续重构提供可交接路线图（按包×按阶段推进）。

## 分类定义（A/B/C）

- **A｜Aligned**：`src/` 根目录基本满足“概念入口（PascalCase）+ index + internal”形态，exports 不泄漏 internal，public surface 可预测。
- **B｜Public but not aligned**：对外概念大体正确，但结构/命名/exports 仍不达标（例如概念入口不是 PascalCase、概念与文件/exports key 不一致）。
- **C｜Leaking / Should be internal**：存在“实现细节变 public surface”的事实泄漏（例如通配导出暴露了 `typecheck.ts` / `*.impl.ts` / helper），或存在空壳子路径入口。

## 总览（按包）

| Package | Category | 主要差异 |
|--------|----------|----------|
| `@logix/core` | A | 少量命名/导出一致性问题（`Reflection`、`InternalContracts` 落点） |
| `@logix/react` | C | index 直接导出实现目录；`./*` 使 `shallow.ts` 等 helper 变 public |
| `@logix/devtools-react` | C | `./*` 导出 `.tsx` 导致非概念入口可被 subpath import；实现目录未下沉 |
| `@logix/sandbox` | B | 对外概念明确但文件命名/落点不符合“概念入口 PascalCase”约束；internal 屏蔽策略缺失 |
| `@logix/test` | B | 仅 `.` 单入口；缺少概念子模块入口文件与 internal 屏蔽策略 |
| `@logix/form` | C | `./*` 通配导出 + root 低层实现文件（`*.impl.ts` 等）导致严重泄漏 |
| `@logix/query` | C | `./*` 通配导出暴露 `typecheck.ts` 等；`@logix/query/react` 空壳入口 |
| `@logix/i18n` | B | 单文件聚合实现（index 既是实现又是入口）；缺少概念级子模块入口文件 |
| `@logix/domain` | B | 概念入口为 `crud.ts`（lowercase）且被 `./*` 导出；应收敛为 `Crud` 概念入口 |

## 逐包细节

### `@logix/core`（A）

**Gap Items**：

- **B**：`Reflection` 已作为概念在 `src/index.ts` 暴露，但 `package.json#exports` 未提供对等 subpath（需要裁决：补齐 `./Reflection`，或标注为 repo-only/experimental 并限制依赖面）。
- **B**：`InternalContracts` 当前从 `src/internal/**` 暴露（建议提升为 Public Submodule 入口文件，internal 仅承载实现）。

### `@logix/react`（C）

**Gap Items**：

- **C**：`src/index.ts` 直接导出 `components/**`、`hooks/**`、`platform/**` 甚至 `internal/ReactContext`，把实现目录固化为事实 API。
- **C**：`exports["./*"] = "./src/*.ts"` 导致 root helper（例如 `shallow.ts`）天然可被 subpath import（除非其被裁决为 Public Submodule）。
- **B**：`src/` 根目录存在实现目录（`components/`、`hooks/`、`platform/`），需要下沉到 `src/internal/**` 并通过概念入口（`Hooks/RuntimeProvider/Platform`）对外暴露。

### `@logix/devtools-react`（C）

**Gap Items**：

- **C**：`exports["./*"] = "./src/*.tsx"` 导致 `DevtoolsHooks.tsx` 这类非概念文件可被 `@logix/devtools-react/DevtoolsHooks` 直接依赖（需收敛为概念入口或 internal）。
- **B/C**：实现目录（`ui/**`、`state/**`、`theme.css` 等）未形成明确 internal 边界；应通过概念入口（`LogixDevtools/DevtoolsLayer/StateTraitGraphView`）对外暴露。

### `@logix/sandbox`（B）

**Gap Items**：

- **B**：对外概念（Client/Protocol/Types/Service/Vite）已存在，但 source file 命名为 lowercase（`client.ts` 等），与“概念入口 PascalCase”约束不一致。
- **B**：`package.json#exports` 未屏蔽 `./internal/*`（需要补齐 internal 边界策略）。

### `@logix/test`（B）

**Gap Items**：

- **B**：仅 `.` 单入口，尚未形成概念子模块入口文件（`TestProgram/Execution/Assertions/Vitest` 等）；同时缺少 internal 屏蔽策略（虽然单入口已阻止 subpath import，但仍建议对齐治理规则）。

### `@logix/form`（C）

**Gap Items**：

- **C**：`exports["./*"] = "./src/*.ts"` + root 低层文件（`form.impl.ts`、`types.ts`、`validators.ts` 等）导致实现细节被当作 public subpath（例如 `@logix/form/form.impl`）——必须消除。
- **B**：核心概念已通过 barrel 暴露为 `Rule/Error/Trait/Path/...` 等命名空间，但源文件命名为 lowercase（`rule.ts` 等），与“概念入口 PascalCase”不一致。

### `@logix/query`（C）

**Gap Items**：

- **C**：`exports["./*"] = "./src/*.ts"` 暴露 `typecheck.ts` 等非概念文件为事实 public subpath。
- **C**：`@logix/query/react` 子路径入口为空壳（`src/react/index.ts` 为空），按规则必须删除或实现为稳定能力后再开放。
- **B**：`TanStack` 概念以目录实现（`tanstack/**`），需要通过概念入口文件对外暴露并下沉实现目录。

### `@logix/i18n`（B）

**Gap Items**：

- **B**：当前实现集中在 `src/index.ts`（入口与实现混合），缺少清晰的 Public Submodule 入口文件（`I18n/I18nModule/Token` 等）。
- **B**：在采用 `./*` 通配导出的前提下，需要确保 `src/` 根目录长期只承载概念入口（否则会复发泄漏风险）。

### `@logix/domain`（B）

**Gap Items**：

- **B**：`Crud` 概念入口为 `crud.ts`（lowercase）且被 `./*` 导出；需要收敛为 PascalCase 概念入口文件（`Crud.ts`），并把非概念实现下沉 internal。
